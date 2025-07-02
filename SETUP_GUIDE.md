# Gemini CLI Workstation - Setup Guide

## Quick Fix for Current Issues

The web interface was showing API validation errors because the backend server was missing. I've now created the complete backend implementation with all required endpoints.

### Immediate Steps:

1. **Install Gemini CLI globally** (if not already installed):
```bash
npm install -g @google/gemini-cli
```

2. **Verify Gemini CLI installation**:
```bash
gemini --version
```

3. **Configure authentication** (choose one method):

**Option A: API Key (Recommended)**
```bash
# Get API key from https://aistudio.google.com/app/apikey
export GEMINI_API_KEY="your_api_key_here"
echo 'export GEMINI_API_KEY="your_api_key_here"' >> ~/.bashrc
```

**Option B: Google Cloud Project**
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
export GOOGLE_GENAI_USE_VERTEXAI=true
```

**Option C: Code Assist Login**
```bash
# Just run gemini and it will prompt for Google login
gemini
```

4. **Test Gemini CLI directly**:
```bash
cd /home/ty/Repositories/gemini-cli-workstation_v02
gemini "Hello, can you see this project?"
```

5. **Start the workstation**:
```bash
chmod +x start.sh
./start.sh
```

## What I Fixed

### 1. Created Missing Backend Server (`server/index.js`)
- Express.js server with WebSocket support
- Project discovery and configuration management
- Chat history persistence
- File upload/management
- MCP server configuration translation
- PTY sessions for terminal integration

### 2. Added All Required API Endpoints
- `GET /api/projects` - Project discovery
- `GET/POST /api/config/load|save` - Configuration management
- `GET/POST/DELETE /api/chat/history|message` - Chat history
- `POST /api/cli/execute` - Command execution
- `GET/POST /api/files/list|upload` - File management
- `POST /api/mcp/translate` - MCP config conversion

### 3. Enhanced Command Execution
- Proper Gemini CLI command wrapping
- Environment variable injection
- Working directory handling
- Error detection and reporting

### 4. Fixed WebSocket Implementation
- PTY session management
- Real-time terminal output streaming
- Proper session cleanup
- Terminal resizing support

## Architecture Overview

```
Frontend (React + Vite)    Backend (Express + WS)    Gemini CLI
     |                           |                        |
     |-- API calls ------------> |                        |
     |-- WebSocket ------------> |-- PTY sessions -----> |
     |                           |-- Command execution -> |
     |                           |-- Config management    |
```

## Current Status

✅ **Backend server**: Complete with all endpoints
✅ **WebSocket support**: Real-time terminal integration  
✅ **Configuration management**: Project-specific settings
✅ **Chat history**: Persistent conversation storage
✅ **File management**: Upload and project file handling
✅ **MCP integration**: Server configuration translation
✅ **Authentication**: All three Gemini CLI auth methods supported

## Testing the Fix

1. **Check backend health**:
```bash
curl http://localhost:3001/api/health
```

2. **Test project discovery**:
```bash
curl http://localhost:3001/api/projects
```

3. **Test CLI execution**:
```bash
curl -X POST http://localhost:3001/api/cli/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "/help", "projectPath": "/home/ty/Repositories/gemini-cli-workstation_v02"}'
```

## Next Steps

1. Start the workstation with `./start.sh`
2. Open http://localhost:5173 in your browser
3. Configure authentication in the Authentication tab
4. Select your project from the dropdown
5. Start chatting with Gemini CLI through the web interface

The validation errors you saw should now be resolved since the backend properly wraps commands for Gemini CLI and handles all the API communication correctly.
