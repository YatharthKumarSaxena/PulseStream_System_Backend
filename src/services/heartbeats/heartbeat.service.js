/**
 * Heartbeat Service
 * Manages health data storage, retrieval, and statistical calculations
 * Uses Redis sorted sets for efficient time-window queries
 * Compatible with redis@4.x
 */

const { getRedisClient } = require("@services/redis.service");
const {
    getCurrentTimeInMillis,
    getTwoHoursAgoInMillis,
    getMinutesAgoInMillis,
    logWithTime
} = require("@utils/time-stamps.util");
const { HEALTH_DATA_PREFIX, DATA_RETENTION_2_HOURS } = require("@configs/redis.config");

/**
 * Store health data in Redis
 * Format: Sorted set with patientId key, timestamp score, JSON data value
 * Automatically prunes data older than 2 hours
 * 
 * @param {string} patientId - Patient identifier
 * @param {Object} data - Health data: { bpm, spo2, temp, humidity }
 * @returns {Promise<Object>} Stored data with timestamp
 * @throws {Error} If storage fails
 */
const storeHealthData = async (patientId, data) => {
    try {
        const redisClient = getRedisClient();
        const timestamp = getCurrentTimeInMillis();
        const key = `${HEALTH_DATA_PREFIX}${patientId}`;
        
        // Store as JSON string in sorted set
        const dataWithTimestamp = {
            ...data,
            timestamp
        };
        
        logWithTime(`📊 Storing health data for patient ${patientId} at ${timestamp}`);
        
        // Add data to sorted set (score = timestamp)
        await redisClient.zAdd(key, {
            score: timestamp,
            value: JSON.stringify(dataWithTimestamp)
        });
        
        // Prune old data
        await pruneOldData(patientId);
        
        logWithTime(`✅ Health data stored for patient ${patientId}`);
        
        return dataWithTimestamp;
    } catch (err) {
        logWithTime(`❌ Error storing health data for patient ${patientId}`);
        throw err;
    }
};

/**
 * Retrieve data from Redis within a time window
 * @param {string} patientId - Patient identifier
 * @param {number} windowInMinutes - Time window in minutes
 * @returns {Promise<Array<Object>>} Array of health data points
 * @throws {Error} If retrieval fails
 */
const getHealthDataByWindow = async (patientId, windowInMinutes) => {
    try {
        const redisClient = getRedisClient();
        const key = `${HEALTH_DATA_PREFIX}${patientId}`;
        const startTime = getMinutesAgoInMillis(windowInMinutes);
        const endTime = getCurrentTimeInMillis();
        
        logWithTime(`📈 Fetching health data for patient ${patientId} (window: ${windowInMinutes} min)`);
        
        // Query sorted set by score (timestamp) range
        // Using zRange with BYSCORE option for range query
        const rawData = await redisClient.zRange(key, startTime, endTime, { BYSCORE: true });
        
        if (!rawData || rawData.length === 0) {
            logWithTime(`⚠️  No data found for patient ${patientId} in ${windowInMinutes} min window`);
            return [];
        }
        
        // Parse JSON strings back to objects
        const parsedData = rawData.map(item => {
            try {
                return JSON.parse(item);
            } catch (e) {
                logWithTime(`⚠️  Failed to parse data: ${item}`);
                return null;
            }
        }).filter(item => item !== null);
        
        logWithTime(`✅ Retrieved ${parsedData.length} data points for patient ${patientId}`);
        return parsedData;
    } catch (err) {
        logWithTime(`❌ Error retrieving health data for patient ${patientId}`);
        throw err;
    }
};

/**
 * Remove old data (older than 2 hours) for a patient
 * @param {string} patientId - Patient identifier
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
const pruneOldData = async (patientId) => {
    try {
        const redisClient = getRedisClient();
        const key = `${HEALTH_DATA_PREFIX}${patientId}`;
        const cutoffTime = getTwoHoursAgoInMillis();
        
        // Remove all data with score less than cutoffTime
        const deletedCount = await redisClient.zRemRangeByScore(key, "-inf", cutoffTime);
        
        if (deletedCount > 0) {
            logWithTime(`🧹 Pruned ${deletedCount} old data points for patient ${patientId}`);
        }
        
        return deletedCount;
    } catch (err) {
        logWithTime(`❌ Error pruning old data for patient ${patientId}`);
        throw err;
    }
};

/**
 * Calculate statistics (average, min, max) for a metric within time window
 * @param {Array<Object>} data - Array of health data points
 * @param {string} metric - Metric name (bpm, spo2, temp, humidity)
 * @returns {Object} Stats object with avg, min, max
 */
const calculateMetricStats = (data, metric) => {
    if (!data || data.length === 0) {
        return {
            average: null,
            minimum: null,
            maximum: null,
            dataPoints: 0
        };
    }
    
    const values = data
        .map(item => parseFloat(item[metric]))
        .filter(val => !isNaN(val));
    
    if (values.length === 0) {
        return {
            average: null,
            minimum: null,
            maximum: null,
            dataPoints: 0
        };
    }
    
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    
    return {
        average: Math.round(average * 100) / 100,
        minimum: Math.round(minimum * 100) / 100,
        maximum: Math.round(maximum * 100) / 100,
        dataPoints: values.length
    };
};

/**
 * Get comprehensive statistics for a patient within a time window
 * Calculates avg, min, max for bpm, spo2, temp, humidity
 * 
 * @param {string} patientId - Patient identifier
 * @param {number} windowInMinutes - Time window in minutes
 * @returns {Promise<Object>} Stats object with all metrics
 */
const getStats = async (patientId, windowInMinutes) => {
    try {
        logWithTime(`📊 Calculating stats for patient ${patientId} (${windowInMinutes} min window)`);
        
        const data = await getHealthDataByWindow(patientId, windowInMinutes);
        
        const stats = {
            bpm: calculateMetricStats(data, "bpm"),
            spo2: calculateMetricStats(data, "spo2"),
            temp: calculateMetricStats(data, "temp"),
            humidity: calculateMetricStats(data, "humidity"),
            windowInMinutes,
            totalDataPoints: data.length,
            timestamp: getCurrentTimeInMillis()
        };
        
        logWithTime(`✅ Stats calculated for patient ${patientId}`);
        return stats;
    } catch (err) {
        logWithTime(`❌ Error calculating stats for patient ${patientId}`);
        throw err;
    }
};

/**
 * Get the latest health data point for a patient
 * @param {string} patientId - Patient identifier
 * @returns {Promise<Object|null>} Latest health data or null if no data
 */
const getLatestHealthData = async (patientId) => {
    try {
        const redisClient = getRedisClient();
        const key = `${HEALTH_DATA_PREFIX}${patientId}`;
        
        // Get last item from sorted set (highest score = most recent)
        // Using zRange with -1 index to get last item
        const rawData = await redisClient.zRange(key, -1, -1);
        
        if (!rawData || rawData.length === 0) {
            return null;
        }
        
        return JSON.parse(rawData[0]);
    } catch (err) {
        logWithTime(`❌ Error retrieving latest health data for patient ${patientId}`);
        throw err;
    }
};

/**
 * Get all health data for a patient (paginated)
 * @param {string} patientId - Patient identifier
 * @param {number} skip - Number of records to skip
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array<Object>>} Paginated health data
 */
const listHealthData = async (patientId, skip = 0, limit = 100) => {
    try {
        const redisClient = getRedisClient();
        const key = `${HEALTH_DATA_PREFIX}${patientId}`;
        
        logWithTime(`📋 Listing health data for patient ${patientId} (skip: ${skip}, limit: ${limit})`);
        
        // Get total count
        const totalCount = await redisClient.zCard(key);
        
        // Get paginated data (reverse order - newest first)
        const startIdx = Math.max(0, totalCount - skip - limit);
        const endIdx = totalCount - skip - 1;
        
        let rawData = [];
        if (startIdx <= endIdx) {
            rawData = await redisClient.zRange(key, startIdx, endIdx);
        }
        
        const data = rawData.map(item => JSON.parse(item)).reverse();
        
        logWithTime(`✅ Retrieved ${data.length} records for patient ${patientId}`);
        
        return {
            data,
            total: totalCount,
            skip,
            limit,
            count: data.length
        };
    } catch (err) {
        logWithTime(`❌ Error listing health data for patient ${patientId}`);
        throw err;
    }
};

/**
 * Get all available patient IDs with data in Redis
 * @returns {Promise<Array<string>>} Array of patient IDs
 */
const getAllPatients = async () => {
    try {
        const redisClient = getRedisClient();
        
        // Query for all keys with HEALTH_DATA_PREFIX
        const pattern = `${HEALTH_DATA_PREFIX}*`;
        const keys = await redisClient.keys(pattern);
        
        // Extract patient IDs by removing the prefix
        const patients = keys.map(key => key.replace(HEALTH_DATA_PREFIX, ''));
        
        logWithTime(`✅ Found ${patients.length} patients with data`);
        
        return patients;
    } catch (err) {
        logWithTime(`❌ Error getting all patients: ${err.message}`);
        throw err;
    }
};

module.exports = {
    storeHealthData,
    getHealthDataByWindow,
    pruneOldData,
    getStats,
    getLatestHealthData,
    listHealthData,
    getAllPatients
};
