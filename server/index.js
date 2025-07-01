import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { spawn } from 'node-pty';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const homeDir = os.homedir();

// Enhanced multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const projectPath = req.body.projectPath || process.cwd();
    const uploadsDir = path.join(projectPath, 'uploads');

    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }

    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename but make it safe
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Support all common file types that Gemini CLI can handle
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/markdown', 'text/csv',
      'text/javascript', 'text/typescript', 'application/javascript',
      'text/html', 'text/css', 'application/json',
      'text/python', 'text/x-python-script',
      'application/x-yaml', 'text/yaml'
    ];

    const allowedExtensions = [
      '.txt', '.md', '.js', '.ts', '.py', '.html', '.css', '.json',
      '.yml', '.yaml', '.xml', '.csv', '.log', '.sh', '.bat', '.ps1',
      '.cpp', '.c', '.h', '.hpp', '.java', '.go', '.rs', '.php',
      '.rb', '.swift', '.kt', '.scala', '.r', '.sql', '.dockerfile'
    ];

    const hasAllowedExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (allowedTypes.includes(file.mimetype) || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Supported: images, PDFs, text files, code files.`));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage
const ptySessions = new Map();
const chatHistory = new Map();
const uploadedFiles = new Map();
const projectConfigs = new Map();

// Enhanced MCP configuration translator
function translateMcpConfig(standardConfig) {
  const geminiConfig = {};

  for (const [serverName, config] of Object.entries(standardConfig)) {
    // Handle different server patterns
    if (config.command === 'uv' && config.args) {
      // UV-based Python servers
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args,
        env: config.env || {},
        cwd: config.cwd || undefined,
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    } else if (config.command === 'uvx' && config.args) {
      // UVX-based servers
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args,
        env: config.env || {},
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    } else if (config.command && config.command.startsWith('/')) {
      // Absolute path executables
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd || undefined,
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    } else if (config.command === 'docker') {
      // Docker-based servers
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    } else if (config.command === 'node' || config.command === 'python' || config.command === 'python3') {
      // Direct interpreter commands
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd || undefined,
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    } else {
      // Direct translation for already compatible configs
      geminiConfig[serverName] = {
        ...config,
        timeout: config.timeout || 600000,
        trust: config.trust || false
      };
    }
  }

  return geminiConfig;
}

// Enhanced project discovery
async function discoverProjects() {
  const projects = [];
  // Allow search directories to be set via environment variable or config file
  // Fallback to sensible defaults if not set
  let searchDirs = [];

  if (process.env.GEMINI_PROJECT_PATHS) {
    // Comma-separated list of directories
    searchDirs = process.env.GEMINI_PROJECT_PATHS.split(',').map(dir => dir.trim()).filter(Boolean);
  } else {
    // Try to load from config file in home directory
    try {
      const configPath = path.join(homeDir, '.gemini_project_paths.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const configDirs = JSON.parse(configContent);
      if (Array.isArray(configDirs)) {
        searchDirs = configDirs;
      }
    } catch (err) {
      // Config file does not exist or is invalid, fallback to defaults
      searchDirs = [
        path.join(homeDir, 'Repositories'),
        path.join(homeDir, 'Projects'),
        path.join(homeDir, 'Development'),
        path.join(homeDir, 'Code')
      ];
    }
  }

  for (const searchDir of searchDirs) {
    try {
      await fs.access(searchDir);
      const items = await fs.readdir(searchDir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const fullPath = path.join(searchDir, item.name);

          // Check for project indicators
          const [hasGit, hasPackageJson, hasGeminiConfig, hasPyProject, hasCargoToml] = await Promise.all([
            fs.access(path.join(fullPath, '.git')).then(() => true).catch(() => false),
            fs.access(path.join(fullPath, 'package.json')).then(() => true).catch(() => false),
            fs.access(path.join(fullPath, '.gemini')).then(() => true).catch(() => false),
            fs.access(path.join(fullPath, 'pyproject.toml')).then(() => true).catch(() => false),
            fs.access(path.join(fullPath, 'Cargo.toml')).then(() => true).catch(() => false)
          ]);

          if (hasGit || hasPackageJson || hasGeminiConfig || hasPyProject || hasCargoToml) {
            projects.push({
              name: item.name,
              path: fullPath,
              hasGeminiConfig,
              type: hasPyProject ? 'Python' : hasPackageJson ? 'Node.js' : hasCargoToml ? 'Rust' : 'Git'
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or no permission
      console.warn(`Cannot access directory ${searchDir}`);
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

// API Routes

// Read file content
app.get('/api/files/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(404).json({ error: 'File not found or cannot be read' });
  }
});

// Write file content
app.post('/api/files/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced file upload with @ command integration
app.post('/api/files/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { projectPath } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFilesInfo = files.map(file => {
      const relativePath = path.relative(projectPath || process.cwd(), file.path);
      return {
        id: Date.now() + Math.random(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        relativePath: relativePath,
        atCommand: `@${relativePath}`,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date().toISOString()
      };
    });

    // Store file info for the project
    const projectKey = projectPath || 'default';
    if (!uploadedFiles.has(projectKey)) {
      uploadedFiles.set(projectKey, []);
    }
    uploadedFiles.get(projectKey).push(...uploadedFilesInfo);

    res.json({
      success: true,
      files: uploadedFilesInfo,
      message: `Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get uploaded files for a project
app.get('/api/files/uploads', async (req, res) => {
  try {
    const { projectPath } = req.query;
    const projectKey = projectPath || 'default';
    const files = uploadedFiles.get(projectKey) || [];

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced file listing with gitignore support
app.get('/api/files/list', async (req, res) => {
  try {
    const { path: dirPath = homeDir } = req.query;
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    const files = [];
    const directories = [];

    // Common ignore patterns
    const ignorePatterns = [
      /^\./,  // Hidden files
      /^node_modules$/,
      /^__pycache__$/,
      /^\.git$/,
      /^dist$/,
      /^build$/,
      /^target$/,
      /^venv$/,
      /^\.env$/,
      /^\.vscode$/,
      /^\.idea$/
    ];

    for (const item of items) {
      // Skip ignored items
      if (ignorePatterns.some(pattern => pattern.test(item.name))) {
        continue;
      }

      if (item.isDirectory()) {
        directories.push(item.name);
      } else if (item.isFile()) {
        files.push(item.name);
      }
    }

    // Sort alphabetically
    files.sort();
    directories.sort();

    res.json({ files, directories, path: dirPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await discoverProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced configuration management
app.post('/api/config/save', async (req, res) => {
  try {
    const { projectPath, settings, envVars } = req.body;

    // Create .gemini directory
    const geminiDir = path.join(projectPath, '.gemini');
    await fs.mkdir(geminiDir, { recursive: true });

    // Save settings.json with pretty formatting
    const settingsPath = path.join(geminiDir, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    // Save .env file with comments
    if (envVars && Object.keys(envVars).length > 0) {
      const envPath = path.join(projectPath, '.env');
      const envContent = [
        '# Gemini CLI Environment Configuration',
        '# Generated by Gemini CLI Workstation',
        '',
        ...Object.entries(envVars)
          .filter(([key, value]) => value && value.trim())
          .map(([key, value]) => `${key}="${value}"`)
      ].join('\n');

      if (envContent.split('\n').length > 3) {
        await fs.writeFile(envPath, envContent);
      }
    }

    // Cache the config
    projectConfigs.set(projectPath, { settings, envVars });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load configuration from a project
app.get('/api/config/load', async (req, res) => {
  try {
    const { projectPath } = req.query;

    // Check cache first
    if (projectConfigs.has(projectPath)) {
      return res.json(projectConfigs.get(projectPath));
    }

    let settings = null;
    let envVars = {};

    // Try to load settings.json
    try {
      const settingsPath = path.join(projectPath, '.gemini', 'settings.json');
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      settings = JSON.parse(settingsContent);
    } catch (error) {
      // Settings file doesn't exist
    }

    // Try to load .env file
    try {
      const envPath = path.join(projectPath, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');

      // Parse .env file with better handling
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            envVars[key] = value;
          }
        }
      });
    } catch (error) {
      // .env file doesn't exist
    }

    const config = { settings, envVars };
    projectConfigs.set(projectPath, config);

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MCP configuration translation
app.post('/api/mcp/translate', (req, res) => {
  try {
    const { standardConfig } = req.body;
    const geminiConfig = translateMcpConfig(standardConfig);
    res.json({ geminiConfig });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced chat history management
app.get('/api/chat/history', (req, res) => {
  const { projectPath } = req.query;
  const history = chatHistory.get(projectPath) || [];

  // Return last 50 messages for performance
  const recentHistory = history.slice(-50);
  res.json({ history: recentHistory });
});

app.post('/api/chat/message', (req, res) => {
  const { projectPath, message } = req.body;

  if (!chatHistory.has(projectPath)) {
    chatHistory.set(projectPath, []);
  }

  const history = chatHistory.get(projectPath);
  history.push({
    ...message,
    id: Date.now().toString(),
    timestamp: message.timestamp || new Date().toISOString()
  });

  // Keep only last 200 messages per project
  if (history.length > 200) {
    history.splice(0, history.length - 200);
  }

  res.json({ success: true });
});

// Clear chat history
app.delete('/api/chat/history', (req, res) => {
  const { projectPath } = req.query;
  chatHistory.delete(projectPath);
  res.json({ success: true });
});

// Enhanced Gemini CLI execution
app.post('/api/cli/execute', async (req, res) => {
  try {
    const { projectPath, command, settings, envVars } = req.body;

    // Save current configuration
    if (settings) {
      const geminiDir = path.join(projectPath, '.gemini');
      await fs.mkdir(geminiDir, { recursive: true });
      const settingsPath = path.join(geminiDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    }

    // Set up environment with enhanced variables
    const env = {
      ...process.env,
      ...envVars,
      // Ensure proper terminal support
      FORCE_COLOR: '1',
      TERM: 'xterm-256color',
      // Set working directory
      PWD: projectPath
    };

    let output = '';
    let hasError = false;

    // Create a more robust command execution
    const fullCommand = command.trim();
    let geminiArgs = [];

    // Handle different command types
    if (fullCommand.startsWith('/')) {
      // Slash command
      geminiArgs = ['-p', fullCommand];
    } else if (fullCommand.startsWith('@')) {
      // File reference command
      geminiArgs = ['-p', fullCommand];
    } else if (fullCommand.startsWith('!')) {
      // Shell command
      geminiArgs = ['-p', fullCommand];
    } else {
      // Regular prompt
      geminiArgs = ['-p', fullCommand];
    }

    const ptyProcess = spawn('gemini', geminiArgs, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectPath,
      env: env
    });

    // Collect output
    ptyProcess.onData((data) => {
      output += data;
    });

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      ptyProcess.onExit((exitCode) => {
        if (exitCode && exitCode.exitCode !== 0) {
          hasError = true;
        }
        resolve();
      });

      // Timeout after 120 seconds
      setTimeout(() => {
        ptyProcess.kill();
        hasError = true;
        output += '\n[Timeout: Command execution exceeded 120 seconds]';
        resolve();
      }, 120000);
    });

    // Clean and format output
    const cleanOutput = output
      .split('\n')
      .filter(line =>
        !line.includes('[DEP0040]') &&
        !line.includes('Use `node --trace-deprecation') &&
        !line.includes('ExperimentalWarning') &&
        line.trim() !== ''
      )
      .join('\n')
      .trim();

    res.json({
      success: !hasError,
      output: cleanOutput || 'Command completed successfully',
      hasError
    });

  } catch (error) {
    console.error('CLI execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      output: `Execution failed: ${error.message}`
    });
  }
});

// Fetch available models from Google AI
app.post('/api/models/list', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Filter and format models
    const availableModels = data.models
      ?.filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      ?.map(model => ({
        id: model.name.replace('models/', ''),
        name: model.displayName || model.name.replace('models/', ''),
        description: model.description || 'No description available',
        inputTokenLimit: model.inputTokenLimit || 'Unknown',
        outputTokenLimit: model.outputTokenLimit || 'Unknown',
        supportedGenerationMethods: model.supportedGenerationMethods || []
      }))
      ?.sort((a, b) => {
        // Sort by model generation and type
        const getOrder = (name) => {
          if (name.includes('2.5')) return 1;
          if (name.includes('2.0')) return 2;
          if (name.includes('1.5')) return 3;
          return 4;
        };
        return getOrder(a.id) - getOrder(b.id);
      }) || [];

    res.json({ models: availableModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sessions: ptySessions.size,
    projects: chatHistory.size
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Gemini CLI Workstation server running on http://localhost:${PORT}`);
  console.log(`📁 Home directory: ${homeDir}`);
  console.log(`🔧 Features: File upload, MCP translation, Enhanced CLI integration`);
});

// WebSocket server for real-time features (future expansion)
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Handle real-time features here
      console.log('WebSocket message:', data.type);
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Gemini CLI Workstation server...');

  // Clean up PTY sessions
  ptySessions.forEach((session) => {
    session.pty.kill();
  });

  process.exit(0);
});