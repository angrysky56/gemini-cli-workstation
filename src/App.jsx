import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import enhanced components
import {
  AnimatedBackground,
  ModernSidebar,
  colors
} from './ModernComponents';
import { ModernChatInterface } from './ModernChatInterface';
import FileUploadComponent from './FileUploadComponent';

import {
  Settings, Wrench, Server, FileCode, Info, ChevronRight, Save, Copy, Check,
  Trash2, PlusCircle, KeyRound, Terminal, Download, Upload, AlertCircle,
  ExternalLink, Eye, EyeOff, FileEdit, RefreshCw, Home, FolderOpen, Cpu, Zap,
  DollarSign, Send, ArrowRight, History, ChevronLeft, Search, FileText, AtSign,
  Hash, Command, X, Loader, MessageCircle, Folder, User
} from 'lucide-react';

// Simple Icon component to match backup usage
const Icon = ({ name, className }) => {
  const icons = {
    Settings, Wrench, Server, FileCode, Info, ChevronRight, Save, Copy, Check,
    Trash2, PlusCircle, KeyRound, Terminal, Download, Upload, AlertCircle,
    ExternalLink, Eye, EyeOff, FileEdit, RefreshCw, Home, FolderOpen, Cpu, Zap,
    DollarSign, Send, ArrowRight, History, ChevronLeft, Search, FileText, AtSign,
    Hash, Command, X, Loader, MessageCircle, Folder, User
  };
  const IconComponent = icons[name];
  return IconComponent ? <IconComponent className={className} /> : null;
};

// MCP Config Translator Component  
const McpConfigTranslator = ({ onTranslate }) => {
  const [standardConfig, setStandardConfig] = useState('');
  const [translatedConfig, setTranslatedConfig] = useState('');
  const [error, setError] = useState('');

  const exampleConfig = `{
  "sqlite": {
    "command": "uv",
    "args": [
      "--directory",
      "<your-sqlite-server-path>",
      "run",
      "mcp-server-sqlite",
      "--db-path",
      "<your-algo-db-path>"
    ]
  },
  "docker-mcp": {
    "command": "uvx",
    "args": ["docker-mcp"]
  }
}`;

  const handleTranslate = async () => {
    setError('');
    try {
      const config = JSON.parse(standardConfig);
      
      // Translate directly without API call
      const geminiConfig = {};
      for (const [name, serverConfig] of Object.entries(config)) {
        geminiConfig[name] = {
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env || {},
          cwd: serverConfig.cwd || undefined,
          timeout: serverConfig.timeout || 600000,
          trust: serverConfig.trust || false
        };
      }
      
      setTranslatedConfig(JSON.stringify(geminiConfig, null, 2));
      if (onTranslate) {
        onTranslate(geminiConfig);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Info" className="text-blue-400" />
          <h3 className="font-semibold text-blue-400">MCP Config Translator</h3>
        </div>
        <p className="text-sm text-gray-300">
          Paste your standard MCP configuration here and it will be translated to Gemini CLI format.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Standard MCP Config (JSON)
          </label>
          <textarea
            value={standardConfig}
            onChange={(e) => setStandardConfig(e.target.value)}
            placeholder={exampleConfig}
            className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm font-mono text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gemini CLI Format
          </label>
          <textarea
            value={translatedConfig}
            readOnly
            className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-green-400"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleTranslate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Icon name="ArrowRight" className="w-4 h-4" />
        Translate Configuration
      </button>
    </div>
  );
};

// MCP Servers Component
const MCPServers = ({ settings, setSettings }) => {
  const [editingServer, setEditingServer] = useState(null);
  const [showTranslator, setShowTranslator] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    command: '',
    args: '',
    cwd: '',
    timeout: 600000,
    trust: false,
    env: ''
  });

  const addServer = () => {
    if (!newServer.name || !newServer.command) return;

    const serverConfig = {
      command: newServer.command,
      args: newServer.args ? newServer.args.split(',').map(s => s.trim()).filter(s => s) : [],
      cwd: newServer.cwd || undefined,
      timeout: newServer.timeout,
      trust: newServer.trust,
      env: newServer.env ? JSON.parse(newServer.env) : {}
    };

    setSettings({
      ...settings,
      mcpServers: {
        ...settings.mcpServers,
        [newServer.name]: serverConfig
      }
    });

    setNewServer({
      name: '',
      command: '',
      args: '',
      cwd: '',
      timeout: 600000,
      trust: false,
      env: ''
    });
    setEditingServer(null);
  };

  const removeServer = (serverName) => {
    const newServers = { ...settings.mcpServers };
    delete newServers[serverName];
    setSettings({ ...settings, mcpServers: newServers });
  };

  const handleTranslatedConfig = (geminiConfig) => {
    setSettings({
      ...settings,
      mcpServers: geminiConfig
    });
    setShowTranslator(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">MCP Server Configurations</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTranslator(!showTranslator)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Icon name="FileEdit" className="w-4 h-4" />
            Import Config
          </button>
          <button
            onClick={() => setEditingServer('new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Icon name="PlusCircle" className="w-4 h-4" />
            Add Server
          </button>
        </div>
      </div>

      {showTranslator && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <McpConfigTranslator onTranslate={handleTranslatedConfig} />
        </div>
      )}

      {editingServer === 'new' && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-blue-400">Add New MCP Server</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
              <input
                type="text"
                value={newServer.name}
                onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                placeholder="myServer"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Command</label>
              <input
                type="text"
                value={newServer.command}
                onChange={(e) => setNewServer({...newServer, command: e.target.value})}
                placeholder="python, node, docker, uv, uvx"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Arguments (comma-separated)</label>
              <input
                type="text"
                value={newServer.args}
                onChange={(e) => setNewServer({...newServer, args: e.target.value})}
                placeholder="--directory, /path/to/server, run, server.py"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Working Directory</label>
              <input
                type="text"
                value={newServer.cwd}
                onChange={(e) => setNewServer({...newServer, cwd: e.target.value})}
                placeholder="./mcp_servers/python"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={newServer.timeout}
                onChange={(e) => setNewServer({...newServer, timeout: parseInt(e.target.value) || 600000})}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Environment Variables (JSON)</label>
            <textarea
              value={newServer.env}
              onChange={(e) => setNewServer({...newServer, env: e.target.value})}
              placeholder='{"API_KEY": "$MY_TOKEN"}'
              rows="2"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trust"
              checked={newServer.trust}
              onChange={(e) => setNewServer({...newServer, trust: e.target.checked})}
              className="rounded bg-gray-700 border-gray-600 text-blue-600"
            />
            <label htmlFor="trust" className="text-sm text-gray-300">
              Trust this server (bypass confirmations)
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addServer}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add Server
            </button>
            <button
              onClick={() => setEditingServer(null)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(settings.mcpServers || {}).map(([name, config]) => (
          <div key={name} className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-blue-400">{name}</h4>
              <button
                onClick={() => removeServer(name)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Icon name="Trash2" className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-400">Command:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.command}</code></p>
              {config.args?.length > 0 && (
                <p><span className="text-gray-400">Args:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.args.join(' ')}</code></p>
              )}
              {config.cwd && (
                <p><span className="text-gray-400">CWD:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.cwd}</code></p>
              )}
              <p><span className="text-gray-400">Timeout:</span> {config.timeout}ms</p>
              <p><span className="text-gray-400">Trusted:</span> {config.trust ? '✅' : '❌'}</p>
              {Object.keys(config.env || {}).length > 0 && (
                <p><span className="text-gray-400">Env:</span> <code className="bg-gray-700 px-2 py-1 rounded">{JSON.stringify(config.env)}</code></p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// API Configuration
const API_BASE = import.meta.env.VITE_BACKEND_PORT
  ? `http://localhost:${import.meta.env.VITE_BACKEND_PORT}/api`
  : 'http://localhost:3001/api';

// Enhanced API helper functions
const api = {
  async getProjects() {
    const response = await fetch(`${API_BASE}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async saveConfig(projectPath, settings, envVars) {
    const response = await fetch(`${API_BASE}/config/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, settings, envVars })
    });
    if (!response.ok) throw new Error('Failed to save configuration');
    return response.json();
  },

  async loadConfig(projectPath) {
    const response = await fetch(`${API_BASE}/config/load?projectPath=${encodeURIComponent(projectPath)}`);
    if (!response.ok) throw new Error('Failed to load configuration');
    return response.json();
  },

  async translateMcpConfig(standardConfig) {
    const response = await fetch(`${API_BASE}/mcp/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardConfig })
    });
    if (!response.ok) throw new Error('Failed to translate MCP configuration');
    return response.json();
  },

  async getChatHistory(projectPath) {
    const response = await fetch(`${API_BASE}/chat/history?projectPath=${encodeURIComponent(projectPath)}`);
    if (!response.ok) throw new Error('Failed to fetch chat history');
    return response.json();
  },

  async saveChatMessage(projectPath, message) {
    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, message })
    });
    if (!response.ok) throw new Error('Failed to save chat message');
    return response.json();
  },

  async clearChatHistory(projectPath) {
    const response = await fetch(`${API_BASE}/chat/history?projectPath=${encodeURIComponent(projectPath)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to clear chat history');
    return response.json();
  },

  async executeCommand(projectPath, command, settings, envVars) {
    const response = await fetch(`${API_BASE}/cli/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, command, settings, envVars })
    });
    if (!response.ok) throw new Error('Failed to execute command');
    return response.json();
  },

  async uploadFiles(projectPath, files) {
    const formData = new FormData();
    formData.append('projectPath', projectPath);
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload files');
    return response.json();
  },

  async getUploadedFiles(projectPath) {
    const response = await fetch(`${API_BASE}/files/uploads?projectPath=${encodeURIComponent(projectPath)}`);
    if (!response.ok) throw new Error('Failed to fetch uploaded files');
    return response.json();
  },

  async listFiles(dirPath) {
    const response = await fetch(`${API_BASE}/files/list?path=${encodeURIComponent(dirPath)}`);
    if (!response.ok) throw new Error('Failed to list files');
    return response.json();
  },

  async getModels(apiKey) {
    const response = await fetch(`${API_BASE}/models/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    return response.json();
  },

  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Default settings based on Gemini CLI documentation
const defaultSettings = {
  theme: "Default",
  contextFileName: "GEMINI.md",
  selectedModel: "gemini-2.0-flash-lite",
  baseFolderPath: "",
  autoAccept: false,
  sandbox: true,
  preferredEditor: "vscode",
  fileFiltering: {
    respectGitIgnore: true,
    enableRecursiveFileSearch: true
  },
  checkpointing: {
    enabled: false
  },
  coreTools: ["ReadFileTool", "GlobTool", "SearchText", "WriteFileTool", "ShellTool"],
  excludeTools: [],
  toolDiscoveryCommand: "",
  toolCallCommand: "",
  mcpServers: {},
  telemetry: {
    enabled: false,
    target: "local",
    otlpEndpoint: "http://localhost:5173",
    logPrompts: true
  },
  usageStatisticsEnabled: true
};

const defaultEnvVars = {
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  GOOGLE_CLOUD_PROJECT: "",
  GOOGLE_CLOUD_LOCATION: "",
  GOOGLE_GENAI_USE_VERTEXAI: "false"
};

// Enhanced Project Selector Component
const ProjectSelector = ({ currentProject, setCurrentProject, onProjectChange, className = "" }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await api.getProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (project) => {
    setCurrentProject(project.path);
    setShowDropdown(false);

    if (onProjectChange) {
      try {
        const config = await api.loadConfig(project.path);
        onProjectChange(project.path, config);
      } catch (error) {
        console.error('Failed to load project config:', error);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full flex items-center justify-between px-4 py-3 ${colors.glass} rounded-xl hover:bg-white/20 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <div className="text-sm font-medium text-white truncate max-w-[200px]">
              {currentProject ? currentProject.split('/').pop() : 'Select Project'}
            </div>
            {currentProject && (
              <div className="text-xs text-gray-400 truncate max-w-[200px]">
                {currentProject}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
      </button>

      {showDropdown && (
        <div className={`absolute top-full mt-2 w-full max-h-96 overflow-y-auto ${colors.glass} border border-white/20 rounded-xl shadow-xl z-50`}>
          {loading ? (
            <div className="p-4 text-center">
              <Loader className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
              <p className="text-sm text-gray-400 mt-2">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No projects found
            </div>
          ) : (
            <>
              {projects.map((project, index) => (
                <button
                  key={index}
                  onClick={() => selectProject(project)}
                  className="w-full text-left p-4 hover:bg-white/10 transition-colors group first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        project.hasGeminiConfig ? 'bg-green-400' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-white">{project.name}</div>
                        <div className="text-xs text-gray-400">{project.type} project</div>
                      </div>
                    </div>
                    {project.hasGeminiConfig && (
                      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                        Configured
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {project.path}
                  </div>
                </button>
              ))}

              <button
                onClick={() => {
                  loadProjects();
                  setShowDropdown(false);
                }}
                className="w-full text-left p-4 hover:bg-white/10 transition-colors border-t border-white/10 rounded-b-xl"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Refresh Projects</span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced MCP Configuration Component
// Model Selection Component
const ModelSelectionTab = ({ settings, setSettings, envVars, api }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  const apiKey = envVars.GEMINI_API_KEY;

  useEffect(() => {
    if (apiKey && models.length === 0) {
      loadModels();
    }
  }, [apiKey]);

  const loadModels = async () => {
    if (!apiKey) {
      setError('Please set your API key in the Authentication tab first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.getModels(apiKey);
      setModels(result.models || []);
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectModel = (modelId) => {
    setSettings({ ...settings, selectedModel: modelId });
  };

  const getCategoryColor = (modelId) => {
    if (modelId.includes('pro')) return 'text-purple-400';
    if (modelId.includes('flash')) return 'text-blue-400';
    if (modelId.includes('lite')) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Model Selection</h2>

        <div className={`${colors.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-blue-400">Available Models</h3>
          </div>
          <p className="text-sm text-gray-300">
            Select which Gemini model to use. Models are fetched live from Google's API to ensure you see all current options.
          </p>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Gemini Models</h3>
          <button
            onClick={loadModels}
            disabled={loading || !apiKey}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh Models'}
          </button>
        </div>

        {lastFetch && (
          <p className="text-xs text-gray-400">
            Last updated: {lastFetch.toLocaleString()}
          </p>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h4 className="font-semibold text-red-400">Error Loading Models</h4>
            </div>
            <p className="text-sm text-red-200">{error}</p>
            {!apiKey && (
              <p className="text-sm text-red-200 mt-2">
                Please set your API key in the Authentication tab first.
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Fetching available models...</span>
          </div>
        )}

        {models.length > 0 && (
          <div className="space-y-3">
            {models.map((model) => (
              <div
                key={model.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  settings.selectedModel === model.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => selectModel(model.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold ${getCategoryColor(model.id)}`}>
                        {model.id}
                      </h4>
                      {settings.selectedModel === model.id && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-sm text-gray-400 mt-1">{model.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {model.inputTokenLimit && (
                        <span>Input: {model.inputTokenLimit.toLocaleString()} tokens</span>
                      )}
                      {model.outputTokenLimit && (
                        <span>Output: {model.outputTokenLimit.toLocaleString()} tokens</span>
                      )}
                      {model.supportedGenerationMethods && (
                        <span>Methods: {model.supportedGenerationMethods.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {settings.selectedModel === model.id ? (
                      <Check className="w-5 h-5 text-blue-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && models.length === 0 && !error && apiKey && (
          <div className={`${colors.glass} rounded-xl p-8 text-center`}>
            <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-300 mb-2">No Models Found</h4>
            <p className="text-gray-400 mb-4">
              Unable to fetch models. This might be due to API limitations or network issues.
            </p>
            <button
              onClick={loadModels}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentProject, setCurrentProject] = useState("");
  const [serverHealth, setServerHealth] = useState(false);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [envVars, setEnvVars] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-env');
    return saved ? { ...defaultEnvVars, ...JSON.parse(saved) } : defaultEnvVars;
  });

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      const healthy = await api.checkHealth();
      setServerHealth(healthy);
    };

    checkServerHealth();
    // Check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save settings
  useEffect(() => {
    localStorage.setItem('gemini-cli-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gemini-cli-env', JSON.stringify(envVars));
  }, [envVars]);

  const handleProjectChange = async (projectPath, config) => {
    if (config?.settings) {
      setSettings(prev => ({ ...prev, ...config.settings }));
    }
    if (config?.envVars) {
      setEnvVars(prev => ({ ...prev, ...config.envVars }));
    }
  };

  const saveToProject = async () => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    try {
      await api.saveConfig(currentProject, settings, envVars);
      alert('Configuration saved successfully!');
    } catch (error) {
      alert(`Failed to save: ${error.message}`);
    }
  };

  const exportConfig = () => {
    const config = {
      settings,
      envVars,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-cli-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          const config = JSON.parse(text);
          if (config.settings) setSettings(prev => ({ ...prev, ...config.settings }));
          if (config.envVars) setEnvVars(prev => ({ ...prev, ...config.envVars }));
          alert('Configuration imported successfully!');
        } catch (error) {
          alert(`Failed to import: ${error.message}`);
        }
      }
    };
    input.click();
  };

  // Component renderers for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ModernChatInterface
            settings={settings}
            setSettings={setSettings}
            envVars={envVars}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            api={api}
          />
        );

      case 'projects':
        return (
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">Project Management</h2>

              <ProjectSelector
                currentProject={currentProject}
                setCurrentProject={setCurrentProject}
                onProjectChange={handleProjectChange}
                className="max-w-md"
              />

              {currentProject && (
                <div className={`${colors.glass} rounded-xl p-6`}>
                  <h3 className="text-lg font-semibold text-white mb-4">Current Project</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Path:</span>
                      <code className="bg-gray-800/50 px-2 py-1 rounded text-blue-400">{currentProject}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">{currentProject.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'tools':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Tools & MCP Configuration</h2>
              <MCPServers settings={settings} setSettings={setSettings} />
            </div>
          </div>
        );

      case 'authentication':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">Authentication Configuration</h2>

              <div className={`${colors.glass} rounded-xl p-6 space-y-6`}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={envVars.GEMINI_API_KEY}
                      onChange={(e) => setEnvVars({...envVars, GEMINI_API_KEY: e.target.value})}
                      placeholder="Enter your Gemini API key"
                      className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Get your API key from Google AI Studio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Cloud Project ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={envVars.GOOGLE_CLOUD_PROJECT}
                    onChange={(e) => setEnvVars({...envVars, GOOGLE_CLOUD_PROJECT: e.target.value})}
                    placeholder="your-project-id"
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'models':
        return <ModelSelectionTab settings={settings} setSettings={setSettings} envVars={envVars} api={api} />;

      case 'settings':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">General Settings</h2>

              <div className={`${colors.glass} rounded-xl p-6 space-y-6`}>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Folder Path</label>
                  <input
                    type="text"
                    value={settings.baseFolderPath || ''}
                    onChange={(e) => setSettings({...settings, baseFolderPath: e.target.value})}
                    placeholder="/path/to/your/projects"
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({...settings, theme: e.target.value})}
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Default">Default</option>
                    <option value="GitHub">GitHub</option>
                    <option value="Minimal">Minimal</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Auto-Accept Safe Tool Calls</h3>
                    <p className="text-xs text-gray-400 mt-1">Skip confirmation for read-only operations</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, autoAccept: !settings.autoAccept})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoAccept ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoAccept ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Enable Sandboxing</h3>
                    <p className="text-xs text-gray-400 mt-1">Run tools in isolated environment</p>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, sandbox: !settings.sandbox})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.sandbox ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sandbox ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Respect .gitignore</h3>
                    <p className="text-xs text-gray-400 mt-1">Hide git-ignored files in file selector</p>
                  </div>
                  <button
                    onClick={() => setSettings({
                      ...settings,
                      fileFiltering: {
                        ...settings.fileFiltering,
                        respectGitIgnore: !settings.fileFiltering.respectGitIgnore
                      }
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.fileFiltering.respectGitIgnore ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.fileFiltering.respectGitIgnore ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Coming Soon</h2>
              <p className="text-gray-400">This feature is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-slate-900 text-white overflow-hidden relative">
      <AnimatedBackground />

      <div className="relative z-10 h-full flex">
        {/* Enhanced Sidebar */}
        <ModernSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ProjectSelector
                currentProject={currentProject}
                setCurrentProject={setCurrentProject}
                onProjectChange={handleProjectChange}
                className="min-w-[300px]"
              />

              {/* Server Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                serverHealth ? `${colors.glass} text-green-400` : 'bg-red-900/20 text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  serverHealth ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="text-xs font-medium">
                  {serverHealth ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveToProject}
                disabled={!currentProject}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Config
              </button>

              <div className="flex gap-2">
                <button
                  onClick={exportConfig}
                  className={`p-2 ${colors.glass} hover:bg-white/20 rounded-lg transition-colors`}
                  title="Export Configuration"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={importConfig}
                  className={`p-2 ${colors.glass} hover:bg-white/20 rounded-lg transition-colors`}
                  title="Import Configuration"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default App;