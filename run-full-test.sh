#!/bin/bash

# 🧪 PulseStream One-Command Test Script
# Automates entire setup: Backend + Frontend + Test Data Generator

set -e

clear

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║       🧪 PulseStream Complete Automated Test 🧪                    ║"
echo "║                                                                      ║"
echo "║       This script will:                                             ║"
echo "║       1. Enable TEST_MODE in .env                                   ║"
echo "║       2. Start Backend Server (port 3000)                           ║"
echo "║       3. Start Frontend Server (port 5173)                          ║"
echo "║       4. Run Test Data Generator                                    ║"
echo "║       5. Display dashboard URL                                      ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 3000 is already in use!${NC}"
    echo "   Kill existing process: lsof -ti:3000 | xargs kill -9"
    exit 1
fi

echo -e "${BLUE}Step 1: Enabling TEST_MODE${NC}"
echo "════════════════════════════════════════════════════════════════════════"

# Update .env with TEST_MODE=true
if grep -q "TEST_MODE=" .env; then
    # Replace existing TEST_MODE
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/TEST_MODE=.*/TEST_MODE=true/' .env
    else
        sed -i 's/TEST_MODE=.*/TEST_MODE=true/' .env
    fi
    echo -e "${GREEN}✅ TEST_MODE already exists, updated to true${NC}"
else
    # Add TEST_MODE at end
    echo "TEST_MODE=true" >> .env
    echo -e "${GREEN}✅ Added TEST_MODE=true to .env${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Starting Backend Server${NC}"
echo "════════════════════════════════════════════════════════════════════════"

npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${BLUE}→ Backend starting (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    cat /tmp/backend.log
    exit 1
fi

if grep -q "Server running" /tmp/backend.log; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⏳ Backend starting...${NC}"
    sleep 2
fi

echo ""
echo -e "${BLUE}Step 3: Starting Frontend Server${NC}"
echo "════════════════════════════════════════════════════════════════════════"

cd Frontend
python3 -m http.server 5173 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${BLUE}→ Frontend starting (PID: $FRONTEND_PID)${NC}"

sleep 2

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    cat /tmp/frontend.log
    kill $BACKEND_PID
    exit 1
fi

echo -e "${GREEN}✅ Frontend is running on http://localhost:5173${NC}"

echo ""
echo -e "${BLUE}Step 4: Starting Test Data Generator${NC}"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

node test-data-generator-smart.js

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo -e '${RED}🛑 Services stopped${NC}'; exit 0" EXIT

