/**
 * Heartbeat Controller
 * Handles HTTP requests for health data operations
 */

const { logWithTime } = require("@utils/time-stamps.util");
const { sendOkResponse, sendCreatedResponse } = require("@responses/success/success.response");
const { BAD_REQUEST, INTERNAL_ERROR, CREATED } = require("@configs/http-status.config");
const {
    storeHealthData,
    getStats,
    getLatestHealthData,
    listHealthData,
    getAllPatients
} = require("@services/heartbeats/heartbeat.service");
const {
    validateHealthData,
    validatePatientId,
    validateTimeWindow,
    sanitizeHealthData
} = require("@services/validation.service");
const { DEFAULT_WINDOW_MINUTES } = require("@configs/redis.config");

/**
 * POST /data
 * Receive and store health data
 * Emits real-time update to Socket.IO subscribers
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const postHealthData = async (req, res) => {
    try {
        logWithTime("📥 POST /data endpoint called");
        
        const { body } = req;
        const io = req.app.get("io");
        
        // Validate incoming data
        const validation = validateHealthData(body);
        if (!validation.isValid) {
            logWithTime(`❌ Validation failed: ${validation.errors.join(", ")}`);
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Validation failed",
                errors: validation.errors
            });
        }
        
        // Sanitize data
        const sanitized = sanitizeHealthData(body);
        
        // Store in Redis
        const stored = await storeHealthData(sanitized.patientId, {
            bpm: sanitized.bpm,
            spo2: sanitized.spo2,
            temp: sanitized.temp,
            humidity: sanitized.humidity
        });
        
        logWithTime(`✅ Health data stored for patient ${sanitized.patientId}`);
        
        // Emit to Socket.IO subscribers
        if (io && io.emitHealthData) {
            io.emitHealthData(sanitized.patientId, stored);
        }
        
        // Return stored data
        return sendCreatedResponse(
            res,
            stored,
            "Health data recorded successfully"
        );
    } catch (err) {
        logWithTime(`❌ Error in postHealthData: ${err.message}`);
        return res.status(INTERNAL_ERROR).json({
            success: false,
            statusCode: INTERNAL_ERROR,
            message: "Failed to store health data",
            error: err.message
        });
    }
};

/**
 * GET /stats/:patientId
 * Get statistics for a patient within optional time window
 * Query params: window (in minutes, default: 15)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getStatsForPatient = async (req, res) => {
    try {
        logWithTime("📊 GET /stats/:patientId endpoint called");
        
        const { patientId } = req.params;
        const windowInMinutes = parseInt(req.query.window) || DEFAULT_WINDOW_MINUTES;
        
        // Validate patientId
        const patientValidation = validatePatientId(patientId);
        if (!patientValidation.isValid) {
            logWithTime(`❌ Invalid patientId: ${patientValidation.errors.join(", ")}`);
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Invalid patientId",
                errors: patientValidation.errors
            });
        }
        
        // Validate time window
        const windowValidation = validateTimeWindow(windowInMinutes);
        if (!windowValidation.isValid) {
            logWithTime(`❌ Invalid window: ${windowValidation.errors.join(", ")}`);
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Invalid time window",
                errors: windowValidation.errors
            });
        }
        
        // Get stats
        const stats = await getStats(patientId, windowInMinutes);
        
        return sendOkResponse(
            res,
            stats,
            `Statistics retrieved for patient ${patientId} (${windowInMinutes} min window)`
        );
    } catch (err) {
        logWithTime(`❌ Error in getStatsForPatient: ${err.message}`);
        return res.status(INTERNAL_ERROR).json({
            success: false,
            statusCode: INTERNAL_ERROR,
            message: "Failed to retrieve statistics",
            error: err.message
        });
    }
};

/**
 * GET /data/:patientId
 * Get latest health data for a patient
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getLatestData = async (req, res) => {
    try {
        logWithTime("📈 GET /data/:patientId endpoint called");
        
        const { patientId } = req.params;
        
        // Validate patientId
        const validation = validatePatientId(patientId);
        if (!validation.isValid) {
            logWithTime(`❌ Invalid patientId: ${validation.errors.join(", ")}`);
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Invalid patientId",
                errors: validation.errors
            });
        }
        
        // Get latest data
        const data = await getLatestHealthData(patientId);
        
        if (!data) {
            return sendOkResponse(
                res,
                null,
                `No health data available for patient ${patientId}`
            );
        }
        
        return sendOkResponse(
            res,
            data,
            `Latest health data for patient ${patientId}`
        );
    } catch (err) {
        logWithTime(`❌ Error in getLatestData: ${err.message}`);
        return res.status(INTERNAL_ERROR).json({
            success: false,
            statusCode: INTERNAL_ERROR,
            message: "Failed to retrieve latest data",
            error: err.message
        });
    }
};

/**
 * GET /list/:patientId
 * List all health data for a patient (paginated)
 * Query params: skip (default: 0), limit (default: 100)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listHealthDataForPatient = async (req, res) => {
    try {
        logWithTime("📋 GET /list/:patientId endpoint called");
        
        const { patientId } = req.params;
        const skip = parseInt(req.query.skip) || 0;
        const limit = parseInt(req.query.limit) || 100;
        
        // Validate patientId
        const validation = validatePatientId(patientId);
        if (!validation.isValid) {
            logWithTime(`❌ Invalid patientId: ${validation.errors.join(", ")}`);
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Invalid patientId",
                errors: validation.errors
            });
        }
        
        // Validate pagination params
        if (skip < 0 || limit <= 0 || limit > 1000) {
            return res.status(BAD_REQUEST).json({
                success: false,
                statusCode: BAD_REQUEST,
                message: "Invalid pagination parameters",
                errors: ["skip must be >= 0, limit must be between 1 and 1000"]
            });
        }
        
        // Get paginated health data
        const result = await listHealthData(patientId, skip, limit);
        
        return sendOkResponse(
            res,
            result,
            `Health data list for patient ${patientId}`
        );
    } catch (err) {
        logWithTime(`❌ Error in listHealthDataForPatient: ${err.message}`);
        return res.status(INTERNAL_ERROR).json({
            success: false,
            statusCode: INTERNAL_ERROR,
            message: "Failed to list health data",
            error: err.message
        });
    }
};

module.exports = {
    postHealthData,
    getStatsForPatient,
    getLatestData,
    listHealthDataForPatient,
    getAllPatients: async (req, res) => {
        try {
            logWithTime("📋 GET /patients endpoint called");
            
            const patients = await getAllPatients();
            
            return sendOkResponse(
                res,
                { patients, count: patients.length },
                `Retrieved ${patients.length} available patients`
            );
        } catch (err) {
            logWithTime(`❌ Error getting all patients: ${err.message}`);
            return res.status(INTERNAL_ERROR).json({
                success: false,
                statusCode: INTERNAL_ERROR,
                message: "Failed to retrieve patients",
                error: err.message
            });
        }
    }
};
