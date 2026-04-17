#!/bin/bash

# PulseStream Backend - Quick Start Guide
# This script guides you through setting up and running the server

echo "🚀 PulseStream Backend - Quick Start"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js v14+ first."
    exit 1
fi

echo "✅ Node.js found: $(node -v)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm found: $(npm -v)"
echo ""

# Check if Redis is running
echo "📍 Checking Redis connection..."
if command -v redis-cli &> /dev/null
then
    if redis-cli ping > /dev/null 2>&1
    then
        echo "✅ Redis is running on localhost:6379"
    else
        echo "⚠️  Redis appears to be not running."
        echo "   Start Redis with: redis-server"
        echo "   Or configure REDIS_HOST/PORT in .env"
    fi
else
    echo "⚠️  redis-cli not found. Assuming Redis is available at REDIS_HOST:REDIS_PORT"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🧪 Running integration tests..."
npm test

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 To start the server:"
echo ""
echo "   Development (with auto-reload):"
echo "   $ npm run dev"
echo ""
echo "   Production:"
echo "   $ npm start"
echo ""
echo "🌐 Server will run on: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo ""
echo "📚 API Documentation: See README.md"
echo ""
