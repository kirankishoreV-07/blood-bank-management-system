#!/bin/bash

# Update main API service
sed -i '' "s|'http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3000/api',.*// Current IP|'http://$CURRENT_IP:3000/api',     // Current IP (auto-detected)|" "$API_FILE"

# Update simple API service  
sed -i '' "s|const API_BASE_URL = 'http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3000/api';|const API_BASE_URL = 'http://$CURRENT_IP:3000/api';|" "$SIMPLE_API_FILE"

echo "✅ API configuration updated successfully!"
echo "🌐 API endpoints now point to: http://$CURRENT_IP:3000/api"

# Test connectivity
echo "🧪 Testing connectivity..."
if curl -s "http://$CURRENT_IP:3000/api/network-test" > /dev/null; then
    echo "✅ Backend server is accessible at http://$CURRENT_IP:3000"
else
    echo "❌ Backend server is not accessible. Make sure it's running."
    echo "💡 Run: cd /Users/kirankishore/New_Bank/backend && node server.js"
fiaddress (excluding localhost)
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🔍 Current IP detected: $CURRENT_IP"

# Update frontend API configuration
API_FILE="/Users/kirankishore/New_Bank/frontend/src/services/api.js"
SIMPLE_API_FILE="/Users/kirankishore/New_Bank/frontend/src/services/simpleApi.js"

echo "📝 Updating API configuration files..."

# Update main API service
sed -i '' "s|'http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3001/api',.*// Current IP|'http://$CURRENT_IP:3001/api',     // Current IP (auto-detected)|" "$API_FILE"

# Update simple API service  
sed -i '' "s|const API_BASE_URL = 'http://[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*:3001/api';|const API_BASE_URL = 'http://$CURRENT_IP:3001/api';|" "$SIMPLE_API_FILE"

echo "✅ API configuration updated successfully!"
echo "🌐 API endpoints now point to: http://$CURRENT_IP:3001/api"

# Test connectivity
echo "🧪 Testing connectivity..."
if curl -s "http://$CURRENT_IP:3001/api/health" > /dev/null; then
    echo "✅ Backend server is accessible at http://$CURRENT_IP:3001"
else
    echo "❌ Backend server is not accessible. Make sure it's running."
    echo "💡 Run: cd /Users/kirankishore/New_Bank/backend && PORT=3001 node server.js"
fi
