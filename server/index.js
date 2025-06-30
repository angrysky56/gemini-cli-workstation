import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { spawn } from 'node-pty';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store active PTY sessions
const ptySessions = new Map();
const chatHistory = new Map(); // Store chat history by project

// Helper function to translate standard MCP config to Gemini format
function translateMcpConfig(standardConfig) {
  const geminiConfig = {};
  
  for (const [serverName, config] of Object.entries(standardConfig)) {
    // Handle different MCP server command formats
    if (config.command === 'uv' && config.args) {
      // UV-based servers (like the user's examples)
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args,
        env: config.env || {},        cwd: config.cwd,
        timeout: config.timeout || 600000
      };
    } else if (config.command === 'uvx' && config.args) {
      // UVX-based servers
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args,
        env: config.env || {},
        timeout: config.timeout || 600000
      };
    } else if (config.command && config.command.startsWith('/')) {
      // Absolute path executables
      geminiConfig[serverName] = {
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        timeout: config.timeout || 600000
      };
    } else {
      // Direct translation for already compatible configs
      geminiConfig[serverName] = config;
    }
    
    // Ensure proper defaults
    if (!geminiConfig[serverName].timeout) {
      geminiConfig[serverName].timeout = 600000;
    }
    if (!geminiConfig[serverName].trust) {
      geminiConfig[serverName].trust = false;
    }
  }
  
  return geminiConfig;
}
// API Routes

// List files and directories
app.get('/api/files/list', async (req, res) => {
  try {
    const { path: dirPath = '/home/ty' } = req.query;
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    const files = [];
    const directories = [];
    
    for (const item of items) {
      // Skip hidden files and common ignore patterns
      if (item.name.startsWith('.') || 
          item.name === 'node_modules' ||
          item.name === '__pycache__' ||
          item.name === 'dist' ||
          item.name === 'build') {
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

// Get available projects (scan for directories with .git or package.json)
app.get('/api/projects', async (req, res) => {
  try {
    const homeDir = process.env.HOME || '/home/ty';
    const workspaceDir = path.join(homeDir, 'Repositories', 'ai_workspace');
    const reposDir = path.join(homeDir, 'Repositories');
    
    const projects = [];
    
    // Scan common project directories
    const dirsToScan = [workspaceDir, reposDir];
    
    for (const dir of dirsToScan) {
      try {
        const items = await fs.readdir(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            // Check if it's a project (has .git, package.json, or .gemini)
            const hasGit = await fs.access(path.join(fullPath, '.git')).then(() => true).catch(() => false);
            const hasPackageJson = await fs.access(path.join(fullPath, 'package.json')).then(() => true).catch(() => false);
            const hasGeminiConfig = await fs.access(path.join(fullPath, '.gemini')).then(() => true).catch(() => false);
            
            if (hasGit || hasPackageJson || hasGeminiConfig) {
              projects.push({
                name: item,
                path: fullPath,
                hasGeminiConfig
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dir}:`, error);
      }
    }
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save configuration files to a project
app.post('/api/config/save', async (req, res) => {
  try {
    const { projectPath, settings, envVars } = req.body;
    
    // Create .gemini directory if it doesn't exist
    const geminiDir = path.join(projectPath, '.gemini');
    await fs.mkdir(geminiDir, { recursive: true });
    
    // Save settings.json
    const settingsPath = path.join(geminiDir, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    
    // Save .env file if there are env vars
    if (envVars && Object.keys(envVars).length > 0) {
      const envPath = path.join(projectPath, '.env');
      const envContent = Object.entries(envVars)
        .filter(([key, value]) => value && value.trim())
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');
      
      if (envContent) {
        await fs.writeFile(envPath, envContent);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Load configuration from a project
app.get('/api/config/load', async (req, res) => {
  try {
    const { projectPath } = req.query;
    
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
      
      // Parse .env file
      envContent.split('\n').forEach(line => {
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
      });
    } catch (error) {
      // .env file doesn't exist
    }
    
    res.json({ settings, envVars });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Translate MCP configuration
app.post('/api/mcp/translate', (req, res) => {
  try {
    const { standardConfig } = req.body;
    const geminiConfig = translateMcpConfig(standardConfig);
    res.json({ geminiConfig });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history for a project
app.get('/api/chat/history', (req, res) => {
  const { projectPath } = req.query;
  const history = chatHistory.get(projectPath) || [];
  res.json({ history });
});

// Save chat message
app.post('/api/chat/message', (req, res) => {
  const { projectPath, message } = req.body;
  
  if (!chatHistory.has(projectPath)) {
    chatHistory.set(projectPath, []);
  }
  
  const history = chatHistory.get(projectPath);
  history.push({
    ...message,
    id: Date.now().toString()
  });
  
  // Keep only last 100 messages per project
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }
  
  res.json({ success: true });
});

// Create a new Gemini CLI session
app.post('/api/cli/session', (req, res) => {
  try {
    const { projectPath, envVars } = req.body;
    const sessionId = Date.now().toString();
    
    // Set up environment variables
    const env = {
      ...process.env,
      ...envVars,
      // Ensure color output
      FORCE_COLOR: '1',
      TERM: 'xterm-256color'
    };
    
    // Spawn Gemini CLI in PTY
    const ptyProcess = spawn('gemini', [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectPath,
      env: env
    });
    
    ptySessions.set(sessionId, {
      pty: ptyProcess,
      projectPath,
      created: new Date()
    });
    
    // Clean up on exit
    ptyProcess.onExit(() => {
      ptySessions.delete(sessionId);
    });
    
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send input to CLI session
app.post('/api/cli/input', (req, res) => {
  try {
    const { sessionId, input } = req.body;
    const session = ptySessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.pty.write(input);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close CLI session
app.delete('/api/cli/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = ptySessions.get(sessionId);
  
  if (session) {
    session.pty.kill();
    ptySessions.delete(sessionId);
  }
  
  res.json({ success: true });
});

// Execute a single command (non-interactive)
app.post('/api/cli/execute', async (req, res) => {
  try {
    const { projectPath, command, envVars } = req.body;
    
    // Save config files first
    if (req.body.settings) {
      const geminiDir = path.join(projectPath, '.gemini');
      await fs.mkdir(geminiDir, { recursive: true });
      
      const settingsPath = path.join(geminiDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(req.body.settings, null, 2));
    }
    
    // Set up environment
    const env = {
      ...process.env,
      ...envVars
    };
    
    let output = '';
    let errorOutput = '';
    
    // Use echo piping as shown in docs
    const geminiCommand = `cd "${projectPath}" && echo "${command.replace(/"/g, '\\"')}" | gemini 2>&1`;
    
    const ptyProcess = spawn('bash', ['-c', geminiCommand], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: projectPath,
      env: env
    });
    
    ptyProcess.onData((data) => {
      output += data;
    });
    
    await new Promise((resolve) => {
      ptyProcess.onExit(() => {
        resolve();
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        ptyProcess.kill();
        resolve();
      }, 60000);
    });
    
    // Clean output
    const cleanOutput = output
      .split('\n')
      .filter(line => !line.includes('[DEP0040]') && !line.includes('Use `node --trace-deprecation'))
      .join('\n')
      .trim();
    
    res.json({ success: true, output: cleanOutput });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Gemini Workstation server running on http://localhost:${PORT}`);
});

// WebSocket server for real-time CLI output
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let currentSession = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'attach':
          const session = ptySessions.get(data.sessionId);
          if (session) {
            currentSession = data.sessionId;
            
            // Set up data handler
            const dataHandler = (output) => {
              ws.send(JSON.stringify({
                type: 'output',
                data: output
              }));
            };
            
            session.pty.onData(dataHandler);
            
            // Clean up handler on disconnect
            ws.on('close', () => {
              session.pty.removeListener('data', dataHandler);
            });
            
            ws.send(JSON.stringify({
              type: 'attached',
              sessionId: data.sessionId
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Session not found'
            }));
          }
          break;
          
        case 'input':
          if (currentSession) {
            const session = ptySessions.get(currentSession);
            if (session) {
              session.pty.write(data.data);
            }
          }
          break;
          
        case 'resize':
          if (currentSession) {
            const session = ptySessions.get(currentSession);
            if (session && data.cols && data.rows) {
              session.pty.resize(data.cols, data.rows);
            }
          }
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
});

// Cleanup on exit
process.on('SIGINT', () => {
  ptySessions.forEach((session) => {
    session.pty.kill();
  });
  process.exit();
});
