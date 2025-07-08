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

// WebSocket connection handling for interactive Gemini CLI session
wss.on('connection', (ws) => {
  // console.log('Chat UI client connected, spawning gemini PTY.'); // Temporarily silenced

  const geminiPty = pty.spawn('gemini', ['-d'], { // Added -d debug flag
    name: 'xterm-color',
    cols: 80, // Client can send 'pty_resize' to update
    rows: 24, // Client can send 'pty_resize' to update
    cwd: process.cwd(), // TODO: Make this project-specific if needed, passed by client on connection?
    env: (() => {
      const ptyEnv = { ...process.env }; // Start with current environment
      const googleAuthVars = [
        'GEMINI_API_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GOOGLE_CLOUD_PROJECT',
        'GOOGLE_CLOUD_LOCATION',
        'GOOGLE_GENAI_USE_VERTEXAI'
      ];
      googleAuthVars.forEach(key => {
        if (process.env[key]) { // If defined in the node server's environment
          ptyEnv[key] = process.env[key]; // Ensure it's passed to PTY
        }
      });
      // Add any other specific env vars needed by gemini-cli or terminal
      ptyEnv['TERM'] = 'xterm-256color'; // Already good from default but explicit
      return ptyEnv;
    })()
  });
  // console.log(`Spawned gemini PTY with PID: ${geminiPty.pid}`); // Temporarily silenced

  // Store PTY process on the WebSocket object
  ws.geminiPty = geminiPty;

  geminiPty.onData(data => {
    // This is the actual PTY data stream from gemini-cli, should NOT be silenced.
    // For extreme debugging if needed: console.log(`PTY Raw Data (PID: ${geminiPty.pid}):`, data);
    try {
      ws.send(JSON.stringify({ type: 'pty_output', data: data }));
    } catch (e) {
      console.error("Error sending PTY data to client:", e);
    }
  });

  geminiPty.onExit(({ exitCode, signal }) => {
    console.log(`Gemini PTY (PID: ${geminiPty.pid}) exited with code: ${exitCode}, signal: ${signal}`);
    console.log('[Backend] Gemini PTY onExit details:', { exitCode, signal }); // Added logging
    try {
      ws.send(JSON.stringify({ type: 'pty_exit', exitCode, signal }));
      ws.geminiPty = null; // Clear reference
      // ws.close(); // Optionally close WebSocket connection
    } catch (e) {
      console.error("Error sending PTY exit to client:", e);
    }
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      // console.log(`Message from client (PID: ${ws.geminiPty?.pid}):`, JSON.stringify(data)); // Temporarily silenced for clean stream test

      if (ws.geminiPty) {
        if (data.type === 'pty_input') {
          ws.geminiPty.write(data.input);
        } else if (data.type === 'pty_resize') {
          if (data.cols && data.rows) {
            ws.geminiPty.resize(data.cols, data.rows);
            // console.log(`Resized PTY (PID: ${ws.geminiPty.pid}) to cols: ${data.cols}, rows: ${data.rows}`); // Temporarily silenced
          }
        }
      } else {
        console.warn("Received message but no PTY session active for this WebSocket.");
      }
    } catch (error) {
      console.error('WebSocket message processing error:', error);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: "Error processing your request: " + error.message }
        }));
      } catch (e) {
        console.error("Error sending error message to client:", e);
      }
    }
  });

  ws.on('close', (code, reason) => { // Added code and reason parameters
    console.log(`Chat UI client disconnected. Killing PTY (PID: ${ws.geminiPty?.pid}).`);
    console.log('[Backend] WebSocket onclose details:', { code, reason: reason ? reason.toString() : undefined }); // Added logging
    if (ws.geminiPty) {
      ws.geminiPty.kill();
      ws.geminiPty = null;
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error (PTY PID: ${ws.geminiPty?.pid}):`, error);
    console.log('[Backend] WebSocket onerror details:', error); // Added logging
    if (ws.geminiPty) {
      ws.geminiPty.kill(); // Ensure PTY is killed on WebSocket error too
      ws.geminiPty = null;
    }
  });
});


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
      let existingSettings = {};
      try {
        // Try to read existing settings
        const existingContent = await fs.readFile(settingsPath, 'utf8');
        existingSettings = JSON.parse(existingContent);
      } catch (error) {
        // File might not exist or is invalid JSON, which is fine.
        // We'll just use an empty object as the base.
        if (error.code !== 'ENOENT') {
          console.warn(`Warning: Could not read or parse existing settings.json at ${settingsPath}:`, error.message);
        }
      }
      // Merge new settings into existing ones. New settings take precedence.
      const updatedSettings = { ...existingSettings, ...settings };
      console.log(">>>>>>>>>>>> SETTINGS RECEIVED FROM UI:", JSON.stringify(settings, null, 2));
      console.log(">>>>>>>>>>>> EXISTING SETTINGS LOADED FROM FILE:", JSON.stringify(existingSettings, null, 2));
      console.log(">>>>>>>>>>>> FINAL MERGED SETTINGS TO BE SAVED:", JSON.stringify(updatedSettings, null, 2));
      await fs.writeFile(settingsPath, JSON.stringify(updatedSettings, null, 2));
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
    console.log(">>>>>>>>>>>> RAW COMMAND RECEIVED BY BACKEND:", JSON.stringify(command)); // LOGGING LINE

    // Build environment with project-specific variables
    const execEnv = {
      ...process.env,
      ...envVars,
      // Suppress Node.js deprecation warnings that clutter output
      NODE_NO_WARNINGS: '1'
    };

    const trimmedCommand = command.trim();
    const geminiExecutable = 'gemini'; // Assuming 'gemini' is in PATH
    let argsArray = [];

    if (trimmedCommand.startsWith('/') && !trimmedCommand.startsWith('@') && !trimmedCommand.startsWith('!')) {
        // For /commands like "/help" or "/tool list item"
        const parts = trimmedCommand.split(' ');
        const mainCommand = parts[0]; // e.g., "/help" or "/tool"
        argsArray.push(mainCommand);
        if (parts.length > 1) {
            // Add remaining parts as separate arguments.
            // This simple split might need refinement if gemini subcommands expect multi-word args to be single strings.
            argsArray.push(...parts.slice(1));
        }
        // Example: UI "/help" -> argsArray = ["/help"]
        // Example: UI "/tool list item" -> argsArray = ["/tool", "list", "item"]
    } else if (trimmedCommand.startsWith('@') || trimmedCommand.startsWith('!')) {
        // For @file or !shell commands, pass the whole string as a single argument.
        // This assumes gemini handles the '@' and '!' prefixes internally when passed this way.
        // This might be an area for refinement if gemini expects '!' to be handled by a shell.
        argsArray.push(trimmedCommand);
        // Example: UI "@file.txt" -> argsArray = ["@file.txt"]
        // Example: UI "!ls -la" -> argsArray = ["!ls -la"]
    } else {
        // For plain prompts
        argsArray.push('--prompt', trimmedCommand);
        // Example: UI "hi" -> argsArray = ["--prompt", "hi"]
        // Example: UI "help" (no slash) -> argsArray = ["--prompt", "help"]
    }

    console.log("Spawning gemini with command:", geminiExecutable, "and args:", JSON.stringify(argsArray));

    const child = spawn(geminiExecutable, argsArray, {
      cwd: projectPath || process.cwd(),
      env: execEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false // Explicitly do not use shell to avoid interference
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

import https from 'https'; // Import the https module

// Endpoint to get list of available models
app.post('/api/models/list', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "API key is required to list models." });
  }

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const googleApiRequest = https.request(options, (googleApiRes) => {
    let data = '';
    googleApiRes.on('data', (chunk) => {
      data += chunk;
    });
    googleApiRes.on('end', () => {
      if (googleApiRes.statusCode >= 200 && googleApiRes.statusCode < 300) {
        try {
          const googleResponse = JSON.parse(data);
          const transformedModels = (googleResponse.models || []).map(model => ({
            // Use model.name (e.g., "models/gemini-pro") as the ID for consistency if CLI uses this form.
            // Or model.baseModelId if the CLI expects shorter names like "gemini-pro".
            // For now, let's assume the full name is more robust for API usage.
            id: model.name,
            name: model.displayName || model.name, // Fallback to model.name if displayName is not present
            description: model.description || '', // Fallback to empty string
            // Add other relevant fields if the UI can use them
            version: model.version,
            inputTokenLimit: model.inputTokenLimit,
            outputTokenLimit: model.outputTokenLimit,
            supportedGenerationMethods: model.supportedGenerationMethods,
          }));
          res.json({ models: transformedModels });
        } catch (parseError) {
          console.error('Error parsing Google API response for models:', parseError);
          res.status(500).json({ error: 'Failed to parse model list from Google API.', details: parseError.message });
        }
      } else {
        console.error(`Google API error for listing models: ${googleApiRes.statusCode}`, data);
        res.status(googleApiRes.statusCode || 500).json({ error: 'Failed to fetch model list from Google API.', details: data });
      }
    });
  });

  googleApiRequest.on('error', (error) => {
    console.error('Error making request to Google API for models:', error);
    res.status(500).json({ error: 'Failed to connect to Google API for model list.', details: error.message });
  });

  googleApiRequest.end();
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
