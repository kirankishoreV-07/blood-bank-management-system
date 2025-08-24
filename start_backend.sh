#!/bin/bash
# Blood Bank Backend Starter Script

echo "🩸 Starting Blood Bank Backend Server..."

# Navigate to backend directory
cd /Users/kirankishore/New_Bank/backend

# Kill any existing process on port 3000
echo "🔄 Checking for existing processes..."
if lsof -ti:3000; then
    echo "🛑 Killing existing process on port 3000..."
    kill $(lsof -ti:3000)
    sleep 2
fi

# Start the server
echo "🚀 Starting server on port 3000..."
node server.js
