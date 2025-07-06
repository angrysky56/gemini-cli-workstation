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
// Import string-argv for robust argument parsing
import { parseArgsStringToArgv } from 'string-argv';

import {
  Settings, Wrench, Server, FileCode, Info, ChevronRight, Save, Copy, Check,
  Trash2, PlusCircle, KeyRound, Terminal, Download, Upload, AlertCircle,
  ExternalLink, Eye, EyeOff, FileEdit, RefreshCw, Home, FolderOpen, Cpu, Zap,
  DollarSign, Send, ArrowRight, History, ChevronLeft, Search, FileText, AtSign,
  Hash, Command, X, Loader, MessageCircle, Folder, User, Cloud, HelpCircle
} from 'lucide-react';

import { readJsonFile } from './utils/fileUtils';

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

// Enhanced Project Management Component - REMOVED as per user request to simplify project management
// const ProjectManagementTab = ({ currentProject, setCurrentProject, onProjectChange, api, showToast }) => {
//   const [projects, setProjects] = useState([]);
//   const [managedProjects, setManagedProjects] = useState(() => {
//     const saved = localStorage.getItem('gemini-cli-managed-projects');
//     return saved ? JSON.parse(saved) : [];
//   });
//   ...rest of component...
// };

// AddMcpServerForm component for adding new MCP servers
const AddMcpServerForm = ({ newServer, setNewServer, addServer, setEditingServer, settings }) => (
  <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-4">
    <h4 className="font-semibold text-blue-400">Add New MCP Server</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
        <input
          type="text"
          value={newServer.name}
          onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          placeholder="myServer"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Command</label>
        <input
          type="text"
          value={newServer.command}
          onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
          placeholder="uv"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Arguments (shell syntax)</label>
        <input
          type="text"
          value={newServer.args}
          onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
          placeholder='--directory "/path/with spaces" run server.py'
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
        />
        <p className="text-xs text-gray-400 mt-1">
          Use shell syntax (quote arguments with spaces or commas, e.g. <code>"arg,with,comma"</code>)
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Working Directory</label>
        <input
          type="text"
          value={newServer.cwd}
          onChange={(e) => setNewServer({ ...newServer, cwd: e.target.value })}
          placeholder={settings.baseFolderPath || "./mcp_servers/python"}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
        />
        <p className="text-xs text-gray-400 mt-1">
          Defaults to Base Allowed Folder if not specified
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={newServer.timeout}
          onChange={(e) => setNewServer({ ...newServer, timeout: parseInt(e.target.value) || 600000 })}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Environment Variables (JSON)</label>
      <textarea
        value={newServer.env}
        onChange={(e) => setNewServer({ ...newServer, env: e.target.value })}
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
        onChange={(e) => setNewServer({ ...newServer, trust: e.target.checked })}
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
);

// MCP Servers Component
// Exporting for testing purposes
export const MCPServers = ({ settings, setSettings, api, showToast }) => {
  const [editingServer, setEditingServer] = useState(null);
  const [showTranslator, setShowTranslator] = useState(false);
  const [serverConnections, setServerConnections] = useState({});
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

    let envVars = {};
    if (newServer.env && newServer.env.trim()) {
      try {
        envVars = JSON.parse(newServer.env);
      } catch (error) {
        showToast('Invalid JSON in Environment Variables field. Please check your syntax.', 'error');
        return;
      }
    }

    // Default working directory to base allowed folder if not specified
    const defaultCwd = newServer.cwd || settings.baseFolderPath || undefined;

    const serverConfig = {
      command: newServer.command,
      // Use string-argv for robust argument parsing (handles quoted strings and spaces)
      args: newServer.args ? parseArgsStringToArgv(newServer.args) : [],
      cwd: defaultCwd,
      timeout: newServer.timeout,
      trust: newServer.trust,
      env: envVars
    };

    setSettings(prevSettings => ({
      ...prevSettings,
      mcpServers: {
        ...prevSettings.mcpServers,
        [newServer.name]: serverConfig
      }
    }));

    // Initialize connection state
    setServerConnections(prev => ({
      ...prev,
      [newServer.name]: { connected: false, connecting: false }
    }));

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

    // Show success notification
    showToast(`MCP server "${newServer.name}" added successfully!`, 'success');
  };

  const removeServer = (serverName) => {
    setSettings(prevSettings => {
      const newServers = { ...prevSettings.mcpServers };
      delete newServers[serverName];
      return { ...prevSettings, mcpServers: newServers };
    });

    // Remove connection state
    setServerConnections(prev => {
      const newConnections = { ...prev };
      delete newConnections[serverName];
      return newConnections;
    });

    // Show success notification
    showToast(`MCP server "${serverName}" removed successfully!`, 'success');
  };

  // Toggle server trust setting
  const toggleServerTrust = (serverName) => {
    const currentTrust = settings.mcpServers[serverName]?.trust ?? false;
    const newTrustState = !currentTrust;

    setSettings(prevSettings => ({
      ...prevSettings,
      mcpServers: {
        ...prevSettings.mcpServers,
        [serverName]: {
          ...prevSettings.mcpServers[serverName],
          trust: newTrustState
        }
      }
    }));

    showToast(`MCP server "${serverName}" ${newTrustState ? 'trusted' : 'untrusted'}`, 'success');
  };

  // Toggle server connection (through Gemini CLI)
  const toggleServerConnection = async (serverName) => {
    const currentState = serverConnections[serverName];

    if (currentState?.connected) {
      // Disable server in Gemini CLI config
      setServerConnections(prev => ({
        ...prev,
        [serverName]: { connected: false, connecting: false }
      }));
      showToast(`Disabled "${serverName}" in Gemini CLI config`, 'info');
    } else {
      // Enable server in Gemini CLI config
      setServerConnections(prev => ({
        ...prev,
        [serverName]: { connected: true, connecting: false }
      }));
      showToast(`Enabled "${serverName}" in Gemini CLI config`, 'success');
    }
  };

  // Check Gemini CLI MCP status
  const loadServerStatuses = async () => {
    // For now, just check if servers are configured
    const statuses = {};
    Object.keys(settings.mcpServers || {}).forEach(serverName => {
      statuses[serverName] = serverConnections[serverName] || { connected: false, connecting: false };
    });
    setServerConnections(statuses);
  };

  // Load statuses on mount and when mcpServers changes
  useEffect(() => {
    loadServerStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(settings.mcpServers).join(',')]);

  const handleTranslatedConfig = (geminiConfig) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      mcpServers: {
        ...prevSettings.mcpServers,
        ...geminiConfig
      }
    }));
    setShowTranslator(false);
  };

  const importMcpConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const config = await readJsonFile(file); // Use the new utility

          // Handle different config formats
          let mcpServersToImport = {};

          if (config.mcpServers) {
            // Gemini CLI format
            mcpServersToImport = config.mcpServers;
          } else if (config.settings && config.settings.mcpServers) {
            // Full config export format
            mcpServersToImport = config.settings.mcpServers;
          } else {
            // Standard MCP format - translate it
            for (const [name, serverConfig] of Object.entries(config)) {
              mcpServersToImport[name] = {
                command: serverConfig.command,
                args: serverConfig.args || [],
                env: serverConfig.env || {},
                cwd: serverConfig.cwd || undefined,
                timeout: serverConfig.timeout || 600000,
                trust: serverConfig.trust || false
              };
            }
          }

          // Merge with existing servers
          setSettings(prevSettings => ({
            ...prevSettings,
            mcpServers: {
              ...prevSettings.mcpServers,
              ...mcpServersToImport // Use the processed servers
            }
          }));

          showToast(`Successfully imported ${Object.keys(mcpServersToImport).length} MCP server(s)!`, 'success');
        } catch (error) {
          showToast(`Failed to import MCP configuration: ${error.message}`, 'error');
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">MCP Server Configurations</h3>
        <div className="flex gap-2">
          <button
            onClick={importMcpConfig}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Icon name="Upload" className="w-4 h-4" />
            Import Config
          </button>
          <button
            onClick={() => setShowTranslator(!showTranslator)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Icon name="FileEdit" className="w-4 h-4" />
            Config Translator
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
        <AddMcpServerForm
          newServer={newServer}
          setNewServer={setNewServer}
          addServer={addServer}
          setEditingServer={setEditingServer}
          settings={settings}
        />
      )}

      <div className="space-y-4">
        {Object.entries(settings.mcpServers || {}).map(([name, config]) => {
          const connectionState = serverConnections[name] || { connected: false, connecting: false };

          return (
            <div key={name} className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-blue-400">{name}</h4>

                  {/* Configuration Status Indicator */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    connectionState.connected ? 'bg-green-900/20 text-green-400' : 'bg-gray-700/50 text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionState.connected ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    <span>
                      {connectionState.connected ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Trust Toggle */}
                  <button
                    onClick={() => toggleServerTrust(name)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      config.trust
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                    }`}
                    title={config.trust ? 'Click to untrust' : 'Click to trust'}
                  >
                    {config.trust ? '🔓' : '🔒'}
                    {config.trust ? 'Trusted' : 'Untrusted'}
                  </button>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => toggleServerConnection(name)}
                    disabled={connectionState.connecting}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      connectionState.connected
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                    }`}
                  >
                    {connectionState.connected ? (
                      <>
                        <Check className="w-3 h-3" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Disabled
                      </>
                    )}
                  </button>

                  {/* Remove Server */}
                  <button
                    onClick={() => removeServer(name)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                    title="Remove server"
                  >
                    <Icon name="Trash2" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <p><span className="text-gray-400">Command:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.command}</code></p>
                {config.args?.length > 0 && (
                  <p><span className="text-gray-400">Args:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.args.join(' ')}</code></p>
                )}
                {config.cwd && (
                  <p><span className="text-gray-400">Working Dir:</span> <code className="bg-gray-700 px-2 py-1 rounded">{config.cwd}</code></p>
                )}
                <p><span className="text-gray-400">Timeout:</span> {config.timeout}ms</p>
                {Object.keys(config.env || {}).length > 0 && (
                  <p><span className="text-gray-400">Environment:</span> <code className="bg-gray-700 px-2 py-1 rounded text-xs">{JSON.stringify(config.env)}</code></p>
                )}
              </div>
            </div>
          );
        })}
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
      // Backend expects `env`, not `envVars` in the body for the .env file content
      body: JSON.stringify({ projectPath, settings, env: envVars })
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
  GOOGLE_API_KEY: "",
  GOOGLE_CLOUD_PROJECT: "",
  GOOGLE_CLOUD_LOCATION: "",
  GOOGLE_GENAI_USE_VERTEXAI: "false",
  GOOGLE_APPLICATION_CREDENTIALS: ""
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
                    {/* {project.hasGeminiConfig && (
                      // This badge is removed as its meaning is unclear without the context of the removed Projects tab.
                      // Configuration (settings.json) is loaded when a project is selected.
                      <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                        Configured
                      </span>
                    )} */}
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

  // Enhanced autosave state management
  const [autoSaveStatus, setAutoSaveStatus] = useState({
    status: 'idle', // 'idle', 'saving', 'saved', 'error'
    lastSaved: null,
    error: null
  });

  // Toast notification state for user feedback
  const [toastNotification, setToastNotification] = useState({
    show: false,
    message: '',
    type: 'info' // 'info', 'success', 'error'
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [envVars, setEnvVars] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-env');
    return saved ? { ...defaultEnvVars, ...JSON.parse(saved) } : defaultEnvVars;
  });

  // Toast notification function
  const showToast = (message, type = 'info') => {
    setToastNotification({ show: true, message, type });
    setTimeout(() => {
      setToastNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

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

  const handleProjectChange = async (projectPath, config) => {
    if (config?.settings) {
      setSettings(prev => ({ ...prev, ...config.settings }));
    }
    // Backend sends `config.env`, frontend state is `envVars`
    if (config?.env) {
      setEnvVars(prev => ({ ...prev, ...config.env }));
    }
  };

  // Enhanced Auto-save settings with visual feedback
  useEffect(() => {
    // Save to localStorage immediately
    localStorage.setItem('gemini-cli-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Save to localStorage immediately
    localStorage.setItem('gemini-cli-env', JSON.stringify(envVars));
  }, [envVars]);

  // Enhanced Auto-save settings to project when they change
  useEffect(() => {
    const autoSave = async () => {
      if (currentProject && settings && envVars) {
        setAutoSaveStatus(prev => ({ ...prev, status: 'saving' }));

        try {
          await api.saveConfig(currentProject, settings, envVars);
          setAutoSaveStatus({
            status: 'saved',
            lastSaved: new Date(),
            error: null
          });
          console.log('Configuration auto-saved to project:', currentProject);

          // Reset status after 3 seconds
          setTimeout(() => {
            setAutoSaveStatus(prev => ({ ...prev, status: 'idle' }));
          }, 3000);

        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus({
            status: 'error',
            lastSaved: null,
            error: error.message
          });

          // Show toast notification for error
          showToast(`Auto-save failed: ${error.message}`, 'error');

          // Try to retry after 5 seconds
          setTimeout(async () => {
            try {
              await api.saveConfig(currentProject, settings, envVars);
              setAutoSaveStatus({
                status: 'saved',
                lastSaved: new Date(),
                error: null
              });
              showToast('Configuration auto-saved successfully (retry)', 'success');
              setTimeout(() => {
                setAutoSaveStatus(prev => ({ ...prev, status: 'idle' }));
              }, 3000);
            } catch (retryError) {
              console.error('Auto-save retry failed:', retryError);
              showToast('Auto-save retry failed. Please save manually.', 'error');
            }
          }, 5000);
        }
      }
    };

    // Debounce auto-save to avoid excessive API calls
    const timeoutId = setTimeout(autoSave, 1000);
    return () => clearTimeout(timeoutId);
  }, [settings, envVars, currentProject]);

  const saveToProject = async () => {
    if (!currentProject) {
      showToast('Please select a project first', 'error');
      return;
    }

    setAutoSaveStatus(prev => ({ ...prev, status: 'saving' }));

    try {
      await api.saveConfig(currentProject, settings, envVars);
      setAutoSaveStatus({
        status: 'saved',
        lastSaved: new Date(),
        error: null
      });
      showToast('Configuration saved successfully to project!', 'success');

      // Reset status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, status: 'idle' }));
      }, 3000);

    } catch (error) {
      setAutoSaveStatus({
        status: 'error',
        lastSaved: null,
        error: error.message
      });
      showToast(`Failed to save: ${error.message}`, 'error');
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
          showToast('Configuration imported successfully!', 'success');
        } catch (error) {
          showToast(`Failed to import: ${error.message}`, 'error');
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

      // case 'projects': // Removed as per user request
      //   return (
      //     <ProjectManagementTab
      //       currentProject={currentProject}
      //       setCurrentProject={setCurrentProject}
      //       onProjectChange={handleProjectChange}
      //       api={api}
      //       showToast={showToast}
      //     />
      //   );

      case 'tools':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6">Tools & MCP Configuration</h2>
              <MCPServers settings={settings} setSettings={setSettings} api={api} showToast={showToast} />
            </div>
          </div>
        );

      case 'authentication':
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">Authentication Configuration</h2>

              {/* Primary API Key Section */}
              <div className={`${colors.glass} rounded-xl p-6 space-y-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-blue-400">Primary Authentication</h3>
                </div>

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
              </div>

              {/* Google Cloud / Vertex AI Section */}
              <div className={`${colors.glass} rounded-xl p-6 space-y-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Cloud className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-purple-400">Google Cloud / Vertex AI Authentication</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Configure these settings if you're using Google Workspace accounts, Vertex AI, or need Google Cloud project access.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google Cloud Project ID
                    </label>
                    <input
                      type="text"
                      value={envVars.GOOGLE_CLOUD_PROJECT}
                      onChange={(e) => setEnvVars({...envVars, GOOGLE_CLOUD_PROJECT: e.target.value})}
                      placeholder="your-project-id"
                      className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google Cloud Location
                    </label>
                    <input
                      type="text"
                      value={envVars.GOOGLE_CLOUD_LOCATION}
                      onChange={(e) => setEnvVars({...envVars, GOOGLE_CLOUD_LOCATION: e.target.value})}
                      placeholder="us-central1"
                      className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Use Vertex AI
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vertexai"
                        checked={envVars.GOOGLE_GENAI_USE_VERTEXAI === "true"}
                        onChange={() => setEnvVars({...envVars, GOOGLE_GENAI_USE_VERTEXAI: "true"})}
                        className="text-blue-500"
                      />
                      <span className="text-sm text-gray-300">Enable Vertex AI</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vertexai"
                        checked={envVars.GOOGLE_GENAI_USE_VERTEXAI === "false"}
                        onChange={() => setEnvVars({...envVars, GOOGLE_GENAI_USE_VERTEXAI: "false"})}
                        className="text-blue-500"
                      />
                      <span className="text-sm text-gray-300">Use Gemini API</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google API Key (Vertex AI Express Mode)
                  </label>
                  <input
                    type="password"
                    value={envVars.GOOGLE_API_KEY}
                    onChange={(e) => setEnvVars({...envVars, GOOGLE_API_KEY: e.target.value})}
                    placeholder="Enter Google API key for Vertex AI"
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-400 mt-1">Only needed for Vertex AI express mode</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Application Credentials Path
                  </label>
                  <input
                    type="text"
                    value={envVars.GOOGLE_APPLICATION_CREDENTIALS}
                    onChange={(e) => setEnvVars({...envVars, GOOGLE_APPLICATION_CREDENTIALS: e.target.value})}
                    placeholder="/path/to/your/credentials.json"
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-400 mt-1">Path to your service account credentials JSON file</p>
                </div>
              </div>

              {/* Authentication Help Section */}
              <div className={`${colors.glass} rounded-xl p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-green-400">Authentication Guide</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-300">
                  <div>
                    <h4 className="font-medium text-white mb-1">For most users:</h4>
                    <p>Just set your <strong>Gemini API Key</strong> from Google AI Studio. This is the simplest setup.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">For Google Workspace users:</h4>
                    <p>You may need to set <strong>Google Cloud Project ID</strong> if you get authentication errors.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1">For Vertex AI users:</h4>
                    <p>Enable <strong>Use Vertex AI</strong> and configure your project ID and location. For non-express mode, also set up Application Default Credentials with <code className="bg-gray-800 px-1 rounded">gcloud auth application-default login</code></p>
                  </div>
                </div>
              </div>

              {/* Auto-save Status */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  🔄 Authentication settings are automatically saved as you type
                </p>
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Base Allowed Folder</label>
                  <input
                    type="text"
                    value={settings.baseFolderPath || ''}
                    onChange={(e) => setSettings({...settings, baseFolderPath: e.target.value})}
                    placeholder="/home/ty/Repositories"
                    className="w-full bg-gray-900/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Default folder for projects and MCP server working directories. Leave empty to allow all paths.
                  </p>
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

              {/* Configuration Management */}
              <div className={`${colors.glass} rounded-xl p-6`}>
                <h3 className="text-lg font-semibold text-white mb-4">Configuration Management</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={saveToProject}
                    disabled={!currentProject}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save to Project
                  </button>

                  {/* Force Save button - shows when autosave fails */}
                  {autoSaveStatus.status === 'error' && currentProject && (
                    <button
                      onClick={saveToProject}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors animate-pulse"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Force Save
                    </button>
                  )}

                  <button
                    onClick={exportConfig}
                    className={`flex items-center gap-2 ${colors.glass} hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                  >
                    <Download className="w-4 h-4" />
                    Export Config
                  </button>

                  <button
                    onClick={importConfig}
                    className={`flex items-center gap-2 ${colors.glass} hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                  >
                    <Upload className="w-4 h-4" />
                    Import Config
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  {currentProject
                    ? `Configuration will be saved to: ${currentProject}/.gemini/settings.json`
                    : 'Select a project to save configuration'
                  }
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    Settings auto-save to the current project when changed (1s delay)
                  </p>
                  {autoSaveStatus.error && (
                    <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                      {autoSaveStatus.error}
                    </span>
                  )}
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

              {/* Auto-save Status */}
              {currentProject && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  autoSaveStatus.status === 'saving' ? 'bg-blue-900/20 text-blue-400' :
                  autoSaveStatus.status === 'saved' ? 'bg-green-900/20 text-green-400' :
                  autoSaveStatus.status === 'error' ? 'bg-red-900/20 text-red-400' :
                  `${colors.glass} text-gray-400`
                }`}>
                  {autoSaveStatus.status === 'saving' && (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      <span className="text-xs font-medium">Saving...</span>
                    </>
                  )}
                  {autoSaveStatus.status === 'saved' && (
                    <>
                      <Check className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        Saved {autoSaveStatus.lastSaved ? new Date(autoSaveStatus.lastSaved).toLocaleTimeString() : ''}
                      </span>
                    </>
                  )}
                  {autoSaveStatus.status === 'error' && (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs font-medium">Save Failed</span>
                    </>
                  )}
                  {autoSaveStatus.status === 'idle' && autoSaveStatus.lastSaved && (
                    <>
                      <Check className="w-3 h-3 opacity-50" />
                      <span className="text-xs font-medium opacity-75">Auto-save</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Removed redundant Save Config buttons - now only in Settings tab */}
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>

      {/* Toast Notification */}
      {toastNotification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toastNotification.type === 'success' ? 'bg-green-900/90 border border-green-700/50 text-green-200' :
          toastNotification.type === 'error' ? 'bg-red-900/90 border border-red-700/50 text-red-200' :
          'bg-blue-900/90 border border-blue-700/50 text-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            {toastNotification.type === 'success' && <Check className="w-5 h-5 text-green-400" />}
            {toastNotification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toastNotification.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            <p className="text-sm font-medium">{toastNotification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;