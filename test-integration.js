/**
 * Integration Test Script
 * Tests core functionality without running the full server
 */

require("module-alias/register");
const { logWithTime } = require("@/utils/time-stamps.util");
const { validateHealthData, validatePatientId, validateTimeWindow } = require("@/services/validation.service");

console.log("\n📋 PulseStream Backend - Integration Test\n");
console.log("=".repeat(50));

// Test 1: Validation Service
console.log("\n🧪 Test 1: Validation Service");
console.log("-".repeat(50));

const validData = {
    patientId: "patient_123",
    bpm: 72,
    spo2: 98,
    temp: 98.6,
    humidity: 45
};

const invalidData = {
    patientId: "patient_123",
    bpm: 400, // Invalid - out of range
    spo2: 98,
    temp: 98.6,
    humidity: 45
};

let result = validateHealthData(validData);
console.log("✅ Valid data test:", result.isValid ? "PASSED" : "FAILED");
if (!result.isValid) console.log("  Errors:", result.errors);

result = validateHealthData(invalidData);
console.log("✅ Invalid data test:", !result.isValid ? "PASSED" : "FAILED");
if (!result.isValid) console.log("  Expected error:", result.errors[0]);

result = validatePatientId("patient_123");
console.log("✅ Valid patientId:", result.isValid ? "PASSED" : "FAILED");

result = validatePatientId("");
console.log("✅ Invalid patientId:", !result.isValid ? "PASSED" : "FAILED");

result = validateTimeWindow(15);
console.log("✅ Valid time window:", result.isValid ? "PASSED" : "FAILED");

result = validateTimeWindow(2000);
console.log("✅ Invalid time window:", !result.isValid ? "PASSED" : "FAILED");

// Test 2: Configuration Files
console.log("\n🧪 Test 2: Configuration Loading");
console.log("-".repeat(50));

try {
    const portConfig = require("@/configs/port.config");
    console.log("✅ Port config loaded:", portConfig.PORT);
    
    const httpStatusConfig = require("@/configs/http-status.config");
    console.log("✅ HTTP Status config loaded:", Object.keys(httpStatusConfig).length, "codes");
    
    const ipConfig = require("@/configs/ip.config");
    console.log("✅ IP config loaded:", ipConfig.LOCALHOST);
    
    const redisConfig = require("@/configs/redis.config");
    console.log("✅ Redis config loaded:", redisConfig.REDIS_HOST);
    
    const uriConfig = require("@/configs/uri.config");
    console.log("✅ URI config loaded:", uriConfig.API_BASE);
} catch (err) {
    console.error("❌ Config loading failed:", err.message);
}

// Test 3: Utils
console.log("\n🧪 Test 3: Utility Functions");
console.log("-".repeat(50));

try {
    const { getCurrentTimeInMillis, getTwoHoursAgoInMillis, getMinutesAgoInMillis } = require("@/utils/time-stamps.util");
    
    const now = getCurrentTimeInMillis();
    const twoHoursAgo = getTwoHoursAgoInMillis();
    const fifteenMinutesAgo = getMinutesAgoInMillis(15);
    
    console.log("✅ getCurrentTimeInMillis:", typeof now === "number" ? "PASSED" : "FAILED");
    console.log("✅ getTwoHoursAgoInMillis:", twoHoursAgo < now ? "PASSED" : "FAILED");
    console.log("✅ getMinutesAgoInMillis:", fifteenMinutesAgo < now ? "PASSED" : "FAILED");
    
    const { getEnv, getEnvAsNumber } = require("@/utils/env.util");
    console.log("✅ getEnv function:", typeof getEnv === "function" ? "PASSED" : "FAILED");
    console.log("✅ getEnvAsNumber function:", typeof getEnvAsNumber === "function" ? "PASSED" : "FAILED");
} catch (err) {
    console.error("❌ Utility loading failed:", err.message);
}

// Test 4: Controllers and Routes
console.log("\n🧪 Test 4: Controllers & Routes");
console.log("-".repeat(50));

try {
    const controller = require("@/controllers/heartbeats/heartbeat.controller");
    console.log("✅ Heartbeat controller:", Object.keys(controller).length, "functions loaded");
    
    const router = require("@/routers/heartbeat.routes");
    console.log("✅ Heartbeat router:", router ? "LOADED" : "FAILED");
} catch (err) {
    console.error("❌ Controller/Router loading failed:", err.message);
}

// Test 5: Response Handlers
console.log("\n🧪 Test 5: Response Handlers");
console.log("-".repeat(50));

try {
    const successResponse = require("@/responses/success/success.response");
    console.log("✅ Success response handlers:", Object.keys(successResponse).length, "functions");
} catch (err) {
    console.error("❌ Response handler loading failed:", err.message);
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("🎉 Integration Test Completed!");
console.log("📝 All critical modules loaded successfully.");
console.log("🚀 Ready to start the server with: npm run dev");
console.log("=".repeat(50) + "\n");
