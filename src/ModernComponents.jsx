import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Settings,
  Folder,
  Zap,
  Terminal,
  Sparkles,
  Send,
  Mic,
  Paperclip,
  MoreHorizontal,
  Search,
  History,
  Bot,
  User,
  Code,
  FileText,
  Cpu,
  Activity,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

// Import the file upload component
import FileUploadComponent from './FileUploadComponent';

// Modern color palette with gradients
export const colors = {
  primary: 'from-violet-600 via-purple-600 to-indigo-600',
  secondary: 'from-slate-800 via-slate-900 to-slate-800',
  accent: 'from-pink-500 via-rose-500 to-orange-500',
  success: 'from-emerald-500 to-teal-500',
  warning: 'from-amber-500 to-orange-500',
  error: 'from-red-500 to-rose-500',
  glass: 'bg-white/10 backdrop-blur-xl border border-white/20',
  darkGlass: 'bg-black/20 backdrop-blur-xl border border-white/10'
};

// Animated background component
export const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900"></div>
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-full blur-3xl"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
  </div>
);

// Glass card component with hover effects
export const GlassCard = ({ children, className = "", hover = true, onClick }) => (
  <div
    className={`
      ${colors.glass} rounded-2xl p-6
      ${hover ? 'hover:bg-white/20 hover:scale-[1.02] hover:shadow-2xl' : ''}
      transition-all duration-300 ease-out cursor-pointer
      ${className}
    `}
    onClick={onClick}
  >
    {children}
  </div>
);

// Modern button component
export const ModernButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  className = "",
  onClick,
  disabled = false
}) => {
  const variants = {
    primary: `bg-gradient-to-r ${colors.primary} hover:from-violet-700 hover:to-indigo-700`,
    secondary: `${colors.glass} hover:bg-white/20`,
    accent: `bg-gradient-to-r ${colors.accent} hover:from-pink-600 hover:to-orange-600`,
    ghost: 'hover:bg-white/10'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-xl font-semibold text-white
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-xl
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
        ${className}
      `}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};

// Enhanced sidebar with modern styling
export const ModernSidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const navItems = [
    { id: 'chat', icon: MessageCircle, label: 'Chat Interface', badge: null },
    { id: 'projects', icon: Folder, label: 'Repositories', badge: null },
    { id: 'tools', icon: Zap, label: 'Tools & MCP', badge: null },
    { id: 'terminal', icon: Terminal, label: 'Terminal', badge: null },
    { id: 'authentication', icon: User, label: 'Authentication', badge: null },
    { id: 'models', icon: Cpu, label: 'Models', badge: null },
    { id: 'settings', icon: Settings, label: 'Settings', badge: null }
  ];

  return (
    <div className={`
      ${isCollapsed ? 'w-20' : 'w-72'}
      transition-all duration-300 ease-out
      ${colors.darkGlass}
      border-r border-white/10
      flex flex-col
    `}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Gemini CLI
              </h1>
              <p className="text-sm text-gray-400">Web Interface</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-white'
                  : 'hover:bg-white/10 text-gray-300 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={`
                      ml-auto px-2 py-1 text-xs rounded-full
                      ${item.badge === 'NEW'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-violet-500'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            {!isCollapsed && <span className="text-sm text-gray-400">Connected</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern chat message component
export const ModernChatMessage = ({ message, isUser = false, isTyping = false, timestamp = null }) => (
  <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
    {/* Avatar */}
    <div className={`
      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
      ${isUser
        ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
        : 'bg-gradient-to-r from-violet-500 to-purple-600'
      }
    `}>
      {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
    </div>

    {/* Message content */}
    <div className={`
      max-w-2xl rounded-2xl p-4
      ${isUser
        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
        : `${colors.glass} text-white`
      }
      ${isTyping ? 'animate-pulse' : ''}
    `}>
      {isTyping ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-200"></div>
          </div>
          <span className="text-gray-300">AI is thinking...</span>
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{message}</div>
      )}

      {/* Message actions */}
      <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs opacity-70">
          {timestamp || new Date().toLocaleTimeString()}
        </span>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-white/20 rounded">
            <Code className="w-3 h-3" />
          </button>
          <button className="p-1 hover:bg-white/20 rounded">
            <FileText className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced chat input component
export const ModernChatInput = ({ onSend, value = "", onChange = null, disabled = false }) => {
  const [input, setInput] = useState(value);
  const [isRecording, setIsRecording] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleSend = () => {
    const message = onChange ? value : input;
    if (message.trim() && !disabled) {
      onSend(message);
      if (!onChange) {
        setInput('');
      }
      // Clear uploaded files after sending
      setUploadedFiles([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    } else {
      setInput(e.target.value);
    }
  };

  const handleFilesSelected = (files, action = 'add') => {
    if (action === 'insert' && files.length > 0) {
      // Insert @ command for the file
      const file = files[0];
      const currentValue = onChange ? value : input;
      const newValue = currentValue + (currentValue ? ' ' : '') + file.atCommand + ' ';

      if (onChange) {
        onChange(newValue);
      } else {
        setInput(newValue);
      }
    } else {
      // Add files to uploaded list
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const currentValue = onChange ? value : input;

  return (
    <div className="p-6 border-t border-white/10">
      {/* File Upload Area (show when upload button is clicked) */}
      {showFileUpload && (
        <div className="mb-4">
          <FileUploadComponent
            onFilesSelected={handleFilesSelected}
            className="w-full"
          />
        </div>
      )}

      <div className={`${colors.glass} rounded-2xl p-4`}>
        <div className="flex items-end gap-4">
          {/* File upload button */}
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className={`p-2 rounded-xl transition-colors ${
              showFileUpload
                ? 'bg-blue-500 text-white'
                : 'hover:bg-white/20 text-gray-400'
            }`}
            title="Upload files"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input field */}
          <div className="flex-1">
            <textarea
              value={currentValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message, use @ for files, or upload attachments..."
              disabled={disabled}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none outline-none disabled:opacity-50"
              rows="1"
              style={{ minHeight: '20px', maxHeight: '120px' }}
            />

            {/* Input indicators */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{currentValue.length}/4000</span>
              <div className="flex gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  @ for files
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  / for commands
                </span>
                {uploadedFiles.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Voice input */}
          <button
            className={`
              p-2 rounded-xl transition-all duration-200
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'hover:bg-white/20'
              }
            `}
            onClick={() => setIsRecording(!isRecording)}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-gray-400'}`} />
          </button>

          {/* Send button */}
          <ModernButton
            onClick={handleSend}
            disabled={!currentValue.trim() || disabled}
            icon={<Send className="w-4 h-4" />}
            size="sm"
          >
            Send
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

// Modern header component
export const ModernHeader = ({ title, subtitle, actions = null }) => (
  <div className="p-6 border-b border-white/10">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </h2>
        {subtitle && <p className="text-gray-400">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  </div>
);

// Status indicator component
export const StatusIndicator = ({ status, label }) => {
  const statusColors = {
    active: 'bg-green-400',
    inactive: 'bg-red-400',
    pending: 'bg-yellow-400',
    processing: 'bg-blue-400'
  };

  return (
    <div className={`${colors.glass} rounded-xl px-4 py-2`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${status === 'processing' ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm text-gray-300">{label}</span>
      </div>
    </div>
  );
};
