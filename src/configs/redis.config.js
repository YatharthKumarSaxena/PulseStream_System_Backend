/**
 * Redis Configuration
 * Defines connection parameters for Redis
 */

module.exports = {
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
    REDIS_DB: parseInt(process.env.REDIS_DB) || 0,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
    
    // Redis Key Prefixes
    HEALTH_DATA_PREFIX: "healthData:",
    
    // Data retention (in milliseconds)
    DATA_RETENTION_2_HOURS: 2 * 60 * 60 * 1000,
    
    // Default time window (in minutes)
    DEFAULT_WINDOW_MINUTES: 15
};