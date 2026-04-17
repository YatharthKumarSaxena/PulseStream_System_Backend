/**
 * Redis Service
 * Singleton Redis client for managing all Redis operations
 * Pattern: Singleton to ensure only one connection to Redis
 * Compatible with redis@4.x
 */

const redis = require("redis");
const { logWithTime } = require("@utils/time-stamps.util");
const { errorMessage } = require("@utils/log-error.util");
const {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_DB,
    REDIS_PASSWORD
} = require("@configs/redis.config");

let redisClient = null;

/**
 * Initialize Redis client connection
 * Creates a singleton connection to Redis
 * @returns {Promise<Object>} Redis client instance
 */
const initializeRedis = async () => {
    if (redisClient) {
        logWithTime("⚠️  Redis client already initialized");
        return redisClient;
    }

    try {
        logWithTime("🔄 Initializing Redis client...");
        logWithTime(`📍 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

        // Create Redis client with v4 API format
        redisClient = redis.createClient({
            socket: {
                host: REDIS_HOST,
                port: REDIS_PORT
            },
            password: REDIS_PASSWORD || undefined,
            db: REDIS_DB || 0
        });

        // Event listeners
        redisClient.on("connect", () => {
            logWithTime("✅ Redis client connected successfully");
        });

        redisClient.on("error", (err) => {
            logWithTime("❌ Redis client error");
            errorMessage(err);
        });

        redisClient.on("end", () => {
            logWithTime("⚠️  Redis client connection ended");
        });

        // Connect to Redis
        await redisClient.connect();

        return redisClient;
    } catch (err) {
        logWithTime("❌ Failed to initialize Redis client");
        errorMessage(err);
        throw err;
    }
};

/**
 * Get Redis client instance
 * Must call initializeRedis() first
 * @returns {Object} Redis client instance
 */
const getRedisClient = () => {
    if (!redisClient) {
        throw new Error("Redis client not initialized. Call initializeRedis() first.");
    }
    return redisClient;
};

/**
 * Close Redis connection
 * Should be called on server shutdown
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
    if (redisClient) {
        try {
            logWithTime("🔒 Closing Redis connection...");
            await redisClient.quit();
            redisClient = null;
            logWithTime("✅ Redis connection closed successfully");
        } catch (err) {
            logWithTime("❌ Error closing Redis connection");
            errorMessage(err);
        }
    }
};

module.exports = {
    initializeRedis,
    getRedisClient,
    closeRedis
};

module.exports = {
    initializeRedis,
    getRedisClient,
    closeRedis
};
