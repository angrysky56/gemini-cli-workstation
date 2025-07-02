import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  History, ChevronLeft, ChevronRight, RefreshCw, FolderOpen, PlusCircle, X, Terminal,
  AlertCircle, Wrench, Send, Loader, FileText, AtSign, Hash, Command, User, Bot,
  Upload, Paperclip, Zap, CheckCircle, Copy, Eye, EyeOff, MessageCircle
} from 'lucide-react';

import { colors, AnimatedBackground, ModernButton } from './ModernComponents';
import FileUploadComponent from './FileUploadComponent';

// Enhanced Chat Interface Component
export const ModernChatInterface = ({
  settings,
  setSettings,
  envVars,
  currentProject,
  setCurrentProject,
  api
}) => {
  const [conversation, setConversation] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [workingFolders, setWorkingFolders] = useState([currentProject].filter(Boolean));
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);

  const inputRef = useRef(null);
  const endOfMessagesRef = useRef(null);
  const commandMenuRef = useRef(null);
  const fileSelectorRef = useRef(null);

  // Available slash commands
  const commands = [
    { cmd: '/help', desc: 'Display help information' },
    { cmd: '/tools', desc: 'List available tools' },
    { cmd: '/mcp', desc: 'List MCP servers and tools' },
    { cmd: '/memory', desc: 'Manage AI instructional context' },
    { cmd: '/memory show', desc: 'Show current memory content' },
    { cmd: '/memory refresh', desc: 'Reload memory from files' },
    { cmd: '/stats', desc: 'Display session statistics' },
    { cmd: '/clear', desc: 'Clear the terminal screen' },
    { cmd: '/compress', desc: 'Compress chat context' },
    { cmd: '/theme', desc: 'Change visual theme' },
    { cmd: '/chat save', desc: 'Save conversation state' },
    { cmd: '/chat resume', desc: 'Resume conversation' },
    { cmd: '/chat list', desc: 'List saved conversations' },
    { cmd: '/restore', desc: 'Restore files from checkpoint' },
    { cmd: '/auth', desc: 'Change authentication method' },
    { cmd: '/bug', desc: 'File an issue about Gemini CLI' },
    { cmd: '/about', desc: 'Show version information' },
    { cmd: '/quit', desc: 'Exit Gemini CLI' }
  ];

  // Load chat history and uploaded files when component mounts or currentProject changes
  useEffect(() => {
    if (currentProject) {
      loadChatHistory(currentProject);
      loadUploadedFiles(currentProject);
    } else {
      setChatHistory([]);
      setUploadedFiles([]);
    }
    // Initialize working folders with base folder path if available
    if (settings.baseFolderPath && !workingFolders.includes(settings.baseFolderPath)) {
      setWorkingFolders(prev => [...prev, settings.baseFolderPath]);
    }
  }, [currentProject, settings.baseFolderPath]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle click outside for menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (commandMenuRef.current && !commandMenuRef.current.contains(event.target)) {
        setShowCommandMenu(false);
      }
      if (fileSelectorRef.current && !fileSelectorRef.current.contains(event.target)) {
        setShowFileSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChatHistory = async (projectPath) => {
    if (!projectPath) {
      setChatHistory([]);
      return;
    }
    try {
      const result = await api.getChatHistory(projectPath);
      setChatHistory(result.history || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setChatHistory([]); // Clear history on error
    }
  };

  const loadUploadedFiles = async (projectPath) => {
    if (!projectPath) {
      setUploadedFiles([]);
      return;
    }
    try {
      const result = await api.getUploadedFiles(projectPath);
      setUploadedFiles(result.files || []);
    } catch (error) {
      console.error('Failed to load uploaded files:', error);
      setUploadedFiles([]); // Clear files on error
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

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
    if (textBeforeCursor.length > 0 && value.startsWith('/')) {
      const slashMatch = textBeforeCursor.match(/^\/([^\s]*)$/);
      if (slashMatch) {
        setShowCommandMenu(true);
        setCommandSearch(slashMatch[1] || '');
        setShowFileSelector(false);
      } else {
        setShowCommandMenu(false);
      }
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
        inputRef.current?.focus();
      }
    }
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    // projectPath for command execution can be currentProject or fallback to settings.baseFolderPath or even undefined for global commands
    // However, for saving history, it strictly needs currentProject.
    const executionProjectPath = currentProject || settings.baseFolderPath;

    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowCommandMenu(false);
    setShowFileSelector(false);
    setSelectedHistoryIndex(-1);

    // Save user message to history only if currentProject is set
    if (currentProject) {
      try {
        await api.saveChatMessage(currentProject, userMessage);
      } catch (error) {
        console.error('Failed to save user message to history:', error);
      }
    } else {
      console.warn('User message not saved to history: No current project selected.');
    }

    try {
      // Execute command using executionProjectPath (could be undefined if no project/base folder)
      const result = await api.executeCommand(executionProjectPath, messageText, settings, envVars);

      const output = result.output || 'Command completed successfully';
      let messageType = 'assistant';

      // Detect message type based on output content
      if (output.includes('Tool:') && output.includes('Status:')) {
        messageType = 'tool';
      } else if (result.hasError) {
        messageType = 'error';
      }

      const aiResponse = {
        type: messageType,
        content: output,
        timestamp: new Date().toISOString(),
        success: result.success
      };

      setConversation(prev => [...prev, aiResponse]);

      // Save AI response to history only if currentProject is set
      if (currentProject) {
        try {
          await api.saveChatMessage(currentProject, aiResponse);
          loadChatHistory(currentProject); // Refresh history for the current project
        } catch (error) {
          console.error('Failed to save AI response to history:', error);
        }
      } else {
        console.warn('AI response not saved to history: No current project selected.');
      }

    } catch (error) {
      console.error('Command execution error:', error);
      const errorResponse = {
        type: 'error',
        content: error.message.includes('fetch failed')
          ? 'Cannot connect to backend server. Please ensure the server is running on port 3001.'
          : `Error: ${error.message}`,
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
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectFile = (filePath) => {
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBeforeCursor = input.substring(0, cursorPos);
    const textAfterCursor = input.substring(cursorPos);

    const atMatch = textBeforeCursor.match(/(.*)@[^\s]*$/);
    if (atMatch) {
      const newInput = atMatch[1] + '@' + filePath + ' ' + textAfterCursor;
      setInput(newInput);
      setShowFileSelector(false);

      setTimeout(() => {
        const newPos = atMatch[1].length + filePath.length + 2;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleFilesUploaded = async (files) => {
    if (!currentProject) {
      alert('Please select a project first before uploading files.');
      console.warn('File upload attempted without a selected project.');
      return;
    }

    try {
      const fileList = files.map(f => f.file || f).filter(Boolean);
      if (fileList.length === 0) return;

      const result = await api.uploadFiles(currentProject, fileList);
      // Assuming api.uploadFiles returns files associated with the project,
      // and loadUploadedFiles will refresh this from the project context.
      loadUploadedFiles(currentProject); // Refresh the list of uploaded files for the current project
      setShowUpload(false);

      // Optionally insert @ commands for uploaded files
      // The `result.files` should contain paths relative to the project or recognizable by @-mention
      const atCommands = result.files.map(f => `@${f.name}`).join(' '); // Using f.name as a placeholder for usable @-reference
      if (atCommands) {
        setInput(prev => prev + (prev ? ' ' : '') + atCommands + ' ');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    }
  };

  const loadHistoryConversation = (messages) => {
    setConversation(messages);
    setShowHistory(false);
  };

  const clearConversation = async () => {
    setConversation([]);
    setSelectedHistoryIndex(-1);

    // Optionally clear server-side history too, only if a project is selected
    if (currentProject) {
      try {
        await api.clearChatHistory(currentProject);
        setChatHistory([]); // Clear local state as well
      } catch (error) {
        console.error('Failed to clear server history:', error);
      }
    } else {
      // If no project, just clear the live conversation, local history is already empty
      setChatHistory([]);
      console.warn('Server history not cleared: No current project selected.');
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

  const copyMessageToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Enhanced message renderer
  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    const isTool = message.type === 'tool' || (message.content && message.content.includes('Tool:') && message.content.includes('Status:'));

    if (isUser) {
      return (
        <div key={index} className="flex gap-4 justify-end group">
          <div className="max-w-2xl rounded-2xl p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
              <button
                onClick={() => copyMessageToClipboard(message.content)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      );
    }

    if (isTool) {
      // Parse tool output
      const lines = message.content.split('\n');
      const toolInfo = {};
      let outputContent = [];
      let inOutput = false;

      lines.forEach(line => {
        if (line.startsWith('Tool:')) {
          toolInfo.tool = line.replace('Tool:', '').trim();
        } else if (line.startsWith('Status:')) {
          toolInfo.status = line.replace('Status:', '').trim();
        } else if (line.startsWith('Output:') || inOutput) {
          inOutput = true;
          if (line.startsWith('Output:')) {
            outputContent.push(line.replace('Output:', '').trim());
          } else {
            outputContent.push(line);
          }
        }
      });

      return (
        <div key={index} className="flex gap-4 group">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className={`max-w-2xl rounded-2xl p-4 ${colors.glass} text-white`}>
            {toolInfo.tool && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <Zap className="w-3 h-3" />
                <span>Tool: {toolInfo.tool}</span>
                {toolInfo.status && (
                  <>
                    <span>•</span>
                    <span className={toolInfo.status.toLowerCase().includes('success') ? 'text-green-400' : 'text-yellow-400'}>
                      {toolInfo.status}
                    </span>
                  </>
                )}
              </div>
            )}
            {outputContent.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3 text-sm font-mono overflow-x-auto">
                <pre className="whitespace-pre-wrap">{outputContent.join('\n')}</pre>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
              <button
                onClick={() => copyMessageToClipboard(message.content)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy output"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isError) {
      return (
        <div key={index} className="flex gap-4 group">
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="max-w-2xl rounded-2xl p-4 bg-red-600/20 border border-red-600/50 text-red-200">
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
              <button
                onClick={() => copyMessageToClipboard(message.content)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy error"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Assistant message with markdown
    return (
      <div key={index} className="flex gap-4 group">
        <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className={`max-w-2xl rounded-2xl p-4 ${colors.glass} text-white`}>
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
              },
              pre({ children }) {
                return (
                  <div className="bg-gray-900/50 rounded-lg p-3 overflow-x-auto">
                    <pre className="text-sm">{children}</pre>
                  </div>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
          <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            <button
              onClick={() => copyMessageToClipboard(message.content)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Copy response"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full relative">
      <AnimatedBackground />

      {/* Chat History Sidebar */}
      <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 ${colors.darkGlass} border-r border-white/10 overflow-hidden relative z-10`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
              <History className="w-4 h-4" />
              Chat History
            </h3>
            <button
              onClick={clearConversation}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Clear current chat"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No history yet</p>
            ) : (
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
                  className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="text-sm text-gray-300 truncate">
                    {group[0].content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(group[0].timestamp).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className={`${colors.darkGlass} border-b border-white/10 px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {showHistory ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <h2 className="text-lg font-semibold text-white">Gemini CLI</h2>
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`p-2 rounded-lg transition-colors ${
                  showUpload ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Upload files"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={clearConversation}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Clear conversation"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Working Folders */}
          {workingFolders.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Working folders:</span>
              {workingFolders.map((folder, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    folder === currentProject
                      ? 'bg-blue-600 text-white'
                      : `${colors.glass} text-gray-300 hover:bg-white/20 cursor-pointer`
                  }`}
                  onClick={() => folder !== currentProject && setCurrentProject(folder)}
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>{folder.split('/').pop()}</span>
                  {workingFolders.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWorkingFolder(folder);
                      }}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const newFolder = prompt('Enter folder path:');
                  if (newFolder) addWorkingFolder(newFolder);
                }}
                className="text-green-400 hover:text-green-300 transition-colors"
                title="Add working folder"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* File Upload Area */}
        {showUpload && (
          <div className="p-4 border-b border-white/10">
            <FileUploadComponent
              onFilesSelected={handleFilesUploaded}
              className="w-full"
            />
          </div>
        )}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {conversation.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-light text-gray-300 mb-4">
                  Ready to assist with your development
                </h2>
                <p className="text-gray-500 mb-6">
                  Type a message or use / for commands, @ for files, ! for shell
                </p>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-400" />
                    <span>/ for commands</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-green-400" />
                    <span>@ for files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Command className="w-4 h-4 text-purple-400" />
                    <span>! for shell</span>
                  </div>
                </div>
              </div>
            )}

            {conversation.map((message, index) => renderMessage(message, index))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Loader className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className={`${colors.glass} rounded-2xl p-4`}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-gray-300">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endOfMessagesRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className={`${colors.darkGlass} border-t border-white/10 p-6`}>
          <div className="max-w-4xl mx-auto relative">
            {/* Command Menu */}
            {showCommandMenu && (
              <div ref={commandMenuRef} className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {commands
                  .filter(cmd => cmd.cmd.toLowerCase().includes(commandSearch.toLowerCase()))
                  .map((cmd, index) => (
                    <button
                      key={index}
                      onClick={() => selectCommand(cmd.cmd)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex justify-between items-center"
                    >
                      <span className="text-sm font-mono text-blue-400">{cmd.cmd}</span>
                      <span className="text-xs text-gray-400">{cmd.desc}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* File Selector */}
            {showFileSelector && (
              <FileSelector
                show={showFileSelector}
                currentPath={settings.baseFolderPath || '/'}
                searchQuery={fileSearch}
                onSelect={selectFile}
                onClose={() => setShowFileSelector(false)}
                uploadedFiles={uploadedFiles}
                api={api}
              />
            )}

            <div className={`${colors.glass} rounded-2xl shadow-lg border border-white/20`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message, / for commands, @ for files, ! for shell..."
                disabled={isLoading}
                className="w-full p-4 outline-none resize-none text-white placeholder-gray-400 disabled:opacity-50 bg-transparent"
                rows="3"
              />

              <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{input.length}/4000</span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <AtSign className="w-3 h-3 text-green-400" />
                      <span>@ files</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-blue-400" />
                      <span>/ commands</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Command className="w-3 h-3 text-purple-400" />
                      <span>! shell</span>
                    </div>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span>{uploadedFiles.length} files ready</span>
                    </div>
                  )}
                </div>

                <ModernButton
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  icon={<Send className="w-4 h-4" />}
                  size="sm"
                >
                  Send
                </ModernButton>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Enhanced File Selector Component
const FileSelector = ({ show, currentPath, searchQuery, onSelect, onClose, uploadedFiles = [], api }) => {
  const [files, setFiles] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState(currentPath || '/');
  const selectorRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Set initial directory to currentPath or default to root
      const initialDir = currentPath || '/';
      setCurrentDir(initialDir);
      loadDirectory(initialDir);
    }
  }, [show, currentPath]);

  useEffect(() => {
    if (show && currentDir) {
      loadDirectory(currentDir);
    }
  }, [currentDir]);

  const loadDirectory = async (path) => {
    setLoading(true);
    try {
      const result = await api.listFiles(path);
      setFiles(result.files || []);
      setDirectories(result.directories || []);
    } catch (error) {
      console.error('Failed to load directory:', error);
      // If error loading, try to go to parent or root
      if (path !== '/' && path !== currentPath) {
        const parentDir = path.split('/').slice(0, -1).join('/') || '/';
        setCurrentDir(parentDir);
      }
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

  if (!show) return null;

  // Filter files and directories
  const filteredFiles = files.filter(f =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDirs = directories.filter(d =>
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Include uploaded files in the list
  const uploadedFileNames = uploadedFiles
    .filter(f => f.relativePath.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(f => ({
      name: f.originalName,
      path: f.relativePath,
      isUploaded: true
    }));

  return (
    <div ref={selectorRef} className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden z-50">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Select File or Directory</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={navigateUp}
            className="text-blue-400 hover:text-blue-300 transition-colors"
            disabled={currentDir === '/'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-gray-400 truncate flex-1">{currentDir}</span>
        </div>
      </div>

      <div className="overflow-y-auto max-h-60 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Uploaded Files */}
            {uploadedFileNames.length > 0 && (
              <>
                <div className="px-3 py-1 text-xs text-green-400 font-medium">Uploaded Files:</div>
                {uploadedFileNames.map((file, index) => (
                  <button
                    key={`uploaded-${index}`}
                    onClick={() => onSelect(file.path)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-200">{file.name}</span>
                  </button>
                ))}
                <div className="border-b border-gray-700 my-2"></div>
              </>
            )}

            {/* Directories */}
            {filteredDirs.map((dir, index) => (
              <button
                key={`dir-${index}`}
                onClick={() => navigateToDir(dir)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-200">{dir}/</span>
              </button>
            ))}

            {/* Files */}
            {filteredFiles.map((file, index) => (
              <button
                key={`file-${index}`}
                onClick={() => onSelect(currentDir === '/' ? `/${file}` : `${currentDir}/${file}`)}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-200">{file}</span>
              </button>
            ))}

            {filteredDirs.length === 0 && filteredFiles.length === 0 && uploadedFileNames.length === 0 && (
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