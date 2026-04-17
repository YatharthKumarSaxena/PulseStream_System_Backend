#!/usr/bin/env node

/**
 * 🧪 PulseStream Intelligent Test Data Generator
 * ✅ Respects TEST_MODE from .env
 * ✅ Asks user for number of patients
 * ✅ Generates random realistic health data
 * ✅ Streams to backend in real-time
 * ✅ Data cleared when stopped (non-persistent)
 */

require('dotenv').config();
const readline = require('readline');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_MODE = process.env.TEST_MODE === 'true';
const DATA_INTERVAL = parseInt(process.env.TEST_DATA_INTERVAL) || 2000;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m',
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
    log('═'.repeat(70), 'cyan');
    log(title, 'bold');
    log('═'.repeat(70), 'cyan');
}

// Random data generators
function getRandomBPM() {
    const random = Math.random();
    if (random > 0.85) return Math.floor(Math.random() * 50 + 110); // High
    if (random < 0.05) return Math.floor(Math.random() * 30 + 45);  // Low
    return Math.floor(Math.random() * 40 + 60);                     // Normal
}

function getRandomSpO2() {
    const random = Math.random();
    if (random > 0.90) return Math.round((Math.random() * 5 + 88) * 10) / 10; // Low
    return Math.round((Math.random() * 4 + 95) * 10) / 10;                    // Normal
}

function getRandomTemp() {
    const random = Math.random();
    if (random > 0.90) return Math.round((Math.random() * 3 + 38) * 10) / 10; // High
    return Math.round((Math.random() * 1.5 + 36.5) * 10) / 10;                // Normal
}

function getRandomHumidity() {
    return Math.floor(Math.random() * 30 + 30);
}

function generateHealthData(patientId) {
    return {
        patientId: patientId,
        bpm: getRandomBPM(),
        spo2: getRandomSpO2(),
        temp: getRandomTemp(),
        humidity: getRandomHumidity(),
        timestamp: new Date().toISOString()
    };
}

function getStatus(data) {
    if (data.spo2 < 90) return '🚨 CRITICAL';
    if (data.bpm > 120 || data.bpm < 50 || data.temp > 38) return '⚠️  WARNING';
    return '🟢 NORMAL';
}

function formatHealthData(data) {
    return `❤️  ${data.bpm} bpm | 🫁 ${data.spo2}% | 🌡️  ${data.temp}°C | 💧 ${data.humidity}%`;
}

function getPatientCountFromArgs() {
    // Get patient count from command line argument
    const arg = process.argv[2];
    let count = parseInt(arg) || 3;
    
    if (isNaN(count) || count < 1 || count > 10) {
        log('⚠️  Invalid patient count! Using default: 3 patients', 'yellow');
        count = 3;
    }
    
    return count;
}

function generatePatientIds(count) {
    const patients = [];
    for (let i = 1; i <= count; i++) {
        patients.push(`test_patient_${i}_${Date.now()}`);
    }
    return patients;
}

async function sendDataToBackend(patientId, healthData) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/heartbeats/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(healthData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function startTestDataGenerator(patientCount) {
    const patients = generatePatientIds(patientCount);
    let dataCount = 0;
    let errorCount = 0;

    logSection(`🚀 Starting Test Data Generation for ${patientCount} Patients`);
    log(`Patient IDs:`, 'blue');
    patients.forEach((pid, idx) => {
        log(`  ${idx + 1}. ${pid}`, 'cyan');
    });
    log(`\n⏱️  Interval: ${DATA_INTERVAL}ms between updates`, 'blue');
    log(`📍 Backend: ${BACKEND_URL}`, 'blue');
    log(`⏹️  Press Ctrl+C to stop\n`, 'yellow');

    const interval = setInterval(async () => {
        // Generate data for all patients
        for (const patientId of patients) {
            const healthData = generateHealthData(patientId);
            const status = getStatus(healthData);

            // Send to backend
            const success = await sendDataToBackend(patientId, healthData);

            if (success) {
                dataCount++;
                log(`[${dataCount}] ${new Date().toLocaleTimeString()} | ${patientId.substring(0, 20)}... | ${formatHealthData(healthData)} | ${status}`, 'green');
            } else {
                errorCount++;
            }
        }

        // Show status every 10 updates
        if (dataCount % (10 * patientCount) === 0) {
            log(`\n✅ Data points sent: ${dataCount} | Errors: ${errorCount}\n`, 'blue');
        }
    }, DATA_INTERVAL);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        clearInterval(interval);

        logSection('🛑 Test Generator Stopped');
        log(`📊 Total data points sent: ${dataCount}`, 'green');
        log(`❌ Total errors: ${errorCount}`, 'red');
        log(`⏱️  Run duration: ${((dataCount / patientCount) * DATA_INTERVAL / 1000).toFixed(1)} seconds`, 'green');
        log(`\n📝 Next Steps:`, 'cyan');
        log(`  1. Open Dashboard: http://localhost:5173`, 'cyan');
        log(`  2. Select Patient ID from list above`, 'cyan');
        log(`  3. Watch real-time data stream`, 'cyan');
        log(`  4. Stop backend to clear all data`, 'cyan');
        log(`\n✅ Data is NOT persistent - cleared when backend stops!\n`, 'yellow');

        rl.close();
        process.exit(0);
    });
}

async function main() {
    clear();

    logSection('🧪 PulseStream Intelligent Test Data Generator');

    if (!TEST_MODE) {
        log('\n⚠️  TEST_MODE is disabled in .env!', 'red');
        log('Set TEST_MODE=true in .env file to enable test data generation', 'yellow');
        log('\nEdit .env:', 'cyan');
        log('  TEST_MODE=true', 'cyan');
        log('  TEST_DATA_INTERVAL=2000\n', 'cyan');
        rl.close();
        process.exit(1);
    }

    log('✅ TEST_MODE enabled in .env\n', 'green');

    // Check backend connection
    log('🔍 Checking backend connection...', 'blue');
    try {
        const response = await fetch(`${BACKEND_URL}/health`, { timeout: 3000 });
        if (response.ok) {
            log('✅ Backend is running!\n', 'green');
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        log('\n❌ Cannot connect to backend at ' + BACKEND_URL, 'red');
        log('Make sure backend is running: npm start', 'yellow');
        rl.close();
        process.exit(1);
    }

    // Get patient count from command line argument
    const patientCount = getPatientCountFromArgs();
    log(`\n📊 Generating data for ${patientCount} patients\n`, 'cyan');

    // Start generating data
    await startTestDataGenerator(patientCount);
}

function clear() {
    console.clear();
}

// Run
main().catch(error => {
    log(`\n❌ Error: ${error.message}\n`, 'red');
    rl.close();
    process.exit(1);
});
