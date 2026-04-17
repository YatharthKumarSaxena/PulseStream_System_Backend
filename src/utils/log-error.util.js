const { logWithTime } = require("./time-stamps.util");

/**
 * Log error with full stack trace
 * @param {Error} err - Error object to log
 */
const errorMessage = (err) => {
    logWithTime("🛑 Error occurred:");
    logWithTime("File Name and Line Number where this error occurred is displayed below:- ");
    console.log(err.stack);
    logWithTime("Error Message is displayed below:- ");
    console.error(err.message);
};

/**
 * Log middleware error with request details
 * @param {Object} req - Express request object
 * @param {Error} err - Error object
 * @param {string} middleware - Middleware name for context
 */
const logMiddlewareError = (req, err, middleware = "Middleware") => {
    logWithTime(`❌ ${middleware} Error`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request Method: ${req.method}`);
    errorMessage(err);
};

/**
 * Get log identifiers from request
 * @param {Object} req - Express request object
 * @returns {Object} Log identifiers object
 */
const getLogIdentifiers = (req) => {
    return {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };
};

module.exports = {
    errorMessage,
    logMiddlewareError,
    getLogIdentifiers
};