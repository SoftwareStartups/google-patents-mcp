#!/bin/bash
# Quick Test Runner for Google Patents MCP Server
# This script helps you run the smoke test with proper environment setup

set -e

echo "================================================"
echo "Google Patents MCP Server - Test Runner"
echo "================================================"
echo ""

# Check if SERPAPI_API_KEY is set
if [ -z "$SERPAPI_API_KEY" ]; then
    echo "❌ Error: SERPAPI_API_KEY environment variable is not set."
    echo ""
    echo "Please set your SerpApi API key:"
    echo "  export SERPAPI_API_KEY=\"your_api_key_here\""
    echo ""
    echo "Get your API key from: https://serpapi.com/manage-api-key"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d "../node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd ..
    npm install
    cd tests
    echo "✓ Dependencies installed"
    echo ""
fi

# Check if build exists
if [ ! -f "../build/index.js" ]; then
    echo "🔨 Building project..."
    cd ..
    npm run build
    cd tests
    echo "✓ Build completed"
    echo ""
fi

# Run the test
echo "🧪 Running smoke test..."
echo ""
cd ..
npm test

exit $?

