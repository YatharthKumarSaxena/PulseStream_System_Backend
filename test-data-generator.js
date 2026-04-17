/**
 * 🧪 Test Data Generator for PulseStream
 * Generates random real-time health data and sends to backend
 * Useful for testing dashboard without physical devices
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_PATIENT_ID = 'test_patient_' + Date.now(); // Unique patient ID per run
const DATA_INTERVAL = 2000; // Send data every 2 seconds

console.log('\n' + '='.repeat(70));
console.log('🧪 PulseStream Test Data Generator');
console.log('='.repeat(70));
console.log(`📍 Target: ${BACKEND_URL}`);
console.log(`👤 Patient ID: ${TEST_PATIENT_ID}`);
console.log(`⏱️  Interval: ${DATA_INTERVAL}ms`);
console.log('='.repeat(70) + '\n');

// Connect to backend
const socket = io(BACKEND_URL);

let dataCount = 0;

// Helper functions
function getRandomBPM() {
    // Normal: 60-100, occasional spikes
    const random = Math.random();
    if (random > 0.85) {
        return Math.floor(Math.random() * 50 + 110); // High: 110-160
    } else if (random < 0.05) {
        return Math.floor(Math.random() * 30 + 45); // Low: 45-75
    } else {
        return Math.floor(Math.random() * 40 + 60); // Normal: 60-100
    }
}

function getRandomSpO2() {
    // Normal: 95-99%, occasional drops
    const random = Math.random();
    if (random > 0.90) {
        return Math.round((Math.random() * 5 + 88) * 10) / 10; // Low: 88-93%
    } else {
        return Math.round((Math.random() * 4 + 95) * 10) / 10; // Normal: 95-99%
    }
}

function getRandomTemp() {
    // Normal: 36.5-37.5°C, occasional fever
    const random = Math.random();
    if (random > 0.90) {
        return Math.round((Math.random() * 3 + 38) * 10) / 10; // High: 38-41°C
    } else {
        return Math.round((Math.random() * 1.5 + 36.5) * 10) / 10; // Normal: 36.5-38°C
    }
}

function getRandomHumidity() {
    // Normal: 30-60%
    return Math.floor(Math.random() * 30 + 30);
}

function generateHealthData() {
    return {
        patientId: TEST_PATIENT_ID,
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

// Connection events
socket.on('connect', () => {
    console.log('✅ Connected to backend!\n');
    console.log('🚀 Starting to generate test data...\n');

    // Start sending data
    const interval = setInterval(() => {
        const healthData = generateHealthData();
        dataCount++;

        // Display data being sent
        const status = getStatus(healthData);
        console.log(`[${dataCount}] ${new Date().toLocaleTimeString()}`);
        console.log(`    ❤️  BPM: ${healthData.bpm} | 🫁 SpO2: ${healthData.spo2}% | 🌡️  Temp: ${healthData.temp}°C | 💧 Humidity: ${healthData.humidity}%`);
        console.log(`    Status: ${status}\n`);

        // Send to backend via HTTP POST (same as UI would do)
        fetch('http://localhost:3000/api/heartbeats/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(healthData)
        })
            .then(response => response.json())
            .then(result => {
                // Data sent successfully - backend will emit via Socket.IO
            })
            .catch(error => {
                console.error(`❌ Error sending data: ${error.message}`);
            });
    }, DATA_INTERVAL);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n' + '='.repeat(70));
        console.log('🛑 Test Generator Stopped');
        console.log('='.repeat(70));
        console.log(`📊 Total data points sent: ${dataCount}`);
        console.log(`⏱️  Run duration: ${(dataCount * DATA_INTERVAL / 1000).toFixed(1)} seconds`);
        console.log('='.repeat(70));
        console.log('\n✅ Now check your dashboard at http://localhost:5173');
        console.log('📍 Patient ID to select: ' + TEST_PATIENT_ID);
        console.log('\n💡 Tip: Stop this generator with Ctrl+C');
        console.log('🔴 When backend stops, all data should be cleared from Redis\n');
        
        clearInterval(interval);
        socket.disconnect();
        process.exit(0);
    });
});

socket.on('disconnect', () => {
    console.log('\n❌ Disconnected from backend');
    process.exit(1);
});

socket.on('error', (error) => {
    console.error('\n❌ Connection error:', error);
    process.exit(1);
});

console.log('\n📝 Instructions:');
console.log('1. This generator will send random health data to the backend');
console.log('2. Open dashboard at http://localhost:5173');
console.log('3. Enter Patient ID: ' + TEST_PATIENT_ID);
console.log('4. Watch real-time data stream in!');
console.log('5. Stop backend (Ctrl+C in backend terminal)');
console.log('6. Data should disappear from Redis');
console.log('7. Press Ctrl+C here to stop generator\n');
