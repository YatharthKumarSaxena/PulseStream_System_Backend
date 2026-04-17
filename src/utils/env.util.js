/**
 * Environment Utility
 * Provides centralized access to environment variables and configuration
 * Loads .env file automatically on first call
 */

require("dotenv").config();

/**
 * Get environment variable with optional default value
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value if not set
 * @returns {string|undefined} Environment variable value or default
 */
const getEnv = (key, defaultValue = undefined) => {
    const value = process.env[key];
    return value !== undefined ? value : defaultValue;
};

/**
 * Get environment variable as number
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default numeric value
 * @returns {number} Parsed numeric value
 */
const getEnvAsNumber = (key, defaultValue = 0) => {
    const value = getEnv(key);
    return value ? parseInt(value, 10) : defaultValue;
};

/**
 * Get environment variable as boolean
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default boolean value
 * @returns {boolean} Parsed boolean value
 */
const getEnvAsBoolean = (key, defaultValue = false) => {
    const value = getEnv(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
};

module.exports = {
    getEnv,
    getEnvAsNumber,
    getEnvAsBoolean,
    
    // Common environment shortcuts
    PORT: getEnvAsNumber("PORT", 3000),
    NODE_ENV: getEnv("NODE_ENV", "development"),
    REDIS_HOST: getEnv("REDIS_HOST", "localhost"),
    REDIS_PORT: getEnvAsNumber("REDIS_PORT", 6379),
    REDIS_DB: getEnvAsNumber("REDIS_DB", 0),
    REDIS_PASSWORD: getEnv("REDIS_PASSWORD"),
    SERVER_IP: getEnv("SERVER_IP", "localhost")
};