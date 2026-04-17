/**
 * Validation Service
 * Validates health data before storage and retrieval
 * Ensures data integrity and type safety
 */

const { logWithTime } = require("@utils/time-stamps.util");

/**
 * Validate health data object
 * Checks required fields and data types
 * patientId is optional - backend assigns default if not provided
 * 
 * @param {Object} data - Data to validate: { bpm, spo2, temp, humidity, patientId (optional) }
 * @returns {Object} Validation result: { isValid: boolean, errors: Array<string> }
 */
const validateHealthData = (data) => {
    const errors = [];
    const cleanedData = {};
    
    logWithTime("🔍 Validating health data...");
    
    // Check if data object exists
    if (!data || typeof data !== "object") {
        errors.push("Data must be a valid object");
        return { isValid: false, errors };
    }
    
    // patientId is optional
    cleanedData.patientId = data.patientId || null;
    if (data.patientId && (typeof data.patientId !== "string" || data.patientId.trim() === "")) {
        cleanedData.patientId = null;
    }
    
    // Helper function to validate and clean a metric
    const validateMetric = (value, metric, min, max) => {
        if (value === undefined || value === null) {
            return null;
        }
        if (typeof value !== "number" || isNaN(value)) {
            logWithTime(`⚠️  ${metric} invalid type (${value}), setting to null`);
            return null;
        }
        if (value < min || value > max) {
            logWithTime(`⚠️  ${metric} out of range (${value}), setting to null`);
            return null;
        }
        return value;
    };
    
    // Validate all metrics - set to null if invalid
    cleanedData.bpm = validateMetric(data.bpm, "BPM", 0, 300);
    cleanedData.spo2 = validateMetric(data.spo2, "SpO2", 0, 100);
    cleanedData.temp = validateMetric(data.temp, "Temp", 32, 110);
    cleanedData.humidity = validateMetric(data.humidity, "Humidity", 0, 100);
    
    // Check if at least ONE metric is valid (not all null)
    const hasValidMetric = cleanedData.bpm !== null || cleanedData.spo2 !== null || 
                          cleanedData.temp !== null || cleanedData.humidity !== null;
    
    if (!hasValidMetric) {
        errors.push("At least one metric (bpm, spo2, temp, humidity) must be valid");
        logWithTime(`❌ Validation failed: no valid metrics`);
        return { isValid: false, errors };
    }
    
    logWithTime("✅ Health data validation passed");
    return { isValid: true, errors: [], cleanedData };
};

/**
 * Validate patientId
 * @param {string} patientId - Patient ID to validate
 * @returns {Object} Validation result
 */
const validatePatientId = (patientId) => {
    const errors = [];
    
    if (!patientId) {
        errors.push("patientId is required");
    } else if (typeof patientId !== "string" || patientId.trim() === "") {
        errors.push("patientId must be a non-empty string");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate time window in minutes
 * @param {number} windowInMinutes - Time window in minutes
 * @returns {Object} Validation result
 */
const validateTimeWindow = (windowInMinutes) => {
    const errors = [];
    
    if (windowInMinutes === undefined || windowInMinutes === null) {
        errors.push("windowInMinutes is required");
    } else if (typeof windowInMinutes !== "number" || isNaN(windowInMinutes)) {
        errors.push("windowInMinutes must be a valid number");
    } else if (windowInMinutes < 1 || windowInMinutes > 1440) {
        errors.push("windowInMinutes must be between 1 and 1440 (24 hours)");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Sanitize health data by converting to proper types
 * @param {Object} data - Raw health data
 * @returns {Object} Sanitized data
 */
const sanitizeHealthData = (data) => {
    return {
        patientId: String(data.patientId).trim(),
        bpm: parseFloat(data.bpm),
        spo2: parseFloat(data.spo2),
        temp: parseFloat(data.temp),
        humidity: parseFloat(data.humidity)
    };
};

module.exports = {
    validateHealthData,
    validatePatientId,
    validateTimeWindow,
    sanitizeHealthData
};
