/**
 * Success Response Handler
 * Standardizes all success responses from the API
 */

const { logWithTime } = require("@utils/time-stamps.util");
const { OK, CREATED } = require("@configs/http-status.config");

/**
 * Send standardized success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {*} data - Response data payload
 * @param {string} message - Success message
 */
const sendSuccessResponse = (res, statusCode = OK, data = null, message = "Success") => {
    logWithTime(`✅ Success: ${message}`);
    
    return res.status(statusCode).json({
        success: true,
        statusCode,
        data,
        message
    });
};

/**
 * Send 200 OK response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 */
const sendOkResponse = (res, data = null, message = "Request processed successfully") => {
    return sendSuccessResponse(res, OK, data, message);
};

/**
 * Send 201 Created response
 * @param {Object} res - Express response object
 * @param {*} data - Response data (typically the created resource)
 * @param {string} message - Success message
 */
const sendCreatedResponse = (res, data = null, message = "Resource created successfully") => {
    return sendSuccessResponse(res, CREATED, data, message);
};

module.exports = {
    sendSuccessResponse,
    sendOkResponse,
    sendCreatedResponse
};
