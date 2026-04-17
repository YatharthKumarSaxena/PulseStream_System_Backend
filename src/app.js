/**
 * Express App Configuration
 * Central Express application setup and middleware configuration
 */

const express = require("express");
const corsMiddleware = require("@middlewares/cors.middleware");
const { logWithTime } = require("@utils/time-stamps.util");
const { errorMessage } = require("@utils/log-error.util");

// Routes
const heartbeatRoutes = require("@routers/heartbeat.routes");

// Create Express app
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

/**
 * CORS Middleware - Enable cross-origin requests for frontend
 * Frontend will run on different port (e.g., 3000 server, 5173 frontend)
 */
app.use(corsMiddleware);

/**
 * Body Parser Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
    logWithTime(`📨 ${req.method} ${req.url}`);
    next();
});

// ============================================
// ROUTES
// ============================================

/**
 * Health Check Endpoint
 */
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "PulseStream Backend"
    });
});

/**
 * API Routes
 */
app.use("/api/heartbeats", heartbeatRoutes);

// ============================================
// ERROR HANDLING
// ============================================

/**
 * 404 Not Found Handler
 */
app.use((req, res) => {
    logWithTime(`⚠️  404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Endpoint not found",
        path: req.url
    });
});

/**
 * Global Error Handler (must be last middleware)
 */
app.use((err, req, res, next) => {
    logWithTime(`❌ Error: ${err.message}`);
    errorMessage(err);
    
    res.status(err.statusCode || 500).json({
        success: false,
        statusCode: err.statusCode || 500,
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { error: err.message })
    });
});

module.exports = app;
