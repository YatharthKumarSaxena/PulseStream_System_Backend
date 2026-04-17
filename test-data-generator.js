/**
 * 🧪 Test Data Generator for PulseStream
 * Generates random real-time health data and sends to backend
 * Useful for testing dashboard without physical devices
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_PATIENT_ID = 'test_patient_' + Date.now(); // Unique patient ID per run
const DATA_INTERVAL = 2000; // Base interval (will be randomized)

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
    // Can be integer or decimal (like 45.3% or 52%)
    return Math.round((Math.random() * 30 + 30) * 10) / 10;
}

function generateHealthData() {
    // Flexible field generation: sometimes send all fields, sometimes partial
    const rand = Math.random();
    let data = {};
    
    // 60% chance: send all 4 fields
    if (rand < 0.60) {
        data = {
            bpm: getRandomBPM(),
            spo2: getRandomSpO2(),
            temp: getRandomTemp(),
            humidity: getRandomHumidity()
        };
    }
    // 20% chance: send bpm + spo2 only
    else if (rand < 0.80) {
        data = {
            bpm: getRandomBPM(),
            spo2: getRandomSpO2()
        };
    }
    // 10% chance: send temp + humidity only
    else if (rand < 0.90) {
        data = {
            temp: getRandomTemp(),
            humidity: getRandomHumidity()
        };
    }
    // 10% chance: send single random field
    else {
        const fieldChoice = Math.random();
        if (fieldChoice < 0.25) {
            data = { bpm: getRandomBPM() };
        } else if (fieldChoice < 0.50) {
            data = { spo2: getRandomSpO2() };
        } else if (fieldChoice < 0.75) {
            data = { temp: getRandomTemp() };
        } else {
            data = { humidity: getRandomHumidity() };
        }
    }
    
    return data;
}

// Get a random interval (1000-4000ms, random variation)
function getRandomInterval() {
    return Math.floor(Math.random() * 3000 + 1000);
}

function getStatus(data) {
    if (data.spo2 < 90) return '🚨 CRITICAL';
    if (data.bpm > 120 || data.bpm < 50 || data.temp > 38) return '⚠️  WARNING';
    return '🟢 NORMAL';
}

// Connection events
socket.on('connect', () => {
    console.log('✅ Connected to backend!\n');
    console.log('🚀 Starting to generate test data (flexible: random intervals, random fields)...\n');

    // Helper function to send data with random interval
    const sendDataWithRandomInterval = () => {
        const healthData = generateHealthData();
        dataCount++;

        // Display data being sent with field count
        const fieldCount = Object.keys(healthData).length;
        const status = getStatus(healthData);
        console.log(`[${dataCount}] ${new Date().toLocaleTimeString()} (${fieldCount} field${fieldCount !== 1 ? 's' : ''})`);
        
        // Show which fields are present
        const fields = [];
        if (healthData.bpm !== undefined) fields.push(`❤️  BPM: ${healthData.bpm}`);
        if (healthData.spo2 !== undefined) fields.push(`🫁 SpO2: ${healthData.spo2}%`);
        if (healthData.temp !== undefined) fields.push(`🌡️  Temp: ${healthData.temp}°C`);
        if (healthData.humidity !== undefined) fields.push(`💧 Humidity: ${healthData.humidity}%`);
        
        console.log(`    ${fields.join(' | ')}`);
        if (healthData.bpm || healthData.spo2 || healthData.temp || healthData.humidity) {
            console.log(`    Status: ${status}`);
        }
        
        const nextInterval = getRandomInterval();
        console.log(`    ⏱️  Next in ${nextInterval}ms\n`);

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
        
        // Schedule next send with random interval
        setTimeout(sendDataWithRandomInterval, nextInterval);
    };

    // Send first data immediately
    sendDataWithRandomInterval();

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n' + '='.repeat(70));
        console.log('🛑 Test Generator Stopped');
        console.log('='.repeat(70));
        console.log(`📊 Total data points sent: ${dataCount}`);
        console.log('='.repeat(70));
        console.log('\n✅ Now check your dashboard at http://localhost:5173');
        console.log('\n💡 Tip: Stop this generator with Ctrl+C');
        console.log('🔴 When backend stops, all data should be cleared from Redis\n');
        
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
console.log('1. This generator will send FLEXIBLE random health data to the backend');
console.log('   - Random intervals (1-4 seconds)');
console.log('   - Random field selection (all 4, pairs, or single fields)');
console.log('2. Open dashboard at http://localhost:5173');
console.log('3. Watch real-time data stream with variable data completeness!');
console.log('4. Stop backend (Ctrl+C in backend terminal)');
console.log('5. Data should disappear from Redis');
console.log('6. Press Ctrl+C here to stop generator\n');
