#!/bin/bash

# Gemini Workstation Startup Script

echo "🚀 Starting Gemini Workstation..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    exit
}

# Function to find available port
find_available_port() {
    local port=$1
    while lsof -i :"$port" >/dev/null 2>&1; do
        echo "⚠️  Port $port is already in use, trying $((port+1))..."
        port=$((port+1))
    done
    echo "$port"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Find project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_ROOT" || exit

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Find available port for backend
BACKEND_PORT=$(find_available_port 3001)
export PORT=$BACKEND_PORT

# Update .env file with the backend port
echo "VITE_BACKEND_PORT=$BACKEND_PORT" > .env

# Update API base if port changed
if [ "$BACKEND_PORT" -ne 3001 ]; then
    echo "⚠️  Using port $BACKEND_PORT for backend (3001 was busy)"
fi

# Start the backend server
echo "🖥️  Starting backend server on port $BACKEND_PORT..."
cd server && PORT=$BACKEND_PORT npm start &
SERVER_PID=$!
cd ..

# Wait a bit for the server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Backend server failed to start!"
    exit 1
fi

# Start the frontend
echo "🌐 Starting frontend on port 5173..."
cd "$PROJECT_ROOT" && npm run dev &
CLIENT_PID=$!

# Show the URLs
echo ""
echo "✅ Gemini Workstation is running!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🖥️  Backend:  http://localhost:$BACKEND_PORT"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait
