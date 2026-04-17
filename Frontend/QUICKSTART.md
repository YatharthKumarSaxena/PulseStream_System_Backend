# 🚀 PulseStream Frontend - Quick Start Guide

## ⚡ 30-Second Setup

### Step 1: Start Backend (Terminal 1)
```bash
cd /home/asus/Desktop/PulseStream_Backend
npm run dev
```

**Expected output:**
```
🕒 [... UTC] 🔒 CORS Middleware Configured
🕒 [... UTC] 🚀 Starting PulseStream Backend Server...
🕒 [... UTC] ✅ Redis client connected successfully
🕒 [... UTC] ✅ Socket.IO handlers initialized
🕒 [... UTC] ✨ Server running on http://localhost:3000
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd /home/asus/Desktop/PulseStream_Backend/Frontend
python -m http.server 5173
```

**Expected output:**
```
Serving HTTP on 0.0.0.0 port 5173 (http://0.0.0.0:5173/) ...
```

### Step 3: Open Dashboard
```
http://localhost:5173
```

---

## ✅ Verification Checklist

- [ ] Backend terminal shows "Server running on http://localhost:3000"
- [ ] Frontend terminal shows "Serving HTTP on... port 5173"
- [ ] Dashboard loads in browser without errors
- [ ] Connection status shows 🟢 Connected (after 2-3 seconds)
- [ ] Entering a Patient ID and clicking "Switch Patient" works

---

## 🎯 First Test

1. Open dashboard at `http://localhost:5173`
2. Wait for 🟢 Connected status
3. Enter Patient ID: `patient_001`
4. Click "Switch Patient"
5. You should see real-time data with charts updating

---

## 🔍 Troubleshooting

### ❌ Shows 🔴 Disconnected

**Backend not running!**
```bash
# Make sure backend is running in Terminal 1
cd /home/asus/Desktop/PulseStream_Backend
npm run dev
```

### ❌ Can't access http://localhost:5173

**Web server not running!**
```bash
# Make sure frontend server is running in Terminal 2
cd /home/asus/Desktop/PulseStream_Backend/Frontend
python -m http.server 5173
```

### ❌ CORS Error in Console

**Problem:** Backend CORS not allowing frontend port

**Solution:** Already configured! If still seeing errors, verify:
1. Backend is on http://localhost:3000
2. Frontend is on http://localhost:5173
3. Check backend's `src/middlewares/cors.middleware.js`

### ❌ No Data Appearing

**Check:**
1. Connection status is 🟢 Connected
2. Patient ID is entered correctly
3. Backend has received data for that patient
4. Browser console (F12) shows no JavaScript errors

---

## 📊 Dashboard Features

| Feature | How to Use |
|---------|-----------|
| **Patient Selection** | Enter ID → Click "Switch Patient" or press Enter |
| **Time Window** | Click 15/30/60 min button to change data range |
| **Metrics** | See current, avg, min, max for each vital |
| **Charts** | Real-time trending with last 100 data points |
| **Status** | Top banner shows 🟢 NORMAL / ⚠️ WARNING / 🚨 CRITICAL |
| **Timestamp** | Footer shows last update time |

---

## 🌐 Access from Different Machines

**Want to access dashboard from another computer?**

Instead of localhost, use your backend machine's IP:

1. Find backend machine IP:
   ```bash
   # On backend machine
   ipconfig  # Windows
   ifconfig  # macOS/Linux
   ```

2. Update in `Frontend/app.js`, line 10:
   ```javascript
   const BACKEND_URL = 'http://192.168.1.100:3000';  // Your IP
   ```

3. Access from other machine:
   ```
   http://192.168.1.100:5173
   ```

---

## 📝 Testing with Sample Patient IDs

Try these for testing:

```
patient_001
patient_123
patient_john
patient_demo
patient_test
```

---

## 🛑 Stop & Restart

**Stop Backend:**
```bash
# Press Ctrl+C in Terminal 1
```

**Stop Frontend:**
```bash
# Press Ctrl+C in Terminal 2
```

**Restart Both:**
```bash
# Terminal 1
npm run dev

# Terminal 2 (from Frontend folder)
python -m http.server 5173
```

---

## 📱 Responsive Design

Dashboard works on:
- ✅ Desktop (1920x1080+)
- ✅ Laptop (1366x768+)
- ✅ Tablet (768x1024, iPad)
- ✅ Mobile (375x812+)

Best experience on **desktop** or **tablet**. Mobile works but charts are smaller.

---

## 🎓 Understanding the Data Flow

```
Backend (localhost:3000)
    ↓ Socket.IO
Frontend (localhost:5173)
    ↓ User Interaction
Backend
    ↓ Socket.IO Event
Frontend displays real-time data
```

1. Frontend connects to Backend via Socket.IO (WebSocket)
2. User selects a Patient ID
3. Frontend emits "selectPatient" event to Backend
4. Backend starts sending health data for that patient
5. Frontend receives "healthData" events in real-time
6. Charts and cards update automatically

---

## 💡 Pro Tips

- Keep both terminals open and visible
- Use different monitor/workspace for each terminal
- Dashboard auto-reconnects if connection drops
- Page refresh keeps the same patient selected
- Time window selection persists during session

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12 → Console tab)
2. **Check Network tab** for Socket.IO connection
3. **Check backend logs** for errors
4. **Try fresh page reload** (Ctrl+Shift+R)
5. **Restart both backend and frontend**

---

## 🎉 You're All Set!

Your real-time health monitoring dashboard is ready to go! 

Open http://localhost:5173 and start monitoring patients in real-time.

For detailed documentation, see [README.md](README.md)
