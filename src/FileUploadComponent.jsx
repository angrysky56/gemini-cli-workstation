// FileUploadComponent.jsx
// Modern file upload with drag & drop support for gemini-cli integration

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, File, CheckCircle, Folder } from 'lucide-react';
import { colors, GlassCard } from './ModernComponents';

export const FileUploadComponent = ({ onFilesSelected, className = "" }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Supported file types and extensions based on gemini-cli capabilities
  const supportedTypes = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    documents: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'],
    code: ['text/javascript', 'text/typescript', 'text/python', 'text/html', 'text/css', 'application/json']
  };

  const allowedExtensions = [
    '.txt', '.md', '.js', '.ts', '.py', '.html', '.css', '.json', '.yml', '.yaml', '.xml', '.csv'
  ];

  const allSupportedTypes = [...supportedTypes.images, ...supportedTypes.documents, ...supportedTypes.code];

  const getFileIcon = (file) => {
    if (supportedTypes.images.includes(file.type)) return <Image className="w-4 h-4" />;
    if (file.type === 'application/pdf') return <File className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getFileCategory = (file) => {
    if (supportedTypes.images.includes(file.type)) return 'Image';
    if (file.type === 'application/pdf') return 'PDF';
    return 'Document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = useCallback(async (files) => {
    setIsUploading(true);

    const processedFiles = [];

    for (const file of files) {
      // Check if file type is supported
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (
        !allSupportedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExtension)
      ) {
        console.warn(`Unsupported file type: ${file.type} for ${file.name}`);
        continue;
      }
      try {
        // Create a file path for @ command usage
        const tempPath = `uploads/${file.name}`;

        const processedFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          path: tempPath,
          atCommand: `@${tempPath}`,
          category: getFileCategory(file),
          file: file // Keep original file for actual upload
        };

        processedFiles.push(processedFile);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    setUploadedFiles(prev => [...prev, ...processedFiles]);
    setIsUploading(false);

    // Notify parent component about new files
    if (onFilesSelected) {
      onFilesSelected(processedFiles);
    }
  }, [onFilesSelected, allSupportedTypes]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    }
  }, [processFiles]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  }, [processFiles]);

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const insertAtCommand = (file) => {
    if (onFilesSelected) {
      onFilesSelected([file], 'insert');
    }
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`
          ${colors.glass} rounded-xl p-6 border-2 border-dashed transition-all duration-300
          ${dragActive
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
          accept={[...allSupportedTypes, ...allowedExtensions].join(',')}
        />

        <div className="text-center">
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? 'text-blue-400' : 'text-gray-400'}`} />
          <p className="text-gray-300 font-medium mb-1">
            {dragActive ? 'Drop files here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-gray-500">
            Supports: Images, PDFs, Text files, Code files
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Uploaded Files:</h4>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={`${colors.glass} rounded-lg p-3 flex items-center justify-between group hover:bg-white/20 transition-colors`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {file.category} • {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => insertAtCommand(file)}
                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
                    title="Insert @ command"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Upload Status */}
      {isUploading && (
        <div className="mt-4 flex items-center gap-2 text-blue-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Processing files...</span>
        </div>
      )}
    </div>
  );
};

// Enhanced file selector for @ commands
export const FileSelector = ({
  show,
  currentPath,
  basePath,
  searchQuery,
  onSelect,
  onClose,
  uploadedFiles
}) => {
  // Hide the file selector when 'show' is false (controlled by parent component)
  if (!show) return null;
  const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];

  const mockFiles = [
    { name: 'README.md', type: 'file', path: 'README.md' },
    { name: 'package.json', type: 'file', path: 'package.json' },
    { name: 'src/', type: 'directory', path: 'src' },
    { name: 'docs/', type: 'directory', path: 'docs' },
    ...safeUploadedFiles.map(file => ({
      name: file.name,
      type: file.file && typeof file.file.webkitRelativePath === 'string' && file.file.webkitRelativePath.endsWith('/')
        ? 'directory'
        : 'file',
      path: file.path,
      isUploaded: true
    }))
  ];

  const filteredFiles = mockFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // NOTE: This selector uses absolute positioning. If used in a scrollable container, this may cause overflow issues.
  // Consider making the positioning strategy configurable or document its requirements.
  return (
    <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
      <div className="p-2 border-b border-gray-700">
        <div className="text-xs text-gray-400">Select file or directory:</div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No files found matching "{searchQuery}"
        </div>
      ) : (
        filteredFiles.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelect(file)}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            {file.type === 'directory' ? (
              <File className="w-4 h-4 text-blue-400" />
            ) : (
              <FileText className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-300">{file.name}</span>
            {file.isUploaded && (
              <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />
            )}
          </button>
        ))
      )}
    </div>
  );
};
export default FileUploadComponent;
