/**
 * Heartbeat Routes
 * Defines HTTP endpoints for health data operations
 */

const express = require("express");
const router = express.Router();
const {
    postHealthData,
    getStatsForPatient,
    getLatestData,
    listHealthDataForPatient,
    getAllPatients
} = require("@controllers/heartbeats/heartbeat.controller");
const { logWithTime } = require("@utils/time-stamps.util");

/**
 * POST /data
 * Store new health data
 */
router.post("/data", async (req, res, next) => {
    try {
        await postHealthData(req, res);
    } catch (err) {
        logWithTime(`❌ Error in POST /data: ${err.message}`);
        next(err);
    }
});

/**
 * GET /stats/:patientId
 * Get statistics for a patient
 * Query: ?window=15 (in minutes)
 */
router.get("/stats/:patientId", async (req, res, next) => {
    try {
        await getStatsForPatient(req, res);
    } catch (err) {
        logWithTime(`❌ Error in GET /stats: ${err.message}`);
        next(err);
    }
});

/**
 * GET /data/:patientId
 * Get latest health data for a patient
 */
router.get("/data/:patientId", async (req, res, next) => {
    try {
        await getLatestData(req, res);
    } catch (err) {
        logWithTime(`❌ Error in GET /data: ${err.message}`);
        next(err);
    }
});

/**
 * GET /list/:patientId
 * List all health data for a patient (paginated)
 * Query: ?skip=0&limit=100
 */
router.get("/list/:patientId", async (req, res, next) => {
    try {
        await listHealthDataForPatient(req, res);
    } catch (err) {
        logWithTime(`❌ Error in GET /list: ${err.message}`);
        next(err);
    }
});

/**
 * GET /patients
 * Get list of all available patients with data
 */
router.get("/patients", async (req, res, next) => {
    try {
        await getAllPatients(req, res);
    } catch (err) {
        logWithTime(`❌ Error in GET /patients: ${err.message}`);
        next(err);
    }
});

module.exports = router;
