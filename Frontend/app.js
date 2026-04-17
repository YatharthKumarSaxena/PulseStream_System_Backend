/**
 * PulseStream Health Monitoring Dashboard
 * Real-time monitoring with Socket.IO and Chart.js
 */

// ========================================
// Configuration
// ========================================

const BACKEND_URL = 'http://localhost:3000';
const MAX_CHART_POINTS = 100;
const CHART_COLORS = {
    bpm: 'rgb(239, 68, 68)',
    spo2: 'rgb(34, 197, 94)',
    temp: 'rgb(245, 158, 11)',
    humidity: 'rgb(59, 130, 246)'
};

// ========================================
// State Management
// ========================================

let state = {
    socket: null,
    currentPatient: null,
    currentWindow: 15, // minutes
    isConnected: false,
    nightMode: localStorage.getItem('nightMode') === 'true',
    chartInstances: {},
    chartData: {
        bpm: [],
        spo2: [],
        temp: [],
        humidity: []
    },
    metrics: {
        bpm: { current: null, avg: null, min: null, max: null },
        spo2: { current: null, avg: null, min: null, max: null },
        temp: { current: null, avg: null, min: null, max: null },
        humidity: { current: null, avg: null, min: null, max: null }
    },
    // Raw data with timestamps for time window filtering
    rawChartData: {
        bpm: [],
        spo2: [],
        temp: [],
        humidity: []
    }
};

// ========================================
// Socket.IO Connection
// ========================================

function initializeSocket() {
    console.log('🔌 Attempting to connect to Socket.IO...');
    state.socket = io(BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket']
    });

    // Connection events
    state.socket.on('connect', handleConnect);
    state.socket.on('disconnect', handleDisconnect);
    state.socket.on('connect_error', handleConnectError);

    // Data events
    state.socket.on('healthData', handleHealthData);
    state.socket.on('error', handleSocketError);
    
    // 🔴 DEBUG: Log all events
    state.socket.onAny((event, ...args) => {
        if (event !== 'healthData') {
            console.log(`📨 Socket event: ${event}`, args);
        }
    });
}

function handleConnect() {
    console.log('✅ Connected to backend');
    state.isConnected = true;
    updateConnectionStatus(true);

    // 🔴 DEBUG
    console.log(`🔌 Socket ID: ${state.socket.id}`);
    console.log(`🔌 Connected: ${state.socket.connected}`);

    // Fetch available patients and auto-select first one
    fetchAndSelectFirstPatient();
}

async function fetchAndSelectFirstPatient() {
    try {
        // Since we're using default_patient, just initialize the socket connection
        if (state.socket && state.socket.connected) {
            console.log('📊 Initializing connection for default_patient');
            state.currentPatient = 'default_patient';
            updatePatientsCount(1);
            
            // Emit selectPatient event to subscribe to default_patient data
            state.socket.emit('selectPatient', 'default_patient');
            
            // Try to fetch initial data
            try {
                const response = await fetch(`${BACKEND_URL}/api/heartbeats/data/default_patient`);
                if (response.ok) {
                    const result = await response.json();
                    console.log('📦 Initial data received:', result);
                    if (result.data) {
                        handleHealthData(result.data);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Initial data fetch failed (waiting for real-time data):', e);
            }
        } else {
            console.warn('⚠️ Socket not connected yet');
            setTimeout(fetchAndSelectFirstPatient, 1000);
        }
    } catch (err) {
        console.error('❌ Error initializing patient:', err);
        setTimeout(fetchAndSelectFirstPatient, 2000);
    }
}

function handleDisconnect() {
    console.log('❌ Disconnected from backend');
    state.isConnected = false;
    updateConnectionStatus(false);
    updateStatus('DISCONNECTED', '❌', 'error');
}

function handleConnectError(error) {
    console.error('❌ Connection error:', error);
    updateConnectionStatus(false);
}

function handleSocketError(error) {
    console.error('❌ Socket error:', error);
}

// ========================================
// Data Handling
// ========================================

function handleHealthData(data) {
    try {
        console.log('🔥 REAL-TIME DATA RECEIVED:', data);
        state.lastDataReceived = new Date();
        
        if (!data) {
            console.warn('⚠️ Received null/undefined data');
            return;
        }

        // Parse data - backend format: { current: {...}, stats: {...} }
        const currentData = data.current || data.latestData || data || {};
        const statsData = data.stats || {};

        // 🔴 DEBUG: Log incoming values
        console.log(`   📥 Current Values: BPM=${currentData.bpm}, SpO2=${currentData.spo2}, Temp=${currentData.temp}, Humidity=${currentData.humidity}, TS=${currentData.timestamp}`);
        console.log(`   📊 Stats: BPM_Avg=${statsData.bpm?.average}, SpO2_Avg=${statsData.spo2?.average}`);

        // Validate data has at least one metric
        if (!currentData.bpm && !currentData.spo2 && !currentData.temp && !currentData.humidity) {
            console.warn('⚠️ No valid metrics in received data');
            return;
        }

        console.log('✅ Data validation passed');
        console.log('   Current:', currentData);
        console.log('   Stats:', statsData);

        // Update internal metrics state
        updateMetrics({ current: currentData, stats: statsData });
        
        // Update charts
        addToChartData(currentData);
        updateCharts();
        
        // Update UI displays - pass current data for display functions
        updateMetricsDisplay(currentData, statsData);
        updateStatus(determineStatus(currentData), getStatusIcon(currentData));
        updateLastUpdate();
        
        console.log('✅ handleHealthData completed successfully\n');
    } catch (error) {
        console.error('❌ Error in handleHealthData:', error);
    }
}

function updateMetrics(data) {
    // Transform backend stats format to frontend format
    // Backend: { bpm: { average, minimum, maximum }, spo2: {...}, humidity: {...} }
    // Frontend: { bpm: { current, avg, min, max }, spo2: {...}, humidity: {...} }
    
    state.metrics = {
        bpm: {
            current: data.current.bpm,
            avg: data.stats.bpm?.average ?? null,
            min: data.stats.bpm?.minimum ?? null,
            max: data.stats.bpm?.maximum ?? null
        },
        spo2: {
            current: data.current.spo2,
            avg: data.stats.spo2?.average ?? null,
            min: data.stats.spo2?.minimum ?? null,
            max: data.stats.spo2?.maximum ?? null
        },
        temp: {
            current: data.current.temp,
            avg: data.stats.temp?.average ?? null,
            min: data.stats.temp?.minimum ?? null,
            max: data.stats.temp?.maximum ?? null
        },
        humidity: {
            current: data.current.humidity,
            avg: data.stats.humidity?.average ?? null,
            min: data.stats.humidity?.minimum ?? null,
            max: data.stats.humidity?.maximum ?? null
        }
    };
    console.log('📊 Metrics updated from backend stats:', state.metrics);
}

function addToChartData(current) {
    // Get current timestamp in milliseconds
    const nowMs = Date.now();
    const timestamp = new Date().toLocaleTimeString();

    // Store raw data with actual timestamp (for time window filtering)
    // Keep null values as null so they don't appear as 0 on charts
    state.rawChartData.bpm.push({
        x: timestamp,
        y: current.bpm !== undefined && current.bpm !== null ? current.bpm : null,
        t: nowMs // timestamp in milliseconds
    });
    state.rawChartData.spo2.push({
        x: timestamp,
        y: current.spo2 !== undefined && current.spo2 !== null ? current.spo2 : null,
        t: nowMs
    });
    state.rawChartData.temp.push({
        x: timestamp,
        y: current.temp !== undefined && current.temp !== null ? current.temp : null,
        t: nowMs
    });
    state.rawChartData.humidity.push({
        x: timestamp,
        y: current.humidity !== undefined && current.humidity !== null ? current.humidity : null,
        t: nowMs
    });

    // Filter data based on current time window
    filterChartDataByTimeWindow();

    // Calculate stats from filtered chart data
    calculateStatsFromAccumulatedData();

    // Update metrics display immediately with current and null statsData (will use calculated stats)
    updateMetricsDisplay(current, {});

    // Update charts
    updateCharts();
}

/**
 * Filter chart data based on current time window (in minutes)
 * Keeps only data points from the last N minutes
 */
function filterChartDataByTimeWindow() {
    const windowMs = state.currentWindow * 60 * 1000; // Convert minutes to milliseconds
    const cutoffTime = Date.now() - windowMs;

    // Filter each metric's data to only include points within the time window
    state.chartData.bpm = state.rawChartData.bpm.filter(point => point.t >= cutoffTime);
    state.chartData.spo2 = state.rawChartData.spo2.filter(point => point.t >= cutoffTime);
    state.chartData.temp = state.rawChartData.temp.filter(point => point.t >= cutoffTime);
    state.chartData.humidity = state.rawChartData.humidity.filter(point => point.t >= cutoffTime);

    // Keep only last 100 points for display even within window
    const MAX_DISPLAY_POINTS = 100;
    if (state.chartData.bpm.length > MAX_DISPLAY_POINTS) {
        state.chartData.bpm = state.chartData.bpm.slice(-MAX_DISPLAY_POINTS);
    }
    if (state.chartData.spo2.length > MAX_DISPLAY_POINTS) {
        state.chartData.spo2 = state.chartData.spo2.slice(-MAX_DISPLAY_POINTS);
    }
    if (state.chartData.temp.length > MAX_DISPLAY_POINTS) {
        state.chartData.temp = state.chartData.temp.slice(-MAX_DISPLAY_POINTS);
    }
    if (state.chartData.humidity.length > MAX_DISPLAY_POINTS) {
        state.chartData.humidity = state.chartData.humidity.slice(-MAX_DISPLAY_POINTS);
    }

    console.log(`📊 Filtered data for ${state.currentWindow}min window - BPM: ${state.chartData.bpm.length} points`);
}

/**
 * Calculate AVG/MIN/MAX from accumulated chart data
 * This ensures stats are available immediately from first data point
 * No need to wait for backend stats calculation
 */
function calculateStatsFromAccumulatedData() {
    const calculateMetricStats = (dataArray, metricName) => {
        if (!dataArray || dataArray.length === 0) {
            return { avg: null, min: null, max: null, dataPoints: 0, timeRange: '0m' };
        }
        
        // Filter out null and NaN values (only keep valid numbers)
        const values = dataArray.map(point => point.y).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (values.length === 0) {
            return { avg: null, min: null, max: null, dataPoints: 0, timeRange: '0m' };
        }
        
        // Calculate actual time range from data
        const timestamps = dataArray.map(point => point.t).filter(t => t);
        let timeRangeMinutes = '?';
        if (timestamps.length >= 2) {
            const timeSpanMs = Math.max(...timestamps) - Math.min(...timestamps);
            timeRangeMinutes = Math.round(timeSpanMs / 60000); // Convert ms to minutes
        }
        
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return {
            avg: Math.round(avg * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            dataPoints: values.length,
            timeRange: `${timeRangeMinutes}m`
        };
    };
    
    // Update stats from accumul ated chart data (filtered by time window)
    const bpmStats = calculateMetricStats(state.chartData.bpm, 'bpm');
    const spo2Stats = calculateMetricStats(state.chartData.spo2, 'spo2');
    const tempStats = calculateMetricStats(state.chartData.temp, 'temp');
    const humidityStats = calculateMetricStats(state.chartData.humidity, 'humidity');
    
    state.metrics.bpm = {
        current: state.metrics.bpm.current,
        avg: bpmStats.avg,
        min: bpmStats.min,
        max: bpmStats.max
    };
    
    state.metrics.spo2 = {
        current: state.metrics.spo2.current,
        avg: spo2Stats.avg,
        min: spo2Stats.min,
        max: spo2Stats.max
    };
    
    state.metrics.temp = {
        current: state.metrics.temp.current,
        avg: tempStats.avg,
        min: tempStats.min,
        max: tempStats.max
    };
    
    state.metrics.humidity = {
        current: state.metrics.humidity.current,
        avg: humidityStats.avg,
        min: humidityStats.min,
        max: humidityStats.max
    };
    
    console.log(`📈 Stats from actual data window (Requested: ${state.currentWindow}m)`);
    console.log(`   BPM ${bpmStats.timeRange} (${bpmStats.dataPoints} points): Avg=${bpmStats.avg}, Min=${bpmStats.min}, Max=${bpmStats.max}`);
    console.log(`   SpO2 ${spo2Stats.timeRange}: Avg=${spo2Stats.avg}, Min=${spo2Stats.min}, Max=${spo2Stats.max}`);
    console.log(`   Temp ${tempStats.timeRange}: Avg=${tempStats.avg}, Min=${tempStats.min}, Max=${tempStats.max}`);
}

// ========================================
// UI Updates
// ========================================

function updateMetricsDisplay(currentData, statsData) {
    const metrics = state.metrics;

    // Update BPM
    updateMetricCard('bpm', metrics.bpm, currentData.bpm);

    // Update SpO2
    updateMetricCard('spo2', metrics.spo2, currentData.spo2);

    // Update Temperature
    updateMetricCard('temp', metrics.temp, currentData.temp);

    // Update Humidity
    updateMetricCard('humidity', metrics.humidity, currentData.humidity);
}

function updateMetricCard(metric, stats, current) {
    const card = document.getElementById(`${metric}Card`);
    if (!card) return;

    // Update current value
    const currentEl = document.getElementById(`${metric}Current`);
    if (currentEl) {
        const value = current !== null ? formatValue(current, metric) : '--';
        currentEl.textContent = value;
    }

    // Update stats (using transformed metric names: avg, min, max)
    const avgEl = document.getElementById(`${metric}Avg`);
    if (avgEl) avgEl.textContent = stats.avg !== null && stats.avg !== undefined ? formatValue(stats.avg, metric) : '--';

    const minEl = document.getElementById(`${metric}Min`);
    if (minEl) minEl.textContent = stats.min !== null && stats.min !== undefined ? formatValue(stats.min, metric) : '--';

    const maxEl = document.getElementById(`${metric}Max`);
    if (maxEl) maxEl.textContent = stats.max !== null && stats.max !== undefined ? formatValue(stats.max, metric) : '--';

    console.log(`📈 Updated ${metric} card: Avg=${stats.avg}, Min=${stats.min}, Max=${stats.max}`);

    // Update card styling based on value
    updateCardStyling(card, metric, current);
}

function updateCardStyling(card, metric, value) {
    // Remove previous status classes
    card.classList.remove('abnormal', 'critical');

    if (value === null) return;

    const status = determineMetricStatus(metric, value);

    if (status === 'critical') {
        card.classList.add('critical');
    } else if (status === 'warning') {
        card.classList.add('abnormal');
    }
}

function formatValue(value, metric) {
    if (value === null) return '--';

    if (metric === 'temp') {
        return value.toFixed(1);
    } else if (metric === 'humidity') {
        return value.toFixed(1);  // Show with 1 decimal like temperature
    } else if (metric === 'spo2') {
        return Math.round(value);
    } else {
        return Math.round(value);
    }
}

// ========================================
// Status Determination
// ========================================

function determineStatus(current) {
    // CRITICAL: SpO2 < 90
    if ((current.spo2 || 100) < 90) {
        return 'CRITICAL';
    }

    // WARNING: BPM > 120 OR BPM < 50 OR Temperature > 38°C
    const bpm = current.bpm || 0;
    const temp = current.temp || 36.5;

    if (bpm > 120 || bpm < 50 || temp > 38) {
        return 'WARNING';
    }

    return 'NORMAL';
}

function determineMetricStatus(metric, value) {
    if (value === null) return 'normal';

    if (metric === 'spo2') {
        if (value < 90) return 'critical';
        if (value < 95) return 'warning';
    } else if (metric === 'bpm') {
        if (value > 120 || value < 50) return 'warning';
    } else if (metric === 'temp') {
        if (value > 38) return 'warning';
    }

    return 'normal';
}

function getStatusIcon(current) {
    const status = determineStatus(current);

    if (status === 'CRITICAL') return '🚨';
    if (status === 'WARNING') return '⚠️';
    return '🟢';
}

function updateStatus(status, icon, type = null) {
    const banner = document.getElementById('statusBanner');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');

    statusIcon.textContent = icon;
    statusText.textContent = status;

    // Update banner styling
    banner.classList.remove('normal', 'warning', 'critical');

    if (status === 'CRITICAL') {
        banner.classList.add('critical');
    } else if (status === 'WARNING') {
        banner.classList.add('warning');
    } else if (status === 'NORMAL') {
        banner.classList.add('normal');
    }
}

function updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById('connectionStatus');
    if (isConnected) {
        statusEl.textContent = '🟢 Connected';
        statusEl.classList.add('connected');
    } else {
        statusEl.textContent = '🔴 Disconnected';
        statusEl.classList.remove('connected');
    }
}

function updateLastUpdate() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    const now = new Date();
    lastUpdateEl.textContent = now.toLocaleTimeString();
}

// ========================================
// Chart Management
// ========================================

function initializeCharts() {
    const chartConfigs = [
        {
            id: 'bpmChart',
            metric: 'bpm',
            label: 'Heart Rate (BPM)',
            color: CHART_COLORS.bpm,
            min: -50,
            max: 250
        },
        {
            id: 'spo2Chart',
            metric: 'spo2',
            label: 'Oxygen Level (%)',
            color: CHART_COLORS.spo2,
            min: 80,
            max: 100
        },
        {
            id: 'tempChart',
            metric: 'temp',
            label: 'Temperature (°C)',
            color: CHART_COLORS.temp,
            min: 10,
            max: 60
        },
        {
            id: 'humidityChart',
            metric: 'humidity',
            label: 'Humidity (%)',
            color: CHART_COLORS.humidity,
            min: 0,
            max: 100
        }
    ];

    chartConfigs.forEach(config => {
        const canvas = document.getElementById(config.id);
        if (!canvas) return;

        state.chartInstances[config.metric] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: config.label,
                        data: [],
                        borderColor: config.color,
                        backgroundColor: config.color + '15',
                        borderWidth: 3,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: config.color,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12, weight: '600' }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: config.min,
                        max: config.max,
                        ticks: { 
                            font: { size: 11 },
                            stepSize: config.metric === 'temp' ? 10 : (config.metric === 'bpm' ? 50 : undefined)
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        ticks: { font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    });
}

function updateCharts() {
    Object.keys(state.chartInstances).forEach(metric => {
        const chart = state.chartInstances[metric];
        if (!chart) return;

        const data = state.chartData[metric];

        // Update labels and data
        chart.data.labels = data.map(point => point.x);
        chart.data.datasets[0].data = data.map(point => point.y);

        chart.update('none'); // Update without animation for smooth real-time updates
    });
}

// ========================================
// Event Handlers
// ========================================

function changeTimeWindow(minutes) {
    if (!state.socket) {
        alert('Not connected to backend. Please wait...');
        return;
    }

    console.log(`⏱️ Changing time window to ${minutes} minutes`);
    state.currentWindow = minutes;

    // Emit Socket.IO event
    state.socket.emit('changeWindow', minutes);

    // Re-filter data for new time window
    filterChartDataByTimeWindow();
    calculateStatsFromAccumulatedData();
    updateCharts();

    // Update button states
    document.querySelectorAll('.btn-window').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.window) === minutes) {
            btn.classList.add('active');
        }
    });
}

function clearMetricsDisplay() {
    ['bpm', 'spo2', 'temp', 'humidity'].forEach(metric => {
        document.getElementById(`${metric}Current`).textContent = '--';
        document.getElementById(`${metric}Avg`).textContent = '--';
        document.getElementById(`${metric}Min`).textContent = '--';
        document.getElementById(`${metric}Max`).textContent = '--';
    });

    updateStatus('No Data', '--', 'info');
}

// ========================================
// Event Listeners
// ========================================

function attachEventListeners() {
    // Time window buttons
    document.querySelectorAll('.btn-window').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.window);
            changeTimeWindow(minutes);
        });
    });

    // Night mode button
    const nightModeBtn = document.getElementById('nightModeBtn');
    if (nightModeBtn) {
        nightModeBtn.addEventListener('click', toggleNightMode);
    }

    // Close fullscreen modal button
    const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
    if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', closeFullscreenGraph);
    }

    // Close fullscreen modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFullscreenGraph();
        }
    });
}

// ========================================
// Initialization
// ========================================

function initialize() {
    console.log('🚀 Initializing PulseStream Dashboard...');

    // Check if backend is running
    testBackendConnection();

    // Initialize Socket.IO
    initializeSocket();

    // Initialize Charts
    initializeCharts();

    // Attach event listeners
    attachEventListeners();

    console.log('✅ Dashboard initialized');
}

function testBackendConnection() {
    fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => {
            if (response.ok) {
                console.log('✅ Backend is running at ' + BACKEND_URL);
            }
        })
        .catch(error => {
            console.warn(`⚠️ Backend may not be running at ${BACKEND_URL}`);
            console.warn('Make sure backend is started with: npm run dev');
        });
}

/**
 * Update patients count display
 */
function updatePatientsCount(count) {
    const el = document.getElementById('patientsInfo');
    if (el) {
        el.textContent = `👥 Patients: ${count}`;
    }
}

/**
 * Toggle Night Mode
 */
function toggleNightMode() {
    state.nightMode = !state.nightMode;
    localStorage.setItem('nightMode', state.nightMode);
    applyNightMode();
    console.log(`🌙 Night mode: ${state.nightMode ? 'ON' : 'OFF'}`);
}

/**
 * Apply Night Mode Styles
 */
function applyNightMode() {
    const html = document.documentElement;
    if (state.nightMode) {
        html.setAttribute('data-theme', 'dark');
        document.getElementById('nightModeToggle').textContent = '☀️';
    } else {
        html.setAttribute('data-theme', 'light');
        document.getElementById('nightModeToggle').textContent = '🌙';
    }
}

/**
 * Get status indicator color
 */
function getStatusColor(current) {
    const status = determineStatus(current);
    
    if (status === 'CRITICAL') return '#ef4444'; // Red
    if (status === 'WARNING') return '#f59e0b'; // Orange
    return '#10b981'; // Green
}

/**
 * Modal State - Tracks what's open and updates it live
 */
const modalState = {
    fullscreenMetric: null,
    fullscreenUpdateInterval: null,
    statsMetric: null,
    statsUpdateInterval: null,
    staticTitles: {
        bpm: '❤️ Heart Rate (BPM)',
        spo2: '🫁 Oxygen Level (SpO2)',
        temp: '🌡️ Temperature',
        humidity: '💧 Humidity'
    }
};

/**
 * Update fullscreen chart with latest data
 */
function updateFullscreenChart() {
    if (!modalState.fullscreenMetric || !state.chartData[modalState.fullscreenMetric]) return;
    
    const chartData = state.chartData[modalState.fullscreenMetric];
    
    if (state.chartInstances.fullscreen) {
        state.chartInstances.fullscreen.data.labels = chartData.map(p => p.x);
        state.chartInstances.fullscreen.data.datasets[0].data = chartData.map(p => p.y);
        state.chartInstances.fullscreen.update('none'); // Update without animation
    }
}

/**
 * Update stats modal with latest values
 */
/**
 * Update stats modal with latest values
 */
function updateStatsModal() {
    if (!modalState.statsMetric) return;
    
    const metricType = modalState.statsMetric;
    let currentId, avgId, minId, maxId; // currentId add kiya yahan
    
    switch(metricType) {
        case 'bpm':
            currentId = 'bpmCurrent'; avgId = 'bpmAvg'; minId = 'bpmMin'; maxId = 'bpmMax'; break;
        case 'spo2':
            currentId = 'spo2Current'; avgId = 'spo2Avg'; minId = 'spo2Min'; maxId = 'spo2Max'; break;
        case 'temp':
            currentId = 'tempCurrent'; avgId = 'tempAvg'; minId = 'tempMin'; maxId = 'tempMax'; break;
        case 'humidity':
            currentId = 'humidityCurrent'; avgId = 'humidityAvg'; minId = 'humidityMin'; maxId = 'humidityMax'; break;
        default: return;
    }
    
    // Values DOM se nikal rahe hain
    const currentValue = document.getElementById(currentId)?.textContent || '--';
    const avgValue = document.getElementById(avgId)?.textContent || '--';
    const minValue = document.getElementById(minId)?.textContent || '--';
    const maxValue = document.getElementById(maxId)?.textContent || '--';

    console.log(`📊 Updating stats modal for ${metricType}: Current=${currentValue}, Avg=${avgValue}, Min=${minValue}, Max=${maxValue}`);

    // Modal ke elements mein values set kar rahe hain
    const statsCurrentEl = document.getElementById('statsCurrentValue');
    if (statsCurrentEl) statsCurrentEl.textContent = currentValue;
    
    document.getElementById('statsAvgValue').textContent = avgValue;
    document.getElementById('statsMinValue').textContent = minValue;
    document.getElementById('statsMaxValue').textContent = maxValue;
}

/**
 * Open fullscreen graph with live updates
 */
function openFullscreenGraph(metricType, chartData) {
    const modal = document.getElementById('fullscreenModal');
    const title = document.getElementById('fullscreenTitle');
    const canvas = document.getElementById('fullscreenChart');

    if (!modal || !canvas) return;

    // Store metric type for live updates
    modalState.fullscreenMetric = metricType;

    // Clear any existing update interval
    if (modalState.fullscreenUpdateInterval) {
        clearInterval(modalState.fullscreenUpdateInterval);
    }

    // Set title
    title.textContent = modalState.staticTitles[metricType] || 'Graph View';

    // Show modal
    modal.style.display = 'flex';

    // Create or update chart
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if any
    if (state.chartInstances.fullscreen) {
        state.chartInstances.fullscreen.destroy();
    }

    // Create new chart
    state.chartInstances.fullscreen = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(p => p.x),
            datasets: [{
                label: modalState.staticTitles[metricType],
                data: chartData.map(p => p.y),
                borderColor: CHART_COLORS[metricType],
                backgroundColor: `${CHART_COLORS[metricType]}20`,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: CHART_COLORS[metricType]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                    }
                }
            }
        }
    });

    // Setup live update interval - update chart every 1000ms (new data comes every 2s)
    modalState.fullscreenUpdateInterval = setInterval(updateFullscreenChart, 1000);
}

/**
 * Close full-screen graph view
 */
function closeFullscreenGraph() {
    const modal = document.getElementById('fullscreenModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear update interval
    if (modalState.fullscreenUpdateInterval) {
        clearInterval(modalState.fullscreenUpdateInterval);
        modalState.fullscreenUpdateInterval = null;
        modalState.fullscreenMetric = null;
    }
}

/**
 * Open fullscreen stats modal with live updates
 */
function openFullscreenStats(metricType) {
    const modal = document.getElementById('statsModal');
    const title = document.getElementById('statsTitle');
    
    if (!modal) return;

    // Store metric type for live updates
    modalState.statsMetric = metricType;

    // Clear any existing update interval
    if (modalState.statsUpdateInterval) {
        clearInterval(modalState.statsUpdateInterval);
    }

    // Set title
    title.textContent = `${modalState.staticTitles[metricType]} Statistics`;
    
    // Initial update
    updateStatsModal();

    // Setup live update interval - update every 500ms
    modalState.statsUpdateInterval = setInterval(updateStatsModal, 500);

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close fullscreen stats modal
 */
function closeFullscreenStats() {
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear update interval
    if (modalState.statsUpdateInterval) {
        clearInterval(modalState.statsUpdateInterval);
        modalState.statsUpdateInterval = null;
        modalState.statsMetric = null;
    }
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    applyNightMode();
    document.getElementById('nightModeToggle').addEventListener('click', toggleNightMode);
    
    // Close buttons for modals
    document.getElementById('closeFullscreenBtn')?.addEventListener('click', closeFullscreenGraph);
    document.getElementById('closeStatsBtn')?.addEventListener('click', closeFullscreenStats);
    

    
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFullscreenGraph();
            closeFullscreenStats();
        }
    });
    
    initialize();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (state.socket) {
        state.socket.disconnect();
    }
});
