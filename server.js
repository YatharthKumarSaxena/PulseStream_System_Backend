/**
 * PulseStream Backend Server
 * Real-time health monitoring system with Express and Socket.IO
 */

// Initialize module-alias for path shortcuts
require("module-alias/register");

// Load environment variables
require('dotenv').config();
const http = require("http");
const socketIO = require("socket.io");
const { spawn } = require("child_process");
const { logWithTime } = require("@utils/time-stamps.util");
const { errorMessage } = require("@utils/log-error.util");
const { PORT, SERVER_IP } = require("@utils/env.util");

// Services
const { initializeRedis, closeRedis } = require("@services/redis.service");
const { initializeSocket } = require("@services/socket.service");

// Express app (from app.js)
const app = require("./src/app");

// Create HTTP server with Socket.IO
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store io instance in app for access in controllers
app.set("io", io);

// Test mode tracking
let lastRequestTime = Date.now();
let requestCount = 0;

// Middleware to track requests
app.use((req, res, next) => {
    if (req.path.includes('/api/heartbeats/data')) {
        lastRequestTime = Date.now();
        requestCount++;
    }
    next();
});

/**
 * Start server
 */
const startServer = async () => {
    try {
        logWithTime("🚀 Starting PulseStream Backend Server...");
        logWithTime(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
        
        // Initialize Redis
        logWithTime("📍 Initializing Redis connection...");
        await initializeRedis();
        logWithTime("✅ Redis initialized");
        
        // Initialize Socket.IO
        logWithTime("🔧 Initializing Socket.IO...");
        initializeSocket(io);
        logWithTime("✅ Socket.IO initialized");
        
        // Start listening
        server.listen(PORT, SERVER_IP, () => {
            logWithTime(`✨ Server running on http://${SERVER_IP}:${PORT}`);
            logWithTime(`🎯 Health check: http://${SERVER_IP}:${PORT}/health`);
            logWithTime(`📊 API Base: http://${SERVER_IP}:${PORT}/api/heartbeats`);
            
            // Check TEST_MODE
            const TEST_MODE = process.env.TEST_MODE === 'true';
            if (TEST_MODE) {
                logWithTime('🧪 TEST_MODE: ENABLED');
                logWithTime('🤖 Auto-starting test data generator...');
                startTestDataGenerator();
            } else {
                logWithTime('📍 TEST_MODE: DISABLED');
                logWithTime('⏳ Waiting for POST requests from clients...');
                startWaitingMonitor();
            }
        });
    } catch (err) {
        logWithTime("❌ Failed to start server");
        errorMessage(err);
        process.exit(1);
    }
};

/**
 * Graceful shutdown
 */
process.on("SIGTERM", async () => {
    logWithTime("📛 SIGTERM received, shutting down gracefully...");
    
    server.close(async () => {
        logWithTime("✅ HTTP server closed");
        await closeRedis();
        process.exit(0);
    });
});

process.on("SIGINT", async () => {
    logWithTime("📛 SIGINT received, shutting down gracefully...");
    
    server.close(async () => {
        logWithTime("✅ HTTP server closed");
        await closeRedis();
        process.exit(0);
    });
});

/**
 * Auto-start test data generator
 */
const startTestDataGenerator = () => {
    logWithTime('🚀 Spawning test data generator...');
    
    // Read patient count from env or default to 3
    const patientCount = process.env.TEST_PATIENT_COUNT || '3';
    
    const generator = spawn('node', ['test-data-generator-smart.js', patientCount], {
        cwd: __dirname,
        stdio: 'inherit'
    });
    
    generator.on('error', (err) => {
        logWithTime('❌ Error spawning test generator: ' + err.message);
    });
    
    generator.on('exit', (code) => {
        logWithTime(`⚠️  Test generator exited with code ${code}`);
    });
};

/**
 * Monitor for incoming requests if not in test mode
 */
const startWaitingMonitor = () => {
    let warningShown = false;
    
    setInterval(() => {
        const timeSinceLastRequest = (Date.now() - lastRequestTime) / 1000;
        
        if (timeSinceLastRequest > 20) {
            if (!warningShown || timeSinceLastRequest % 20 < 1) {
                logWithTime(`⏳ Waiting for POST requests... (${Math.floor(timeSinceLastRequest)}s idle)`);
                logWithTime('💡 Hint: Enable TEST_MODE=true to auto-generate test data');
                logWithTime(`📊 Current requests received: ${requestCount}`);
                warningShown = true;
            }
        } else if (warningShown && requestCount > 0) {
            warningShown = false;
        }
    }, 20000); // Check every 20 seconds
};

// Start the server
startServer();

module.exports = app;
