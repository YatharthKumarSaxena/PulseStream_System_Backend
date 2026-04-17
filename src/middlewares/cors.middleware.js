/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing for frontend development
 * Allows frontend (running on different port/domain) to access backend API
 */

const { logWithTime } = require("@utils/time-stamps.util");

/**
 * CORS Configuration
 * Allows requests from frontend servers and localhost during development
 */
const corsOptions = {
    // Allowed origins for CORS requests
    origin: function (origin, callback) {
        // List of allowed origins
        const allowedOrigins = [
            "http://localhost:3000",      // Backend (should not make CORS calls to itself)
            "http://localhost:5173",      // Vite default dev server
            "http://localhost:5174",      // Alternative Vite port
            "http://localhost:8080",      // Common dev ports
            "http://localhost:8081",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8080",
            "http://localhost:3001",      // If frontend runs on alternative port
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // For development: log but don't block
            if (process.env.NODE_ENV === "development") {
                logWithTime(`⚠️  CORS: Request from ${origin} - allowed in development mode`);
                callback(null, true);
            } else {
                logWithTime(`❌ CORS: Origin ${origin} not allowed`);
                callback(new Error("Not allowed by CORS"));
            }
        }
    },

    // Allowed HTTP methods
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    // Allowed request headers
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],

    // Headers exposed to frontend
    exposedHeaders: ["X-Total-Count", "X-Page-Count"],

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Preflight cache time in seconds (optimal cache for this API)
    maxAge: 86400 // 24 hours
};

/**
 * Express CORS Middleware
 * Applies CORS policy to all routes
 */
const cors = require("cors");
const corsMiddleware = cors(corsOptions);

/**
 * Log CORS Setup
 */
logWithTime(`🔒 CORS Middleware Configured`);
logWithTime(`✅ Allowed Origins: ${corsOptions.origin.toString().includes("allowedOrigins") ? "Multiple" : "All"}`);

module.exports = corsMiddleware;
