/**
 * PulseStream Health Monitoring Dashboard v2.0
 * ============================================
 * Fully functional real-time health monitoring system
 * Properly structured with clean data flow and comprehensive feature set
 */

// ========================================
// Configuration & Constants
// ========================================

const CONFIG = {
    BACKEND_URL: 'http://localhost:3000',
    MAX_CHART_POINTS: 100,
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    CHART_UPDATE_INTERVAL: 500,
    DATA_RETENTION_TIME: 24 * 60 // 24 hours in minutes
};

const CHART_COLORS = {
    bpm: 'rgb(239, 68, 68)',
    spo2: 'rgb(34, 197, 94)',
    temp: 'rgb(245, 158, 11)',
    humidity: 'rgb(59, 130, 246)'
};

const METRIC_RANGES = {
    bpm: { min: 60, max: 100, critical_low: 50, critical_high: 120 },
    spo2: { min: 95, max: 100, critical_low: 90, critical_high: 101 },
    temp: { min: 36.5, max: 37.5, critical_low: 35, critical_high: 39 },
    humidity: { min: 30, max: 70, critical_low: 0, critical_high: 100 }
};

// ========================================
// Global State Management
// ========================================

const state = {
    // Socket & Connection
    socket: null,
    isConnected: false,
    
    // Patient & View
    currentPatient: null,
    currentWindow: 15, // minutes
    viewMode: 'individual', // 'individual' or 'multi'
    
    // UI State
    nightMode: localStorage.getItem('nightMode') === 'true',
    chartInstances: {},
    
    // Data Storage
    chartData: {
        bpm: [],
        spo2: [],
        temp: [],
        humidity: []
    },
    
    // Raw data with timestamps for time window filtering
    rawChartData: {
        bpm: [],
        spo2: [],
        temp: [],
        humidity: []
    },
    
    // Current Metrics
    metrics: {
        bpm: { current: null, avg: null, min: null, max: null },
        spo2: { current: null, avg: null, min: null, max: null },
        temp: { current: null, avg: null, min: null, max: null },
        humidity: { current: null, avg: null, min: null, max: null }
    },
    
    // Multi-patient tracking
    allPatients: {},
    pagination: {
        currentPage: 1,
        itemsPerPage: 6,
        totalItems: 0
    },
    
    // Timestamps
    lastUpdate: null,
    lastDataReceived: null
};

// ========================================
// Socket.IO Connection & Events
// ========================================

function initializeSocket() {
    console.log('🔌 Initializing Socket.IO connection...');
    
    state.socket = io(CONFIG.BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: CONFIG.RECONNECT_DELAY,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: CONFIG.RECONNECT_ATTEMPTS,
        transports: ['websocket']
    });

    // Connection event handlers
    state.socket.on('connect', handleConnect);
    state.socket.on('disconnect', handleDisconnect);
    state.socket.on('connect_error', handleConnectError);
    
    // Data event handlers
    state.socket.on('healthData', handleHealthData);
    state.socket.on('error', handleSocketError);
    
    console.log('✅ Socket.IO event listeners attached');
}

function handleConnect() {
    console.log('✅ Connected to backend');
    state.isConnected = true;
    updateConnectionStatus(true);
    fetchAndSelectFirstPatient();
}

function handleDisconnect(reason) {
    console.warn(`⚠️ Disconnected from backend: ${reason}`);
    state.isConnected = false;
    updateConnectionStatus(false);
}

function handleConnectError(error) {
    console.error('❌ Connection error:', error);
    updateConnectionStatus(false);
}

function handleSocketError(error) {
    console.error('❌ Socket error:', error);
}

// ========================================
// Patient Selection & Data Fetching
// ========================================

async function fetchAndSelectFirstPatient() {
    try {
        console.log('📊 Fetching available patients...');
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/heartbeats/patients`);
        const result = await response.json();
        
        if (result.success && result.data?.patients?.length > 0) {
            const patients = result.data.patients;
            console.log(`✅ Found ${patients.length} patients`);
            
            updatePatientsCount(patients.length);
            selectPatient(patients[0]);
        } else {
            console.warn('⚠️ No patients available yet');
            setTimeout(fetchAndSelectFirstPatient, 2000);
        }
    } catch (error) {
        console.error('❌ Error fetching patients:', error);
        setTimeout(fetchAndSelectFirstPatient, 2000);
    }
}

async function selectPatient(patientId) {
    try {
        if (typeof patientId === 'object') {
            patientId = patientId.patientId || patientId;
        }
        
        console.log(`👤 Selecting patient: ${patientId}`);
        
        state.currentPatient = patientId;
        
        // Update patient input field to show selected patient
        const patientInput = document.getElementById('patientSelect');
        if (patientInput) {
            patientInput.value = patientId;
        }
        
        clearMetricsDisplay();
        state.chartData = { bpm: [], spo2: [], temp: [], humidity: [] };
        state.rawChartData = { bpm: [], spo2: [], temp: [], humidity: [] };
        initializeCharts();
        
        // Tell backend which patient we're interested in
        if (state.socket && state.socket.connected) {
            state.socket.emit('selectPatient', {
                patientId: patientId,
                timeWindow: state.currentWindow
            });
            console.log(`✅ Notified backend of patient selection: ${patientId}`);
        } else {
            console.warn('⚠️ Socket not connected, retrying in 500ms...');
            setTimeout(() => {
                if (state.socket && state.socket.connected) {
                    state.socket.emit('selectPatient', {
                        patientId: patientId,
                        timeWindow: state.currentWindow
                    });
                    console.log(`✅ Retried - Notified backend of patient selection: ${patientId}`);
                }
            }, 500);
        }
        
        updateLastUpdate();
    } catch (error) {
        console.error('❌ Error selecting patient:', error);
    }
}

// ========================================
// Real-Time Data Handling
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

        // Validate data has at least one metric
        if (!currentData.bpm && !currentData.spo2 && !currentData.temp && !currentData.humidity) {
            console.warn('⚠️ No valid metrics in received data');
            return;
        }

        console.log('✅ Data validation passed');
        console.log('   Current:', currentData);
        console.log('   Stats:', statsData);

        // 🔴 FIX: Only update UI if in individual view
        if (state.viewMode === 'individual') {
            // Update internal metrics state
            updateMetricsState({ current: currentData, stats: statsData });
            
            // Update charts
            addToChartData(currentData);
            updateCharts();
            
            // Update UI displays - pass current data for display functions
            updateMetricsDisplay(currentData, statsData);
            updateStatus(determineStatus(currentData), getStatusIcon(currentData));
            updateLastUpdate();
        } else {
            // In multi-view, skip realtime updates (use only static fetched data)
            console.log('📊 Multi-view active - not updating metrics from realtime data');
        }
        
        console.log('✅ handleHealthData completed successfully\n');
    } catch (error) {
        console.error('❌ Error in handleHealthData:', error);
    }
}

// ========================================
// Metrics State Management
// ========================================

function updateMetricsState(data) {
    console.log('🔄 Updating metrics state...');
    
    const current = data.current || {};
    const stats = data.stats || {};
    
    // Helper function to calculate stats from filtered chart data
    const calculateStatsFromFiltered = (metric) => {
        const chartData = state.chartData[metric] || [];
        if (chartData.length === 0) {
            return { avg: null, min: null, max: null, dataPoints: 0, timeRange: '0m' };
        }
        
        const values = chartData.map(p => p.y).filter(v => !isNaN(v) && v !== null);
        if (values.length === 0) {
            return { avg: null, min: null, max: null, dataPoints: 0, timeRange: '0m' };
        }
        
        // Calculate actual time range from timestamps
        const timestamps = chartData.map(p => p.t).filter(t => t);
        let timeRangeMinutes = '?';
        if (timestamps.length >= 2) {
            const timeSpanMs = Math.max(...timestamps) - Math.min(...timestamps);
            timeRangeMinutes = Math.round(timeSpanMs / 60000); // Convert ms to minutes
        }
        
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return {
            avg: Math.round(avg * 100) / 100,
            min: Math.round(Math.min(...values) * 100) / 100,
            max: Math.round(Math.max(...values) * 100) / 100,
            dataPoints: values.length,
            timeRange: `${timeRangeMinutes}m`
        };
    };
    
    // Helper function to get stats - use backend if available, fallback to calculated
    const getMetricStats = (metric) => {
        const backendStats = stats[metric] || {};
        
        // If backend has stats, use them
        if (backendStats.average !== undefined || backendStats.minimum !== undefined || backendStats.maximum !== undefined) {
            return {
                avg: backendStats.average ?? null,
                min: backendStats.minimum ?? null,
                max: backendStats.maximum ?? null
            };
        }
        
        // Otherwise calculate from filtered window data
        return calculateStatsFromFiltered(metric);
    };
    
    // IMPORTANT: Stats transformation
    // Backend sends: {bpm: {average, minimum, maximum}, ...}
    // Frontend stores: {bpm: {avg, min, max}, ...}
    // This transformation makes the property names shorter and more consistent
    
    state.metrics = {
        bpm: {
            current: current.bpm ?? null,
            ...getMetricStats('bpm')
        },
        spo2: {
            current: current.spo2 ?? null,
            ...getMetricStats('spo2')
        },
        temp: {
            current: current.temp ?? null,
            ...getMetricStats('temp')
        },
        humidity: {
            current: current.humidity ?? null,
            ...getMetricStats('humidity')
        }
    };
    
    // Get actual time ranges used for calculations
    const bpmData = calculateStatsFromFiltered('bpm');
    const spo2Data = calculateStatsFromFiltered('spo2');
    const tempData = calculateStatsFromFiltered('temp');
    const humidityData = calculateStatsFromFiltered('humidity');
    
    console.log(`📊 Stats from actual available data (Requested: ${state.currentWindow}min)`);
    console.log(`   BPM ${bpmData.timeRange} (${bpmData.dataPoints} points): Avg=${state.metrics.bpm.avg}, Min=${state.metrics.bpm.min}, Max=${state.metrics.bpm.max}`);
    console.log(`   SpO2 ${spo2Data.timeRange} (${spo2Data.dataPoints} points): Avg=${state.metrics.spo2.avg}, Min=${state.metrics.spo2.min}, Max=${state.metrics.spo2.max}`);
    console.log(`   Temp ${tempData.timeRange} (${tempData.dataPoints} points): Avg=${state.metrics.temp.avg}, Min=${state.metrics.temp.min}, Max=${state.metrics.temp.max}`);
    console.log(`   Humidity ${humidityData.timeRange} (${humidityData.dataPoints} points): Avg=${state.metrics.humidity.avg}, Min=${state.metrics.humidity.min}, Max=${state.metrics.humidity.max}`);
}

// ========================================
// Chart Data Management
// ========================================

function addToChartData(current) {
    const nowMs = Date.now();
    const timestamp = new Date().toLocaleTimeString();
    
    if (current.bpm !== null && current.bpm !== undefined) {
        state.rawChartData.bpm.push({ x: timestamp, y: current.bpm, t: nowMs });
    }
    if (current.spo2 !== null && current.spo2 !== undefined) {
        state.rawChartData.spo2.push({ x: timestamp, y: current.spo2, t: nowMs });
    }
    if (current.temp !== null && current.temp !== undefined) {
        state.rawChartData.temp.push({ x: timestamp, y: current.temp, t: nowMs });
    }
    if (current.humidity !== null && current.humidity !== undefined) {
        state.rawChartData.humidity.push({ x: timestamp, y: current.humidity, t: nowMs });
    }
    
    // Filter data based on current time window
    filterChartDataByTimeWindow();
    
    console.log(`📈 Chart data updated - BPM window: ${state.chartData.bpm.length} points`);
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

    // Keep only last CONFIG.MAX_CHART_POINTS for display even within window
    Object.keys(state.chartData).forEach(key => {
        if (state.chartData[key].length > CONFIG.MAX_CHART_POINTS) {
            state.chartData[key] = state.chartData[key].slice(-CONFIG.MAX_CHART_POINTS);
        }
    });

    console.log(`🔍 Filtered data for ${state.currentWindow}min window - BPM: ${state.chartData.bpm.length} points`);
}

// ========================================
// Chart Initialization & Updates
// ========================================

function initializeCharts() {
    console.log('📊 Initializing charts...');
    
    const metrics = ['bpm', 'spo2', 'temp', 'humidity'];
    const titles = {
        bpm: 'Heart Rate (BPM)',
        spo2: 'Oxygen Level (%)',
        temp: 'Temperature (°C)',
        humidity: 'Humidity (%)'
    };
    
    metrics.forEach(metric => {
        const canvasId = `${metric}Chart`;
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.warn(`⚠️ Canvas not found: ${canvasId}`);
            return;
        }
        
        // Destroy existing chart if any
        if (state.chartInstances[metric]) {
            state.chartInstances[metric].destroy();
        }
        
        const ctx = canvas.getContext('2d');
        state.chartInstances[metric] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: titles[metric],
                    data: [],
                    borderColor: CHART_COLORS[metric],
                    backgroundColor: CHART_COLORS[metric] + '20',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: CHART_COLORS[metric],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: titles[metric],
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grace: '10%'
                    }
                }
            }
        });
    });
    
    console.log('✅ Charts initialized');
}

function updateCharts() {
    Object.keys(state.chartInstances).forEach(metric => {
        const chart = state.chartInstances[metric];
        const data = state.chartData[metric] || [];
        
        if (chart && data.length > 0) {
            chart.data.labels = data.map(d => d.x);
            chart.data.datasets[0].data = data.map(d => d.y);
            chart.update('none');
        }
    });
}

// ========================================
// UI Display Updates
// ========================================

function updateMetricsDisplay(currentData = {}, statsData = {}) {
    try {
        console.log('🎨 Updating metrics display...');
        console.log('   Current:', currentData);
        console.log('   Stats:', statsData);
        
        const metrics = ['bpm', 'spo2', 'temp', 'humidity'];
        
        metrics.forEach(metric => {
            // Get stats from state (already transformed by updateMetricsState)
            const stats = state.metrics[metric] || {};
            // Get current value from parameter
            const currentValue = currentData[metric] !== null ? currentData[metric] : null;
            
            updateMetricCard(metric, stats, currentValue);
        });
        
        console.log('✅ Metrics display updated');
    } catch (error) {
        console.error('❌ Error updating metrics display:', error);
    }
}

function updateMetricCard(metric, stats, current) {
    if (!stats) stats = {};
    if (current === undefined) current = null;
    
    try {
        // Update current value
        const currentEl = document.getElementById(`${metric}Current`);
        if (currentEl) {
            const value = current !== null ? formatValue(current, metric) : '--';
            currentEl.textContent = value;
            console.log(`    ✅ Updated ${metric}Current: ${value}`);
        } else {
            console.warn(`    ⚠️ Element not found: ${metric}Current`);
        }
        
        // Update average (stats has: avg, min, max after updateMetricsState transformation)
        const avgEl = document.getElementById(`${metric}Avg`);
        if (avgEl) {
            const value = stats.avg !== null && stats.avg !== undefined ? formatValue(stats.avg, metric) : '--';
            avgEl.textContent = value;
            console.log(`    ✅ Updated ${metric}Avg: ${value}`);
        } else {
            console.warn(`    ⚠️ Element not found: ${metric}Avg`);
        }
        
        // Update minimum
        const minEl = document.getElementById(`${metric}Min`);
        if (minEl) {
            const value = stats.min !== null && stats.min !== undefined ? formatValue(stats.min, metric) : '--';
            minEl.textContent = value;
            console.log(`    ✅ Updated ${metric}Min: ${value}`);
        } else {
            console.warn(`    ⚠️ Element not found: ${metric}Min`);
        }
        
        // Update maximum
        const maxEl = document.getElementById(`${metric}Max`);
        if (maxEl) {
            const value = stats.max !== null && stats.max !== undefined ? formatValue(stats.max, metric) : '--';
            maxEl.textContent = value;
            console.log(`    ✅ Updated ${metric}Max: ${value}`);
        } else {
            console.warn(`    ⚠️ Element not found: ${metric}Max`);
        }
        
        // Update card styling based on current value
        const card = document.getElementById(`${metric}Card`);
        if (card) {
            updateCardStyling(card, metric, current);
        }
        
        console.log(`  ✅ Completed ${metric} card update`);
    } catch (error) {
        console.error(`❌ Error updating ${metric} card:`, error);
    }
}

function updateCardStyling(card, metric, value) {
    card.classList.remove('abnormal', 'critical');
    
    if (value === null) return;
    
    const status = determineMetricStatus(metric, value);
    
    if (status === 'critical') {
        card.classList.add('critical');
    } else if (status === 'warning') {
        card.classList.add('abnormal');
    }
}

// ========================================
// Status & Health Determination
// ========================================

function determineStatus(current) {
    if (!current) return 'UNKNOWN';
    
    const bpmStatus = determineMetricStatus('bpm', current.bpm);
    const spo2Status = determineMetricStatus('spo2', current.spo2);
    const tempStatus = determineMetricStatus('temp', current.temp);
    const humidityStatus = determineMetricStatus('humidity', current.humidity);
    
    if ([bpmStatus, spo2Status, tempStatus, humidityStatus].includes('critical')) {
        return 'CRITICAL';
    } else if ([bpmStatus, spo2Status, tempStatus, humidityStatus].includes('warning')) {
        return 'WARNING';
    }
    return 'NORMAL';
}

function determineMetricStatus(metric, value) {
    if (value === null || value === undefined) return 'UNKNOWN';
    
    const range = METRIC_RANGES[metric];
    if (!range) return 'NORMAL';
    
    if (value <= range.critical_low || value >= range.critical_high) {
        return 'critical';
    } else if (value < range.min || value > range.max) {
        return 'warning';
    }
    return 'normal';
}

function getStatusIcon(current) {
    const status = determineStatus(current);
    const icons = {
        'NORMAL': '✅',
        'WARNING': '⚠️',
        'CRITICAL': '🚨',
        'UNKNOWN': '❓'
    };
    return icons[status] || '❓';
}

function updateStatus(status, icon, type = null) {
    const banner = document.getElementById('statusBanner');
    const iconEl = document.getElementById('statusIcon');
    const textEl = document.getElementById('statusText');
    
    if (iconEl) iconEl.textContent = icon;
    if (textEl) textEl.textContent = status;
    
    if (banner) {
        banner.className = 'status-banner';
        if (status === 'CRITICAL') {
            banner.classList.add('critical');
        } else if (status === 'WARNING') {
            banner.classList.add('warning');
        }
    }
}

// ========================================
// Utility Functions
// ========================================

function formatValue(value, metric) {
    if (value === null || value === undefined) return '--';
    
    const units = {
        bpm: ' bpm',
        spo2: '%',
        temp: '°C',
        humidity: '%'
    };
    
    const formatted = typeof value === 'number' ? value.toFixed(1) : value;
    return `${formatted}${units[metric] || ''}`;
}

function updateConnectionStatus(isConnected) {
    const status = document.getElementById('connectionStatus');
    if (status) {
        status.textContent = isConnected ? '🟢 Connected' : '🔴 Disconnected';
        status.style.color = isConnected ? '#22c55e' : '#ef4444';
    }
}

function updateLastUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = timeStr;
    state.lastUpdate = now;
}

function updatePatientsCount(count) {
    const el = document.getElementById('patientsInfo');
    if (el) el.textContent = `👥 Patients: ${count}`;
    state.pagination.totalItems = count;
}

// ========================================
// Window/Time Range Management
// ========================================

function changeTimeWindow(minutes) {
    console.log(`⏱️ Changing time window to ${minutes} minutes`);
    
    state.currentWindow = minutes;
    
    // Re-filter data for new time window
    filterChartDataByTimeWindow();
    
    // Recalculate stats with filtered data
    updateMetricsState({ 
        current: { 
            bpm: state.metrics.bpm.current, 
            spo2: state.metrics.spo2.current, 
            temp: state.metrics.temp.current, 
            humidity: state.metrics.humidity.current 
        }, 
        stats: {} 
    });
    
    // Update charts
    updateCharts();
    
    // Highlight active window button
    document.querySelectorAll('.btn-window').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.window) === minutes) {
            btn.classList.add('active');
        }
    });
    
    // Notify backend
    if (state.socket && state.socket.connected && state.currentPatient) {
        state.socket.emit('changeWindow', {
            patientId: state.currentPatient,
            timeWindow: minutes
        });
        console.log(`✅ Notified backend of window change`);
    }
}

// ========================================
// Chart Display (Fullscreen)
// ========================================

function openFullscreenGraph(metricType) {
    console.log(`📉 Opening fullscreen graph for ${metricType}`);
    
    const modal = document.getElementById('fullscreenModal');
    const title = document.getElementById('fullscreenTitle');
    const canvas = document.getElementById('fullscreenChart');
    
    if (!modal || !canvas) {
        console.warn('⚠️ Fullscreen modal or canvas not found');
        return;
    }
    
    modal.style.display = 'flex';
    title.textContent = `${metricType.toUpperCase()} Trend - Full View`;
    
    const ctx = canvas.getContext('2d');
    const data = state.chartData[metricType] || [];
    
    if (window.fullscreenChartInstance) {
        window.fullscreenChartInstance.destroy();
    }
    
    window.fullscreenChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.x),
            datasets: [{
                label: metricType.toUpperCase(),
                data: data.map(d => d.y),
                borderColor: CHART_COLORS[metricType],
                backgroundColor: CHART_COLORS[metricType] + '20',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: CHART_COLORS[metricType],
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grace: '10%'
                }
            }
        }
    });
}

function closeFullscreenGraph() {
    console.log('📈 Closing fullscreen graph');
    const modal = document.getElementById('fullscreenModal');
    if (modal) modal.style.display = 'none';
}

// ========================================
// Stats Display (Modal)
// ========================================

function openFullscreenStats(metricType) {
    console.log(`📊 Opening fullscreen stats for ${metricType}`);
    
    const modal = document.getElementById('statsModal');
    const title = document.getElementById('statsTitle');
    
    if (!modal) {
        console.warn('⚠️ Stats modal not found');
        return;
    }
    
    const data = state.metrics[metricType];
    if (!data) {
        console.warn(`⚠️ No data for metric ${metricType}`);
        return;
    }
    
    modal.style.display = 'flex';
    title.textContent = `${metricType.toUpperCase()} Statistics`;
    
    document.getElementById('statsCurrentValue').textContent = formatValue(data.current, metricType);
    document.getElementById('statsAvgValue').textContent = formatValue(data.avg, metricType);
    document.getElementById('statsMinValue').textContent = formatValue(data.min, metricType);
    document.getElementById('statsMaxValue').textContent = formatValue(data.max, metricType);
}

function closeFullscreenStats() {
    console.log('📉 Closing fullscreen stats');
    const modal = document.getElementById('statsModal');
    if (modal) modal.style.display = 'none';
}

// ========================================
// Multi-Patient View
// ========================================

function toggleViewMode() {
    console.log('🔄 Toggling view mode...');
    
    state.viewMode = state.viewMode === 'individual' ? 'multi' : 'individual';
    
    const multiView = document.getElementById('multiPatientView');
    const metricsSection = document.querySelector('.metrics-section');
    const chartsSection = document.querySelector('.charts-section');
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    
    if (state.viewMode === 'multi') {
        if (multiView) multiView.style.display = 'block';
        if (metricsSection) metricsSection.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';
        if (viewToggleBtn) viewToggleBtn.textContent = '👤 Individual View';
        fetchAllPatientsData();
    } else {
        if (multiView) multiView.style.display = 'none';
        if (metricsSection) metricsSection.style.display = 'grid';
        if (chartsSection) chartsSection.style.display = 'grid';
        if (viewToggleBtn) viewToggleBtn.textContent = '📊 Multi View';
    }
    
    console.log(`✅ View mode changed to: ${state.viewMode}`);
}

async function fetchAllPatientsData() {
    try {
        console.log('👥 Fetching all patients data...');
        
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/heartbeats/patients`);
        const result = await response.json();
        
        if (result.success && result.data?.patients?.length > 0) {
            const patients = result.data.patients;
            
            for (const patient of patients) {
                try {
                    const patientId = patient.patientId || patient;
                    const dataResponse = await fetch(`${CONFIG.BACKEND_URL}/api/heartbeats/data/${patientId}`);
                    const dataResult = await dataResponse.json();
                    
                    if (dataResult.success && dataResult.data) {
                        state.allPatients[patientId] = {
                            patientId: patientId,
                            current: dataResult.data,
                            timestamp: new Date()
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️ Error fetching data for patient ${patient}:`, error);
                }
            }
            
            renderPatientCards();
        }
    } catch (error) {
        console.error('❌ Error fetching all patients data:', error);
    }
}

function renderPatientCards() {
    try {
        console.log('📋 Rendering patient cards...');
        
        const grid = document.getElementById('patientsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const patients = Object.values(state.allPatients);
        patients.slice(0, 12).forEach(patient => {
            if (patient && patient.current) {
                const card = createPatientCard(patient);
                if (card) grid.appendChild(card);
            }
        });
        
        console.log(`✅ Rendered ${patients.length} patient cards`);
    } catch (error) {
        console.error('❌ Error rendering patient cards:', error);
    }
}

function createPatientCard(patient) {
    try {
        const current = patient.current;
        const status = determineStatus(current);
        const statusColor = getStatusColor(current);
        
        const card = document.createElement('div');
        card.className = 'patient-card';
        card.style.borderLeftColor = statusColor;
        
        card.innerHTML = `
            <div class="patient-card-header">
                <h3>${patient.patientId}</h3>
                <span class="status-badge" style="background-color: ${statusColor};">${status}</span>
            </div>
            <div class="patient-card-metrics">
                <div class="metric-small">
                    <span class="label">❤️ BPM:</span>
                    <span class="value">${current.bpm !== null ? current.bpm.toFixed(0) : '--'}</span>
                </div>
                <div class="metric-small">
                    <span class="label">🫁 SpO2:</span>
                    <span class="value">${current.spo2 !== null ? current.spo2.toFixed(0) : '--'}%</span>
                </div>
                <div class="metric-small">
                    <span class="label">🌡️ Temp:</span>
                    <span class="value">${current.temp !== null ? current.temp.toFixed(1) : '--'}°C</span>
                </div>
                <div class="metric-small">
                    <span class="label">💧 Humidity:</span>
                    <span class="value">${current.humidity !== null ? current.humidity.toFixed(0) : '--'}%</span>
                </div>
            </div>
        `;
        
        card.onclick = () => {
            // Switch to individual view and select this patient
            if (state.viewMode === 'multi') {
                state.viewMode = 'individual';
                const multiView = document.getElementById('multiPatientView');
                const metricsSection = document.querySelector('.metrics-section');
                const chartsSection = document.querySelector('.charts-section');
                const viewToggleBtn = document.getElementById('viewToggleBtn');
                
                if (multiView) multiView.style.display = 'none';
                if (metricsSection) metricsSection.style.display = 'grid';
                if (chartsSection) chartsSection.style.display = 'grid';
                if (viewToggleBtn) viewToggleBtn.textContent = '📊 Multi View';
                
                console.log(`✅ View mode changed to: individual`);
            }
            
            selectPatient(patient.patientId);
        };
        
        return card;
    } catch (error) {
        console.error('❌ Error creating patient card:', error);
        return null;
    }
}

function getStatusColor(current) {
    const status = determineStatus(current);
    const colors = {
        'NORMAL': '#22c55e',
        'WARNING': '#f59e0b',
        'CRITICAL': '#ef4444'
    };
    return colors[status] || '#6b7280';
}

// ========================================
// Night Mode
// ========================================

function toggleNightMode() {
    console.log('🌙 Toggling night mode...');
    state.nightMode = !state.nightMode;
    localStorage.setItem('nightMode', state.nightMode);
    applyNightMode();
}

function applyNightMode() {
    const root = document.documentElement;
    if (state.nightMode) {
        root.setAttribute('data-theme', 'dark');
        console.log('✅ Night mode enabled');
    } else {
        root.removeAttribute('data-theme');
        console.log('✅ Night mode disabled');
    }
}

// ========================================
// Clearing & Reset Functions
// ========================================

function clearMetricsDisplay() {
    console.log('🧹 Clearing metrics display...');
    
    state.metrics = {
        bpm: { current: null, avg: null, min: null, max: null },
        spo2: { current: null, avg: null, min: null, max: null },
        temp: { current: null, avg: null, min: null, max: null },
        humidity: { current: null, avg: null, min: null, max: null }
    };
    
    ['bpm', 'spo2', 'temp', 'humidity'].forEach(metric => {
        document.getElementById(`${metric}Current`).textContent = '--';
        document.getElementById(`${metric}Avg`).textContent = '--';
        document.getElementById(`${metric}Min`).textContent = '--';
        document.getElementById(`${metric}Max`).textContent = '--';
    });
    
    console.log('✅ Metrics display cleared');
}

// ========================================
// Event Listeners Setup
// ========================================

function attachEventListeners() {
    console.log('📌 Attaching event listeners...');
    
    // Patient selection
    const selectBtn = document.getElementById('selectPatientBtn');
    const patientInput = document.getElementById('patientSelect');
    
    if (selectBtn) {
        selectBtn.addEventListener('click', async () => {
            const patientId = patientInput.value.trim();
            if (patientId) {
                await selectPatient(patientId);
            }
        });
    }
    
    // Time window buttons
    document.querySelectorAll('.btn-window').forEach(btn => {
        btn.addEventListener('click', () => {
            changeTimeWindow(parseInt(btn.dataset.window));
        });
    });
    
    // View toggle
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', toggleViewMode);
    }
    
    // Night mode toggle
    const nightModeBtn = document.getElementById('nightModeToggle');
    if (nightModeBtn) {
        nightModeBtn.addEventListener('click', toggleNightMode);
    }
    
    // Modal close buttons
    const closeChartBtn = document.getElementById('closeFullscreenBtn');
    if (closeChartBtn) {
        closeChartBtn.addEventListener('click', closeFullscreenGraph);
    }
    
    const closeStatsBtn = document.getElementById('closeStatsBtn');
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', closeFullscreenStats);
    }
    
    // Close modals on background click
    const chartModal = document.getElementById('fullscreenModal');
    const statsModal = document.getElementById('statsModal');
    
    if (chartModal) {
        chartModal.addEventListener('click', (e) => {
            if (e.target === chartModal) closeFullscreenGraph();
        });
    }
    
    if (statsModal) {
        statsModal.addEventListener('click', (e) => {
            if (e.target === statsModal) closeFullscreenStats();
        });
    }
    
    console.log('✅ Event listeners attached');
}

// ========================================
// Initialization
// ========================================

function initialize() {
    console.log('🚀 PulseStream Dashboard v2.0 - Initializing...\n');
    
    // Apply saved preferences
    applyNightMode();
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Attach event listeners
    attachEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    console.log('✅ Dashboard initialization complete\n');
}

// ========================================
// Document Ready
// ========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export for debugging
window.appState = state;
window.appDebug = {
    forceUpdateMetrics: (current, stats) => updateMetricsState({ current, stats }),
    forceDataReceived: (data) => handleHealthData(data),
    getState: () => state
};

console.log('🎯 Dashboard ready. Access debug tools with window.appDebug');
