/**
 * Socket Service
 * Manages Socket.IO connections and real-time events
 * Handles client state management (patientId, timeWindow)
 */

const { logWithTime } = require("@utils/time-stamps.util");
const { validatePatientId, validateTimeWindow } = require("@services/validation.service");
const { DEFAULT_WINDOW_MINUTES } = require("@configs/redis.config");
const { getStats, getLatestHealthData } = require("@services/heartbeats/heartbeat.service");

/**
 * Initialize Socket.IO server with event handlers
 * @param {Object} io - Socket.IO server instance
 * @param {Object} options - Optional configuration
 * @returns {void}
 */
const initializeSocket = (io, options = {}) => {
    logWithTime("🔧 Initializing Socket.IO handlers...");
    
    // Store active client states
    const clientStates = new Map();
    
    io.on("connection", (socket) => {
        logWithTime(`✅ Client connected: ${socket.id}`);
        
        // Initialize client state
        clientStates.set(socket.id, {
            patientId: null,
            timeWindow: DEFAULT_WINDOW_MINUTES
        });
        
        // Handle patient selection
        socket.on("selectPatient", async (data) => {
            // Frontend sends: {patientId: "...", timeWindow: ...}
            // Extract patientId from data object
            let patientId = data?.patientId || data;
            let timeWindow = data?.timeWindow || DEFAULT_WINDOW_MINUTES;
            
            logWithTime(`📍 selectPatient event received: patientId=${patientId}, timeWindow=${timeWindow}`);
            
            const validation = validatePatientId(patientId);
            
            if (!validation.isValid) {
                logWithTime(`❌ Invalid patientId: ${validation.errors.join(", ")}`);
                socket.emit("error", {
                    message: "Invalid patientId",
                    errors: validation.errors
                });
                return;
            }
            
            const clientState = clientStates.get(socket.id);
            clientState.patientId = patientId;
            clientState.timeWindow = timeWindow;
            
            logWithTime(`📍 Client ${socket.id} selected patient: ${patientId}`);
            socket.emit("patientSelected", {
                patientId,
                timeWindow: clientState.timeWindow,
                message: `Selected patient ${patientId}`
            });

            // 🔴 MAIN FIX: Patient select hote hi turant DB se data uthao aur frontend ko bhej do!
            try {
                const latestData = await getLatestHealthData(patientId);
                if (latestData) {
                    const stats = await getStats(patientId, clientState.timeWindow);
                    socket.emit("healthData", {
                        current: latestData,
                        stats: stats,
                        clientWindow: clientState.timeWindow
                    });
                    logWithTime(`📤 Sent initial healthData to ${socket.id} for ${patientId}`);
                }
            } catch (err) {
                logWithTime(`❌ Error fetching initial data for ${patientId}: ${err.message}`);
            }
        });
        
        // Handle time window change (🔴 NAYA CHANGE: isko bhi async banaya hai)
        socket.on("changeWindow", async (data) => {
            // Extract timeWindow from data object (frontend sends {patientId, timeWindow})
            // Also handle if called with just number for backward compatibility
            let windowInMinutes = data?.timeWindow || data;
            
            const validation = validateTimeWindow(windowInMinutes);
            
            if (!validation.isValid) {
                logWithTime(`❌ Invalid timeWindow: ${validation.errors.join(", ")}`);
                socket.emit("error", {
                    message: "Invalid timeWindow",
                    errors: validation.errors
                });
                return;
            }
            
            const clientState = clientStates.get(socket.id);
            clientState.timeWindow = windowInMinutes;
            
            logWithTime(`⏱️  Client ${socket.id} changed window to: ${windowInMinutes} minutes`);
            socket.emit("windowChanged", {
                timeWindow: windowInMinutes,
                message: `Time window updated to ${windowInMinutes} minutes`
            });

            // 🔴 FIX: Window change hote hi turant naye stats calculate karke bhej do
            if (clientState.patientId) {
                try {
                    const latestData = await getLatestHealthData(clientState.patientId);
                    if (latestData) {
                        const stats = await getStats(clientState.patientId, windowInMinutes);
                        socket.emit("healthData", {
                            current: latestData,
                            stats: stats,
                            clientWindow: windowInMinutes
                        });
                    }
                } catch (err) {
                    logWithTime(`❌ Error updating window data: ${err.message}`);
                }
            }
        });
        
        // Handle disconnection
        socket.on("disconnect", () => {
            logWithTime(`❌ Client disconnected: ${socket.id}`);
            clientStates.delete(socket.id);
        });
    });
    
    // Expose method to emit health data to subscribers
    io.emitHealthData = async (patientId, latestData) => {
        try {
            logWithTime(`🚀 emitHealthData called for patient: ${patientId}`);
            
            // Proper async iteration using fetchSockets
            const sockets = await io.fetchSockets();
            logWithTime(`   📊 Connected sockets: ${sockets.length}`);
            
            for (const socket of sockets) {
                const clientState = clientStates.get(socket.id);
                
                if (!clientState) {
                    logWithTime(`   ⏭️  Socket ${socket.id}: No state (just connected)`);
                    continue;
                }
                
                if (clientState.patientId !== patientId) {
                    logWithTime(`   ⏭️  Socket ${socket.id}: Subscribed to ${clientState.patientId}, not ${patientId}`);
                    continue;
                }
                
                try {
                    // Calculate stats using client's preferred time window
                    const stats = await getStats(patientId, clientState.timeWindow);
                    
                    // Emit to client
                    socket.emit("healthData", {
                        current: latestData,
                        stats,
                        clientWindow: clientState.timeWindow
                    });
                    
                    logWithTime(`   ✅ Emitted healthData to socket ${socket.id}`);
                } catch (err) {
                    logWithTime(`   ❌ Error emitting to socket ${socket.id}: ${err.message}`);
                    socket.emit("error", {
                        message: "Failed to calculate stats",
                        error: err.message
                    });
                }
            }
        } catch (err) {
            logWithTime(`❌ Error in emitHealthData: ${err.message}`);
        }
    };
    
    logWithTime("✅ Socket.IO handlers initialized");
};

module.exports = {
    initializeSocket
};