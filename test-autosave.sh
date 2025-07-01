#!/bin/bash

# Autosave Functionality Test Script
# This script helps verify that the enhanced autosave system is working correctly

echo "🔧 Gemini CLI Workstation - Autosave Test"
echo "========================================"
echo ""

# Check if the server is running
echo "1. Checking if server is running..."
SERVER_HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Server is running and healthy"
    echo "   Response: $SERVER_HEALTH"
else
    echo "❌ Server is not responding. Please start the server first."
    echo "   Run: npm run dev"
    exit 1
fi

echo ""

# Test project discovery
echo "2. Testing project discovery..."
PROJECTS=$(curl -s http://localhost:3001/api/projects 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Project discovery working"
    PROJECT_COUNT=$(echo "$PROJECTS" | jq length 2>/dev/null || echo "unknown")
    echo "   Found $PROJECT_COUNT projects"
else
    echo "❌ Project discovery failed"
fi

echo ""

# Test configuration save/load (requires a test project)
echo "3. Testing configuration persistence..."
TEST_PROJECT="/tmp/gemini-cli-test"
mkdir -p "$TEST_PROJECT"

# Test data
TEST_CONFIG='{
  "projectPath": "'$TEST_PROJECT'",
  "settings": {
    "theme": "Test",
    "autoAccept": true,
    "mcpServers": {
      "test-server": {
        "command": "echo",
        "args": ["test"],
        "timeout": 5000,
        "trust": false
      }
    }
  },
  "envVars": {
    "TEST_VAR": "test_value"
  }
}'

# Save test configuration
SAVE_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_CONFIG" \
  http://localhost:3001/api/config/save 2>/dev/null)

if [ $? -eq 0 ] && echo "$SAVE_RESULT" | grep -q "success"; then
    echo "✅ Configuration save working"
    
    # Verify files were created
    if [ -f "$TEST_PROJECT/.gemini/settings.json" ]; then
        echo "✅ settings.json created successfully"
    else
        echo "❌ settings.json not found"
    fi
    
    if [ -f "$TEST_PROJECT/.env" ]; then
        echo "✅ .env file created successfully"
    else
        echo "❌ .env file not found"
    fi
    
    # Test configuration load
    LOAD_RESULT=$(curl -s "http://localhost:3001/api/config/load?projectPath=$TEST_PROJECT" 2>/dev/null)
    if echo "$LOAD_RESULT" | grep -q "test-server"; then
        echo "✅ Configuration load working"
        echo "✅ MCP server configuration persisted correctly"
    else
        echo "❌ Configuration load failed or MCP server not found"
    fi
    
else
    echo "❌ Configuration save failed"
    echo "   Response: $SAVE_RESULT"
fi

echo ""

# Cleanup
echo "4. Cleaning up test files..."
rm -rf "$TEST_PROJECT"
echo "✅ Test files cleaned up"

echo ""
echo "🎉 Autosave test completed!"
echo ""
echo "Manual Testing Checklist:"
echo "========================"
echo "1. Open the web interface at http://localhost:5173"
echo "2. Select a project"
echo "3. Add an MCP server and verify:"
echo "   - Toast notification appears"
echo "   - Autosave indicator shows 'Saving...' then 'Saved'"
echo "   - Check project .gemini/settings.json file for changes"
echo "4. Remove an MCP server and verify persistence"
echo "5. Test with invalid JSON in environment variables"
echo "6. Disconnect network and verify retry mechanism"
echo ""
echo "Visual Indicators to Check:"
echo "- Blue 'Saving...' indicator in top bar"
echo "- Green 'Saved' indicator with timestamp"
echo "- Red 'Save Failed' indicator on errors"
echo "- Force Save button appears on autosave failures"
echo "- Toast notifications for all operations"
