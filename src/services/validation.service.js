/**
 * Validation Service
 * Validates health data before storage and retrieval
 * Ensures data integrity and type safety
 */

const { logWithTime } = require("@utils/time-stamps.util");

/**
 * Validate health data object
 * Checks required fields and data types
 * 
 * @param {Object} data - Data to validate: { patientId, bpm, spo2, temp, humidity }
 * @returns {Object} Validation result: { isValid: boolean, errors: Array<string> }
 */
const validateHealthData = (data) => {
    const errors = [];
    
    logWithTime("🔍 Validating health data...");
    
    // Check if data object exists
    if (!data || typeof data !== "object") {
        errors.push("Data must be a valid object");
        return { isValid: false, errors };
    }
    
    // Validate patientId
    if (!data.patientId) {
        errors.push("patientId is required");
    } else if (typeof data.patientId !== "string" || data.patientId.trim() === "") {
        errors.push("patientId must be a non-empty string");
    }
    
    // Validate bpm
    if (data.bpm === undefined || data.bpm === null) {
        errors.push("bpm is required");
    } else if (typeof data.bpm !== "number" || isNaN(data.bpm)) {
        errors.push("bpm must be a valid number");
    } else if (data.bpm < 0 || data.bpm > 300) {
        errors.push("bpm must be between 0 and 300");
    }
    
    // Validate spo2
    if (data.spo2 === undefined || data.spo2 === null) {
        errors.push("spo2 is required");
    } else if (typeof data.spo2 !== "number" || isNaN(data.spo2)) {
        errors.push("spo2 must be a valid number");
    } else if (data.spo2 < 0 || data.spo2 > 100) {
        errors.push("spo2 must be between 0 and 100");
    }
    
    // Validate temp
    if (data.temp === undefined || data.temp === null) {
        errors.push("temp is required");
    } else if (typeof data.temp !== "number" || isNaN(data.temp)) {
        errors.push("temp must be a valid number");
    } else if (data.temp < 32 || data.temp > 110) {
        errors.push("temp must be between 32°F and 110°F");
    }
    
    // Validate humidity
    if (data.humidity === undefined || data.humidity === null) {
        errors.push("humidity is required");
    } else if (typeof data.humidity !== "number" || isNaN(data.humidity)) {
        errors.push("humidity must be a valid number");
    } else if (data.humidity < 0 || data.humidity > 100) {
        errors.push("humidity must be between 0 and 100");
    }
    
    if (errors.length > 0) {
        logWithTime(`❌ Validation failed: ${errors.join(", ")}`);
        return { isValid: false, errors };
    }
    
    logWithTime("✅ Health data validation passed");
    return { isValid: true, errors: [] };
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
