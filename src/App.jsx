import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Settings,
  Wrench,
  Server,
  FileCode,
  Info,
  ChevronRight,
  Save,
  Copy,
  Check,
  Trash2,
  PlusCircle,
  KeyRound,
  Terminal,
  Download,
  Upload,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  RefreshCw,
  Home,
  FolderOpen,
  Cpu,
  Zap,
  DollarSign,
  Send,
  ArrowRight,
  History,
  ChevronLeft,
  Search,
  FileText,
  AtSign,
  Hash,
  Command,
  X,
  Loader
} from 'lucide-react';

// API Configuration
const API_BASE = import.meta.env.VITE_BACKEND_PORT 
  ? `http://localhost:${import.meta.env.VITE_BACKEND_PORT}/api`
  : 'http://localhost:3001/api';
// Icon component
const Icon = ({ name, className = "w-4 h-4" }) => {
  const icons = {
    Settings, Wrench, Server, FileCode, Info, ChevronRight, Save, Copy, Check,
    Trash2, PlusCircle, KeyRound, Terminal, Download, Upload, AlertCircle,
    ExternalLink, Eye, EyeOff, FileEdit, RefreshCw, Home, FolderOpen, Cpu, Zap, 
    DollarSign, Send, ArrowRight, History, ChevronLeft, Search, FileText, AtSign,
    Hash, Command, X, Loader
  };
  const LucideIcon = icons[name];
  return LucideIcon ? <LucideIcon className={className} /> : null;
};

// Default settings based on official Gemini CLI documentation
const defaultSettings = {
  theme: "Default",
  contextFileName: "GEMINI.md",
  selectedModel: "gemini-2.0-flash-exp", // Updated default model
  baseFolderPath: "/home/ty/Repositories",
  autoAccept: false,
  sandbox: false,
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
    otlpEndpoint: "http://localhost:4317",
    logPrompts: true
  },
  usageStatisticsEnabled: true
};

// Environment variables template
const defaultEnvVars = {
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  GOOGLE_CLOUD_PROJECT: "",
  GOOGLE_CLOUD_LOCATION: "us-central1",
  GOOGLE_GENAI_USE_VERTEXAI: "false"
};

// API helper functions
const api = {
  async getProjects() {
    const response = await fetch(`${API_BASE}/projects`);
    return response.json();
  },
  
  async saveConfig(projectPath, settings, envVars) {
    const response = await fetch(`${API_BASE}/config/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, settings, envVars })
    });
    return response.json();
  },
  
  async loadConfig(projectPath) {
    const response = await fetch(`${API_BASE}/config/load?projectPath=${encodeURIComponent(projectPath)}`);
    return response.json();
  },
  
  async translateMcpConfig(standardConfig) {
    const response = await fetch(`${API_BASE}/mcp/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardConfig })
    });
    return response.json();
  },
  
  async getChatHistory(projectPath) {
    const response = await fetch(`${API_BASE}/chat/history?projectPath=${encodeURIComponent(projectPath)}`);
    return response.json();
  },
  
  async saveChatMessage(projectPath, message) {
    const response = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, message })
    });
    return response.json();
  },
  
  async executeCommand(projectPath, command, settings, envVars) {
    const response = await fetch(`${API_BASE}/cli/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, command, settings, envVars })
    });
    return response.json();
  },
  
  async createCliSession(projectPath, envVars) {
    const response = await fetch(`${API_BASE}/cli/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, envVars })
    });
    return response.json();
  }
};
// Improved Project Selector Component with Dropdown
const ProjectSelector = ({ currentProject, setCurrentProject, onProjectChange }) => {
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
    
    // Load project configuration
    if (onProjectChange) {
      const config = await api.loadConfig(project.path);
      onProjectChange(project.path, config);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="FolderOpen" className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-200 truncate max-w-[200px]">
            {currentProject ? currentProject.split('/').pop() : 'Select Project'}
          </span>
        </div>
        <Icon name={showDropdown ? "ChevronUp" : "ChevronDown"} className="w-4 h-4 text-gray-400" />
      </button>

      {showDropdown && (
        <div className="absolute top-full mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
          {loading ? (
            <div className="p-4 text-center">
              <Icon name="Loader" className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No projects found
            </div>
          ) : (
            projects.map((project, index) => (
              <button
                key={index}
                onClick={() => selectProject(project)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="FolderOpen" className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-200">{project.name}</span>
                  </div>
                  {project.hasGeminiConfig && (
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                      Configured
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 ml-6 truncate">
                  {project.path}
                </div>
              </button>
            ))
          )}
          
          <button
            onClick={() => loadProjects()}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-t border-gray-700"
          >
            <div className="flex items-center gap-2">
              <Icon name="RefreshCw" className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">Refresh Projects</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
// MCP Configuration Translator Component
const McpConfigTranslator = ({ onTranslate }) => {
  const [standardConfig, setStandardConfig] = useState('');
  const [translatedConfig, setTranslatedConfig] = useState('');
  const [error, setError] = useState('');

  const exampleConfig = `{
  "sqlite": {
    "command": "uv",
    "args": [
      "--directory",
      "/home/ty/Repositories/servers/src/sqlite",
      "run",
      "mcp-server-sqlite",
      "--db-path",
      "/home/ty/Repositories/ai_workspace/algorithm_platform/data/algo.db"
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
      const result = await api.translateMcpConfig(config);
      setTranslatedConfig(JSON.stringify(result.geminiConfig, null, 2));
      if (onTranslate) {
        onTranslate(result.geminiConfig);
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
// Enhanced Chat Interface with full feature support
const ChatInterface = ({ settings, setSettings, envVars, currentProject, setCurrentProject }) => {
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);
  const [workingFolders, setWorkingFolders] = useState([currentProject]);
  const inputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  // Available commands
  const commands = [
    { cmd: '/help', desc: 'Display help information' },
    { cmd: '/tools', desc: 'List available tools' },
    { cmd: '/mcp', desc: 'List MCP servers and tools' },
    { cmd: '/memory', desc: 'Manage AI instructional context' },
    { cmd: '/stats', desc: 'Display session statistics' },
    { cmd: '/clear', desc: 'Clear the terminal screen' },
    { cmd: '/compress', desc: 'Compress chat context' },
    { cmd: '/theme', desc: 'Change visual theme' },
    { cmd: '/chat save <tag>', desc: 'Save conversation state' },
    { cmd: '/chat resume <tag>', desc: 'Resume conversation' },
    { cmd: '@<path>', desc: 'Include file/directory content' },
    { cmd: '!<command>', desc: 'Execute shell command' }
  ];

  // Load chat history on mount and project change
  useEffect(() => {
    loadChatHistory();
  }, [currentProject]);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const loadChatHistory = async () => {
    try {
      const result = await api.getChatHistory(currentProject);
      setChatHistory(result.history || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    // Get cursor position to check what was just typed
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Check for @ command (file selector)
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/);
    if (atMatch) {
      setShowFileSelector(true);
      setFileSearch(atMatch[1] || '');
      setShowCommandMenu(false);
    } else {
      setShowFileSelector(false);
    }

    // Check for / command (command menu)
    const slashMatch = textBeforeCursor.match(/^\/([^\s]*)$/);
    if (slashMatch) {
      setShowCommandMenu(true);
      setCommandSearch(slashMatch[1] || '');
      setShowFileSelector(false);
    } else if (!atMatch) {
      setShowCommandMenu(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp' && input === '') {
      // Navigate chat history
      e.preventDefault();
      if (selectedHistoryIndex < chatHistory.length - 1) {
        const newIndex = selectedHistoryIndex + 1;
        setSelectedHistoryIndex(newIndex);
        const historyItem = chatHistory[chatHistory.length - 1 - newIndex];
        if (historyItem && historyItem.type === 'user') {
          setInput(historyItem.content);
        }
      }
    } else if (e.key === 'ArrowDown' && selectedHistoryIndex >= 0) {
      e.preventDefault();
      if (selectedHistoryIndex > 0) {
        const newIndex = selectedHistoryIndex - 1;
        setSelectedHistoryIndex(newIndex);
        const historyItem = chatHistory[chatHistory.length - 1 - newIndex];
        if (historyItem && historyItem.type === 'user') {
          setInput(historyItem.content);
        }
      } else {
        setSelectedHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab' && showCommandMenu) {
      e.preventDefault();
      const filtered = commands.filter(cmd => 
        cmd.cmd.toLowerCase().includes(commandSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        setInput(filtered[0].cmd + ' ');
        setShowCommandMenu(false);
      }
    }
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowCommandMenu(false);
    setSelectedHistoryIndex(-1);

    // Save to history
    await api.saveChatMessage(currentProject, userMessage);

    try {
      const result = await api.executeCommand(currentProject, messageText, settings, envVars);

      if (result.success) {
        const aiResponse = {
          type: 'assistant',
          content: result.output || 'Command completed successfully',
          timestamp: new Date().toISOString()
        };
        setConversation(prev => [...prev, aiResponse]);
        
        // Save AI response to history
        await api.saveChatMessage(currentProject, aiResponse);
        
        // Reload history
        loadChatHistory();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorResponse = {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCommand = (cmd) => {
    setInput(cmd + ' ');
    setShowCommandMenu(false);
    inputRef.current?.focus();
  };

  const selectFile = (filePath) => {
    // Replace the @search part with the selected file
    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = input.substring(0, cursorPos);
    const textAfterCursor = input.substring(cursorPos);
    
    const atMatch = textBeforeCursor.match(/(.*)@[^\s]*$/);
    if (atMatch) {
      const newInput = atMatch[1] + '@' + filePath + ' ' + textAfterCursor;
      setInput(newInput);
      setShowFileSelector(false);
      
      // Set cursor position after the inserted file path
      setTimeout(() => {
        const newPos = atMatch[1].length + filePath.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }, 0);
    }
  };

  const addWorkingFolder = (folder) => {
    if (!workingFolders.includes(folder)) {
      setWorkingFolders([...workingFolders, folder]);
    }
    setCurrentProject(folder);
  };

  const removeWorkingFolder = (folder) => {
    const newFolders = workingFolders.filter(f => f !== folder);
    setWorkingFolders(newFolders);
    if (currentProject === folder && newFolders.length > 0) {
      setCurrentProject(newFolders[0]);
    }
  };

  const loadHistoryConversation = (messages) => {
    setConversation(messages);
    setShowHistory(false);
  };

  const clearConversation = () => {
    setConversation([]);
    setSelectedHistoryIndex(-1);
  };

  // Render message with proper formatting
  const renderMessage = (message) => {
    if (message.type === 'user') {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    // For assistant messages, use markdown rendering
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Chat History Sidebar */}
      <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-800/50 border-r border-gray-700 overflow-hidden`}>
        <div className="p-4">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Icon name="History" className="w-4 h-4" />
            Chat History
          </h3>
          
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No history yet</p>
            ) : (
              // Group messages by conversation
              chatHistory.reduce((groups, message, index) => {
                if (message.type === 'user') {
                  groups.push([message]);
                } else if (groups.length > 0) {
                  groups[groups.length - 1].push(message);
                }
                return groups;
              }, []).map((group, index) => (
                <button
                  key={index}
                  onClick={() => loadHistoryConversation(group)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="text-sm text-gray-300 truncate">
                    {group[0].content}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(group[0].timestamp).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Icon name={showHistory ? "ChevronLeft" : "ChevronRight"} className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">Gemini CLI</h2>
            </div>
            <button
              onClick={clearConversation}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
            >
              <Icon name="RefreshCw" className="w-5 h-5" />
            </button>
          </div>
          
          {/* Working Folders */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Working folders:</span>
            {workingFolders.map((folder, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  folder === currentProject 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                }`}
                onClick={() => folder !== currentProject && setCurrentProject(folder)}
              >
                <Icon name="FolderOpen" className="w-3 h-3" />
                <span>{folder.split('/').pop()}</span>
                {workingFolders.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWorkingFolder(folder);
                    }}
                    className="ml-1 hover:text-red-400"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const newFolder = prompt('Enter folder path:');
                if (newFolder) addWorkingFolder(newFolder);
              }}
              className="text-green-400 hover:text-green-300"
              title="Add working folder"
            >
              <Icon name="PlusCircle" className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {conversation.length === 0 && (
              <div className="text-center py-20">
                <h2 className="text-3xl font-light text-gray-300 mb-4">
                  Ready to assist with your development
                </h2>
                <p className="text-gray-500">
                  Type a message or use / for commands, @ for files
                </p>
              </div>
            )}

            {conversation.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type !== 'user' && (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'error' ? 'bg-red-600' : 'bg-gradient-to-r from-pink-500 to-violet-600'
                  }`}>
                    <Icon name={message.type === 'error' ? 'AlertCircle' : 'Terminal'} className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className={`max-w-2xl rounded-2xl p-4 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : message.type === 'error'
                      ? 'bg-red-600/20 border border-red-600/50 text-red-200'
                      : 'bg-slate-800/80 backdrop-blur-sm text-slate-100 border border-slate-700'
                }`}>
                  {renderMessage(message)}
                  <div className="text-xs opacity-70 mt-3">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">U</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Loader" className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                  <div className="text-slate-300">Processing...</div>
                </div>
              </div>
            )}

            <div ref={endOfMessagesRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-6">
          <div className="max-w-4xl mx-auto relative">
            {/* Command Menu */}
            {showCommandMenu && (
              <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {commands
                  .filter(cmd => cmd.cmd.toLowerCase().includes(commandSearch.toLowerCase()))
                  .map((cmd, index) => (
                    <button
                      key={index}
                      onClick={() => selectCommand(cmd.cmd)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex justify-between items-center"
                    >
                      <span className="text-sm font-mono text-blue-400">{cmd.cmd}</span>
                      <span className="text-xs text-gray-400">{cmd.desc}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* File Selector */}
            <FileSelector
              show={showFileSelector}
              currentPath={currentProject}
              basePath={settings.baseFolderPath}
              searchQuery={fileSearch}
              onSelect={selectFile}
              onClose={() => setShowFileSelector(false)}
            />

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message, / for commands, @ for files..."
                disabled={isLoading}
                className="w-full p-4 outline-none resize-none text-slate-800 placeholder-slate-500 disabled:opacity-50 bg-transparent"
                rows="3"
              />
              
              <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{input.length}/4000</span>
                  <div className="flex gap-2">
                    <Icon name="AtSign" className="w-4 h-4" title="@ for files" />
                    <Icon name="Hash" className="w-4 h-4" title="/ for commands" />
                    <Icon name="Command" className="w-4 h-4" title="! for shell" />
                  </div>
                </div>
                
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 rounded-full text-white px-6 py-2 transition-all flex items-center gap-2"
                >
                  <Icon name="Send" className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
// Enhanced MCP Servers Component with Translation
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
        {Object.entries(settings.mcpServers).map(([name, config]) => (
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
// Authentication Tab Component
const AuthenticationTab = ({ envVars, setEnvVars }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [authMethod, setAuthMethod] = useState(
    envVars.GEMINI_API_KEY ? 'api-key' : 
    envVars.GOOGLE_CLOUD_PROJECT ? 'cloud-project' : 
    'api-key'
  );

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold mb-6">Authentication Configuration</h2>
        
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            Configure authentication for Gemini CLI. Choose between API Key or Google Cloud Project.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setAuthMethod('api-key')}
              className={`flex-1 py-2 rounded-md transition-colors ${
                authMethod === 'api-key' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              API Key
            </button>
            <button
              onClick={() => setAuthMethod('cloud-project')}
              className={`flex-1 py-2 rounded-md transition-colors ${
                authMethod === 'cloud-project' ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              Google Cloud Project
            </button>
          </div>

          {authMethod === 'api-key' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={envVars.GEMINI_API_KEY}
                    onChange={(e) => setEnvVars({...envVars, GEMINI_API_KEY: e.target.value})}
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <Icon name={showApiKey ? "EyeOff" : "Eye"} />
                  </button>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Get your API key from Google AI Studio
                  <Icon name="ExternalLink" className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {authMethod === 'cloud-project' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Google Cloud Project ID
                </label>
                <input
                  type="text"
                  value={envVars.GOOGLE_CLOUD_PROJECT}
                  onChange={(e) => setEnvVars({...envVars, GOOGLE_CLOUD_PROJECT: e.target.value})}
                  placeholder="your-project-id"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
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
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tools and MCP Tab
const ToolsAndMCPTab = ({ settings, setSettings }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Tools & MCP Configuration</h2>
        <MCPServers settings={settings} setSettings={setSettings} />
      </div>
    </div>
  );
};

// Settings Tab
const SettingsTab = ({ settings, setSettings }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold mb-6">General Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base Folder Path</label>
            <input
              type="text"
              value={settings.baseFolderPath || '/home/ty/Repositories'}
              onChange={(e) => setSettings({...settings, baseFolderPath: e.target.value})}
              placeholder="/home/ty/Repositories"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Default starting directory for file selection</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value})}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="Default">Default</option>
              <option value="GitHub">GitHub</option>
              <option value="Minimal">Minimal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Context File Name</label>
            <input
              type="text"
              value={settings.contextFileName}
              onChange={(e) => setSettings({...settings, contextFileName: e.target.value})}
              placeholder="GEMINI.md"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
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

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
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

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
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
};

// About Tab
const AboutTab = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold mb-6">About Gemini Workstation</h2>
        
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Gemini CLI Web Interface</h3>
          <p className="text-gray-300 mb-4">
            A comprehensive web interface for Google's Gemini CLI, providing an intuitive way to configure
            and interact with the Gemini AI model.
          </p>
          
          <div className="space-y-2 text-sm text-gray-400">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Backend Port:</strong> 3001</p>
            <p><strong>Features:</strong></p>
            <ul className="list-disc list-inside ml-4">
              <li>Full CLI command support (/, @, !)</li>
              <li>Chat history with sidebar navigation</li>
              <li>Project-based configuration management</li>
              <li>MCP server configuration with translation</li>
              <li>Real-time command execution</li>
              <li>Markdown rendering with syntax highlighting</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            For more information about Gemini CLI, visit the{' '}
            <a 
              href="https://github.com/google/gemini-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              official documentation
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};
// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [currentProject, setCurrentProject] = useState('/home/ty/Repositories/ai_workspace');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [envVars, setEnvVars] = useState(() => {
    const saved = localStorage.getItem('gemini-cli-env');
    return saved ? JSON.parse(saved) : defaultEnvVars;
  });

  // Auto-save settings
  useEffect(() => {
    localStorage.setItem('gemini-cli-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gemini-cli-env', JSON.stringify(envVars));
  }, [envVars]);

  const handleProjectChange = async (projectPath, config) => {
    if (config.settings) {
      setSettings(config.settings);
    }
    if (config.envVars) {
      setEnvVars({...defaultEnvVars, ...config.envVars});
    }
  };

  const saveToProject = async () => {
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
      timestamp: new Date().toISOString()
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
        const text = await file.text();
        const config = JSON.parse(text);
        if (config.settings) setSettings(config.settings);
        if (config.envVars) setEnvVars(config.envVars);
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'chat', label: 'Chat Interface', icon: 'Terminal' },
    { id: 'auth', label: 'Authentication', icon: 'KeyRound' },
    { id: 'models', label: 'Models', icon: 'Cpu' },
    { id: 'tools', label: 'Tools & MCP', icon: 'Wrench' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
    { id: 'about', label: 'About', icon: 'Info' }
  ];

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Icon name="Terminal" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Gemini CLI</h1>
              <p className="text-xs text-gray-400">Web Interface</p>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="p-4 border-b border-gray-700">
          <ProjectSelector
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            onProjectChange={handleProjectChange}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={saveToProject}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Icon name="Save" className="w-4 h-4" />
            Save to Project
          </button>
          <div className="flex gap-2">
            <button
              onClick={exportConfig}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Icon name="Download" className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={importConfig}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Icon name="Upload" className="w-4 h-4" />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <ChatInterface 
            settings={settings} 
            envVars={envVars} 
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        )}

        {activeTab === 'auth' && (
          <AuthenticationTab envVars={envVars} setEnvVars={setEnvVars} />
        )}

        {activeTab === 'models' && (
          <ModelSelector 
            settings={settings} 
            setSettings={setSettings} 
            envVars={envVars} 
            setEnvVars={setEnvVars} 
          />
        )}

        {activeTab === 'tools' && (
          <ToolsAndMCPTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'about' && (
          <AboutTab />
        )}
      </div>
    </div>
  );
}

export default App;
// Model selector component
const ModelSelector = ({ settings, setSettings, envVars, setEnvVars }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const apiKey = envVars.GEMINI_API_KEY;

  const loadModels = async () => {
    if (!apiKey) {
      setError('API key required to fetch available models');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Filter for generation models and format them
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
          // Sort by model generation (2.5, 2.0, 1.5) and then by type
          const getOrder = (name) => {
            if (name.includes('2.5')) return 1;
            if (name.includes('2.0')) return 2;
            if (name.includes('1.5')) return 3;
            return 4;
          };
          return getOrder(a.id) - getOrder(b.id);
        }) || [];

      setModels(availableModels);
      setLastFetch(new Date());

      // If no model is selected, set the first available model as default
      if (!settings.selectedModel && availableModels.length > 0) {
        const defaultModel = availableModels.find(m => m.id.includes('flash')) || availableModels[0];
        setSettings({ ...settings, selectedModel: defaultModel.id });
        setEnvVars({ ...envVars, GEMINI_MODEL: defaultModel.id });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load models when component mounts and API key is available
  useEffect(() => {
    if (apiKey && !models.length) {
      loadModels();
    }
  }, [apiKey]);

  const handleModelSelect = (modelId) => {
    setSettings({ ...settings, selectedModel: modelId });
    setEnvVars({ ...envVars, GEMINI_MODEL: modelId });
  };

  const getCategoryIcon = (modelId) => {
    if (modelId.includes('pro')) return 'Cpu';
    if (modelId.includes('flash')) return 'Zap';
    if (modelId.includes('lite')) return 'DollarSign';
    return 'Terminal';
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
        <h2 className="text-2xl font-semibold mb-6">Model Selection</h2>
        
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Info" className="text-blue-400" />
            <h3 className="font-semibold text-blue-400">Available Models</h3>
          </div>
          <p className="text-sm text-gray-300">
            Select which Gemini model to use. Models are fetched live from Google's API to ensure you see all current options.
          </p>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gemini Models</h3>
          <button
            onClick={loadModels}
            disabled={loading || !apiKey}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Icon name="RefreshCw" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
              <Icon name="AlertCircle" className="text-red-400" />
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
            <Icon name="RefreshCw" className="w-6 h-6 animate-spin text-blue-400" />
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
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon
                        name={getCategoryIcon(model.id)}
                        className={`w-5 h-5 ${getCategoryColor(model.id)}`}
                      />
                      <h4 className="font-medium text-white">{model.name}</h4>
                      {settings.selectedModel === model.id && (
                        <Icon name="Check" className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{model.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>Input: {typeof model.inputTokenLimit === 'number' ? model.inputTokenLimit.toLocaleString() : model.inputTokenLimit} tokens</span>
                      <span>Output: {typeof model.outputTokenLimit === 'number' ? model.outputTokenLimit.toLocaleString() : model.outputTokenLimit} tokens</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && models.length === 0 && apiKey && (
          <div className="text-center py-8 text-gray-400">
            <p>No models loaded yet.</p>
            <button
              onClick={loadModels}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Load available models
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// Enhanced File Selector Component with @ command support
const FileSelector = ({ onSelect, currentPath, basePath, show, onClose, searchQuery = '' }) => {
  const [files, setFiles] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDir, setCurrentDir] = useState(currentPath || basePath || '/home/ty');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (show) {
      loadDirectory(currentDir);
    }
  }, [show, currentDir]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const loadDirectory = async (path) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/files/list?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setFiles(data.files || []);
      setDirectories(data.directories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';
    setCurrentDir(parentDir);
  };

  const navigateToDir = (dirName) => {
    const newPath = currentDir === '/' ? `/${dirName}` : `${currentDir}/${dirName}`;
    setCurrentDir(newPath);
  };

  const selectFile = (fileName) => {
    const fullPath = currentDir === '/' ? `/${fileName}` : `${currentDir}/${fileName}`;
    onSelect(fullPath);
    onClose();
  };

  const selectDirectory = () => {
    onSelect(currentDir + '/');
    onClose();
  };

  // Filter based on search query
  const filteredFiles = files.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDirs = directories.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!show) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute bottom-full mb-2 left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden z-50"
    >
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Select File or Directory</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={navigateUp}
            className="text-blue-400 hover:text-blue-300"
            disabled={currentDir === '/'}
          >
            <Icon name="ChevronLeft" className="w-4 h-4" />
          </button>
          <span className="text-gray-400 truncate flex-1">{currentDir}</span>
          <button
            onClick={selectDirectory}
            className="text-green-400 hover:text-green-300 px-2 py-1 bg-green-900/20 rounded"
          >
            Select Dir
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-64 p-2">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Icon name="Loader" className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-400">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-1">
            {/* Directories */}
            {filteredDirs.map((dir, index) => (
              <button
                key={`dir-${index}`}
                onClick={() => navigateToDir(dir)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Icon name="FolderOpen" className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-200">{dir}/</span>
              </button>
            ))}

            {/* Files */}
            {filteredFiles.map((file, index) => (
              <button
                key={`file-${index}`}
                onClick={() => selectFile(file)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <Icon name="FileText" className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-200">{file}</span>
              </button>
            ))}

            {filteredDirs.length === 0 && filteredFiles.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                {searchQuery ? 'No matches found' : 'Empty directory'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};