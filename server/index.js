import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pty from 'node-pty';
import dotenv from 'dotenv';
import multer from 'multer';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Store active PTY sessions
const activeSessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'execute') {
        await handleCommandExecution(ws, data);
      } else if (data.type === 'input') {
        await handleInput(ws, data);
      } else if (data.type === 'resize') {
        await handleResize(ws, data);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: error.message }
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up any active sessions for this client
    for (const [sessionId, session] of activeSessions) {
      if (session.ws === ws) {
        session.ptyProcess?.kill();
        activeSessions.delete(sessionId);
      }
    }
  });
});

// Handle command execution
async function handleCommandExecution(ws, data) {
  const { command, workingDir, sessionId } = data;
  
  try {
    // Create new PTY session
    const ptyProcess = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: data.cols || 80,
      rows: data.rows || 24,
      cwd: workingDir || process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color' }
    });

    // Store session
    activeSessions.set(sessionId, {
      ptyProcess,
      ws,
      workingDir: workingDir || process.cwd()
    });

    // Handle PTY output
    ptyProcess.onData((outputData) => {
      const outputText = outputData.toString();
      // Filter out common noisy stderr messages that might be mixed in
      if (!outputText.includes('DeprecationWarning') &&
          !outputText.includes('MCP STDERR') &&
          !outputText.includes('DEBUG:') &&
          !/\[vite\] connecting\.\.\./i.test(outputText) &&
          !/\[vite\] connected\./i.test(outputText)
          ) {
        ws.send(JSON.stringify({
          type: 'output',
          sessionId,
          data: outputData // Send original buffer if not filtered
        }));
      } else {
        // Optionally, send a filtered message or nothing
        // For now, we'll just suppress these specific noisy messages
        console.log(`Filtered PTY output (session ${sessionId}): ${outputText.substring(0, 100)}...`);
      }
    });

    // Handle PTY exit
    ptyProcess.onExit((exitCode) => {
      ws.send(JSON.stringify({
        type: 'exit',
        sessionId,
        exitCode
      }));
      activeSessions.delete(sessionId);
    });

    // Send initial command
    if (command) {
      ptyProcess.write(command + '\n');
    }

    ws.send(JSON.stringify({
      type: 'session_started',
      sessionId
    }));

  } catch (error) {
    console.error('Command execution error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      sessionId,
      data: { message: error.message }
    }));
  }
}

// Handle user input to PTY
async function handleInput(ws, data) {
  const { sessionId, input } = data;
  const session = activeSessions.get(sessionId);
  
  if (session && session.ptyProcess) {
    session.ptyProcess.write(input);
  }
}

// Handle terminal resize
async function handleResize(ws, data) {
  const { sessionId, cols, rows } = data;
  const session = activeSessions.get(sessionId);
  
  if (session && session.ptyProcess) {
    session.ptyProcess.resize(cols, rows);
  }
}

// API Routes

// Get list of available projects
app.get('/api/projects', async (req, res) => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const repositoriesDir = path.join(homeDir, 'Repositories');
    
    const projects = [];
    
    try {
      const entries = await fs.readdir(repositoriesDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(repositoriesDir, entry.name);
          const projectInfo = await getProjectInfo(projectPath);
          
          if (projectInfo.isProject) {
            projects.push({
              name: entry.name,
              path: projectPath,
              ...projectInfo
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading repositories directory:', error);
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project information
async function getProjectInfo(projectPath) {
  const info = { isProject: false, hasGeminiConfig: false, type: 'unknown' };
  
  try {
    const entries = await fs.readdir(projectPath);
    
    // Check for project indicators
    if (entries.includes('.git')) {
      info.isProject = true;
      info.type = 'git';
    } else if (entries.includes('package.json')) {
      info.isProject = true;
      info.type = 'node';
    } else if (entries.includes('requirements.txt') || entries.includes('pyproject.toml')) {
      info.isProject = true;
      info.type = 'python';
    } else if (entries.includes('Cargo.toml')) {
      info.isProject = true;
      info.type = 'rust';
    } else if (entries.includes('go.mod')) {
      info.isProject = true;
      info.type = 'go';
    }
    
    // Check for Gemini configuration
    if (entries.includes('.gemini')) {
      const geminiPath = path.join(projectPath, '.gemini');
      try {
        const geminiEntries = await fs.readdir(geminiPath);
        if (geminiEntries.includes('settings.json')) {
          info.hasGeminiConfig = true;
        }
      } catch (error) {
        // Ignore error if .gemini is not a directory
      }
    }
    
    // Check for context files
    const contextFiles = ['GEMINI.md', 'AGENTS.md', 'gemini.md'];
    info.hasContext = contextFiles.some(file => entries.includes(file));
    
  } catch (error) {
    console.error(`Error getting project info for ${projectPath}:`, error);
  }
  
  return info;
}

// Load project configuration
app.get('/api/config/load', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    const config = { settings: {}, env: {} };
    
    // Load Gemini settings
    const settingsPath = path.join(projectPath, '.gemini', 'settings.json');
    try {
      const settingsContent = await fs.readFile(settingsPath, 'utf8');
      config.settings = JSON.parse(settingsContent);
    } catch (error) {
      console.log('No settings.json found or error reading it:', error.message);
    }
    
    // Load environment variables
    const envPath = path.join(projectPath, '.env');
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            config.env[key.trim()] = value;
          }
        }
      }
    } catch (error) {
      console.log('No .env file found or error reading it:', error.message);
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error loading configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save project configuration
app.post('/api/config/save', async (req, res) => {
  try {
    const { projectPath, settings, env } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    // Ensure .gemini directory exists
    const geminiDir = path.join(projectPath, '.gemini');
    await fs.mkdir(geminiDir, { recursive: true });
    
    // Save settings.json
    if (settings) {
      const settingsPath = path.join(geminiDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    }
    
    // Save .env file
    if (env) {
      const envPath = path.join(projectPath, '.env');
      const envContent = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(envPath, envContent);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Translate MCP configuration
app.post('/api/mcp/translate', async (req, res) => {
  try {
    const { mcpConfig } = req.body;
    
    if (!mcpConfig) {
      return res.status(400).json({ error: 'MCP configuration is required' });
    }
    
    // Convert standard MCP config to Gemini CLI format
    const geminiConfig = { mcpServers: {} };
    
    for (const [serverName, serverConfig] of Object.entries(mcpConfig)) {
      geminiConfig.mcpServers[serverName] = {
        command: serverConfig.command,
        args: serverConfig.args || [],
        cwd: serverConfig.cwd || undefined,
        env: serverConfig.env || {},
        timeout: serverConfig.timeout || 600000,
        trust: serverConfig.trust || false
      };
    }
    
    res.json(geminiConfig);
  } catch (error) {
    console.error('Error translating MCP configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute CLI command (for non-interactive commands)
app.post('/api/cli/execute', async (req, res) => {
  try {
    const { projectPath, command, settings, envVars, timeout = 30000 } = req.body;
    
    // Build environment with project-specific variables
    const execEnv = { 
      ...process.env,
      ...envVars,
      // Suppress Node.js deprecation warnings that clutter output
      NODE_NO_WARNINGS: '1'
    };
    
    // Pass the command as an argument to gemini.
    // If it's not a slash, at, or bang command, assume it's a prompt and use -p.
    let finalCommand;
    const trimmedCommand = command.trim();
    if (trimmedCommand.startsWith('/') || trimmedCommand.startsWith('@') || trimmedCommand.startsWith('!')) {
        finalCommand = `gemini "${command.replace(/"/g, '\\"')}"`; // Use original command for accurate quoting
    } else {
        // For plain chat, use the --prompt flag
        finalCommand = `gemini --prompt "${command.replace(/"/g, '\\"')}"`;
    }
    
    console.log(`Executing backend command: ${finalCommand}`); // For debugging

    const child = spawn('bash', ['-c', finalCommand], {
      cwd: projectPath || process.cwd(),
      env: execEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let hasError = false;
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      const stderrText = data.toString();
      // Filter out Node.js deprecation warnings and MCP debug messages
      if (!stderrText.includes('DeprecationWarning') && 
          !stderrText.includes('MCP STDERR') &&
          !stderrText.includes('DEBUG:')) {
        stderr += stderrText;
        if (stderrText.toLowerCase().includes('error')) {
          hasError = true;
        }
      }
    });
    
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      hasError = true;
    }, timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeoutId);
      
      // If we have stdout content, use that as the main output
      const output = stdout.trim() || stderr.trim() || 'Command completed successfully';
      
      res.json({
        exitCode: code,
        output: output,
        hasError: hasError || (code !== 0 && !stdout.trim()),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: !hasError && (code === 0 || stdout.trim())
      });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      res.json({
        exitCode: 1,
        output: `Command execution error: ${error.message}`,
        hasError: true,
        stderr: error.message,
        success: false
      });
    });
    
  } catch (error) {
    console.error('Error executing CLI command:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat history management
app.get('/api/chat/history', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath) {
      return res.json({ history: [] });
    }
    
    const historyPath = path.join(projectPath, '.gemini', 'chat_history.json');
    
    try {
      const historyContent = await fs.readFile(historyPath, 'utf8');
      const history = JSON.parse(historyContent);
      res.json({ history: history || [] });
    } catch (error) {
      // File doesn't exist or is invalid, return empty history
      res.json({ history: [] });
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat/message', async (req, res) => {
  try {
    const { projectPath, message } = req.body;
    
    if (!projectPath || !message) {
      return res.status(400).json({ error: 'Project path and message are required' });
    }
    
    // Ensure .gemini directory exists
    const geminiDir = path.join(projectPath, '.gemini');
    await fs.mkdir(geminiDir, { recursive: true });
    
    const historyPath = path.join(geminiDir, 'chat_history.json');
    
    let history = [];
    try {
      const historyContent = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(historyContent) || [];
    } catch (error) {
      // File doesn't exist, start with empty history
    }
    
    // Add message to history
    history.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });
    
    // Keep only last 100 messages to prevent file from growing too large
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/chat/history', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    const historyPath = path.join(projectPath, '.gemini', 'chat_history.json');
    
    try {
      await fs.unlink(historyPath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

// File management endpoints
app.get('/api/files/list', async (req, res) => {
  try {
    const { path: dirPath } = req.query;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // Skip hidden files
      
      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      files.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    }
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/uploads', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
    if (!projectPath) {
      return res.json({ files: [] });
    }
    
    const uploadsPath = path.join(projectPath, '.gemini', 'uploads');
    
    try {
      await fs.access(uploadsPath);
      const entries = await fs.readdir(uploadsPath, { withFileTypes: true });
      const files = [];
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(uploadsPath, entry.name);
          const stats = await fs.stat(fullPath);
          
          files.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
      
      res.json({ files });
    } catch (error) {
      // Uploads directory doesn't exist
      res.json({ files: [] });
    }
  } catch (error) {
    console.error('Error listing uploaded files:', error);
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { projectPath } = req.body;
    const uploadsDir = path.join(projectPath, '.gemini', 'uploads');
    
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

app.post('/api/files/upload', upload.array('files'), async (req, res) => {
  try {
    const { projectPath } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    
    const files = req.files.map(file => ({
      name: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      type: file.mimetype
    }));
    
    res.json({ files, success: true });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Endpoint to get list of available models
app.post('/api/models/list', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const execEnv = { ...process.env };
    if (apiKey) {
      execEnv.GEMINI_API_KEY = apiKey;
    }

    // Command to list models in JSON format. Adjust if the actual command is different.
    // Using "gemini models list --format json" as a common pattern.
    // If gemini-cli uses a different flag or structure, this will need an update.
    const command = 'gemini models list --format json';

    const child = spawn('bash', ['-c', command], {
      env: execEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let hasError = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.toLowerCase().includes('error')) {
          hasError = true;
      }
    });

    child.on('close', (code) => {
      if (hasError || code !== 0) {
        console.error(`Error listing models: ${stderr}`);
        // Try to parse stdout for any partial JSON that might contain an error message from the CLI
        try {
            const jsonError = JSON.parse(stdout);
            if (jsonError && jsonError.error) {
                return res.status(500).json({ error: jsonError.error.message || stderr || 'Failed to list models' });
            }
        } catch (e) {
            // ignore parsing error, stdout might not be JSON
        }
        return res.status(500).json({ error: stderr || 'Failed to list models', details: stdout });
      }
      try {
        const models = JSON.parse(stdout);
        res.json({ models });
      } catch (error) {
        console.error('Error parsing models list JSON:', error);
        res.status(500).json({ error: 'Failed to parse models list from CLI output', details: stdout });
      }
    });

    child.on('error', (error) => {
      console.error('Spawn error listing models:', error);
      res.status(500).json({ error: `Failed to execute gemini command: ${error.message}` });
    });

  } catch (error) {
    console.error('Error in /api/models/list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Gemini CLI Workstation Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔧 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // Close all active PTY sessions
  for (const [sessionId, session] of activeSessions) {
    session.ptyProcess?.kill();
  }
  
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});
