# 🩺 PulseStream Frontend - Health Monitoring Dashboard

A real-time health monitoring dashboard built with HTML, CSS, and vanilla JavaScript. Connects to the PulseStream backend via Socket.IO to display live patient health metrics.

## 📋 Features

✅ **Real-time Data Updates** - Socket.IO connection for live streaming  
✅ **Multi-Patient Support** - Switch between patients instantly  
✅ **Dynamic Time Windows** - 15, 30, or 60-minute data ranges  
✅ **4 Health Metrics** - Heart Rate, Oxygen Level, Temperature, Humidity  
✅ **Live Charts** - Chart.js for trending visualization  
✅ **Smart Status Alerts** - NORMAL, WARNING, and CRITICAL indicators  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Zero Dependencies** - Pure vanilla JavaScript (no frameworks)

---

## 🚀 Quick Start

### Prerequisites

- Backend server running on `http://localhost:3000`
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Running

1. **Navigate to Frontend folder:**
   ```bash
   cd Frontend
   ```

2. **Start a local web server:**

   **Option 1: Using Python (v3)**
   ```bash
   python -m http.server 5173
   ```

   **Option 2: Using Python (v2)**
   ```bash
   python -m SimpleHTTPServer 5173
   ```

   **Option 3: Using Node.js (http-server)**
   ```bash
   npm install -g http-server
   http-server -p 5173
   ```

   **Option 4: Using VS Code Live Server**
   - Install the "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser:**
   ```
   http://localhost:5173
   ```

4. **Make sure backend is running:**
   ```bash
   cd ../
   npm run dev
   ```

---

## 📊 User Guide

### 1. Connect to Patient

- Enter a **Patient ID** (e.g., `patient_001`, `patient_123`)
- Click **"Switch Patient"** button or press Enter
- Dashboard will start receiving real-time data for that patient

### 2. Select Time Window

- Click one of the time window buttons:
  - **15 min** - Last 15 minutes of data
  - **30 min** - Last 30 minutes of data
  - **60 min** - Last 60 minutes of data
- Charts and statistics will update accordingly

### 3. Monitor Metrics

Four main health metrics are displayed:

#### ❤️ **Heart Rate (BPM)**
- Normal range: 50-120 bpm
- 🟢 Green: Normal
- ⚠️ Yellow: Abnormal (< 50 or > 120)
- 🚨 Red: Critical

#### 🫁 **Oxygen Level (SpO2)**
- Normal range: > 95%
- 🟢 Green: Normal (≥ 95%)
- ⚠️ Yellow: Low (90-95%)
- 🚨 Red: Critical (< 90%)

#### 🌡️ **Temperature**
- Normal range: 36.5-37.5°C
- 🟢 Green: Normal
- ⚠️ Yellow: High (> 38°C)
- 🚨 Red: Critical

#### 💧 **Humidity**
- Normal range: 30-60%
- 🟢 Green: Normal
- Data for context/environment

### 4. View Statistics

For each metric, you can see:
- **Current** - Latest reading
- **Avg** - Average over selected time window
- **Min** - Minimum value in time window
- **Max** - Maximum value in time window

### 5. Analyze Trends

Real-time charts show the last 100 data points for each metric:
- **Smooth line graphs** show trends over time
- **Color-coded lines** match the metric
- **Interactive tooltips** on hover (if supported)

### 6. Status Indicator

Top banner shows overall patient status:
- **🟢 NORMAL** - All metrics in healthy range
- **⚠️ WARNING** - One or more metrics slightly abnormal
- **🚨 CRITICAL** - SpO2 < 90 or other severe condition

---

## 🔧 Troubleshooting

### ❌ "Disconnected" Status

**Problem:** Connection status shows 🔴 Disconnected

**Solution:**
1. Check if backend is running: `npm run dev` (in parent folder)
2. Confirm backend URL is correct: `http://localhost:3000`
3. Check for CORS errors in browser console
4. Verify Socket.IO is working on backend

### ❌ No Data Appearing

**Problem:** Dashboard shows "--" for all values

**Solution:**
1. Make sure you've entered a valid Patient ID
2. Check backend logs for any errors
3. Verify backend has received health data for that patient
4. Try a different Patient ID

### ❌ Charts Not Updating

**Problem:** Charts remain empty or don't update

**Solution:**
1. Open browser DevTools (F12)
2. Check Console for JavaScript errors
3. Verify Socket.IO messages are being received
4. Refresh the page and try again

### ❌ Slow Performance

**Problem:** Dashboard feels sluggish or charts lag

**Solution:**
1. Charts are limited to 100 data points (design choice)
2. Reduce browser extensions
3. Close other tabs
4. Try a different browser
5. Ensure good network connection to backend

---

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Mobile Safari (iOS) | ✅ Full |
| Chrome Mobile | ✅ Full |

---

## 🏗️ Project Structure

```
Frontend/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js              # Main JavaScript logic
└── README.md          # This file
```

### File Descriptions

**index.html**
- Dashboard HTML layout
- Metric cards structure
- Chart containers
- Control elements

**styles.css**
- Responsive design (mobile-first)
- Color schemes and themes
- Animations and transitions
- Card and chart styling

**app.js**
- Socket.IO connection management
- Chart.js initialization
- Real-time data handling
- Status determination logic
- Event listeners

---

## 🔌 Socket.IO Events

### Emitted Events (Frontend → Backend)

```javascript
// Select patient to monitor
socket.emit('selectPatient', 'patient_123');

// Change time window
socket.emit('changeWindow', 30);  // 15, 30, or 60 minutes
```

### Received Events (Backend → Frontend)

```javascript
// Real-time health data
socket.on('healthData', (data) => {
    // data.current: { bpm, spo2, temp, humidity }
    // data.stats: { avg: {...}, min: {...}, max: {...} }
});
```

---

## 📊 Data Format

### Incoming Health Data

```javascript
{
  current: {
    bpm: 72,           // Heart rate in beats per minute
    spo2: 98,          // Oxygen saturation percentage
    temp: 37.2,        // Temperature in Celsius
    humidity: 45       // Environment humidity percentage
  },
  stats: {
    avg: {
      bpm: 75,
      spo2: 97,
      temp: 37.1,
      humidity: 46
    },
    min: {
      bpm: 60,
      spo2: 95,
      temp: 36.8,
      humidity: 40
    },
    max: {
      bpm: 120,
      spo2: 99,
      temp: 37.5,
      humidity: 52
    }
  }
}
```

---

## 🎨 Customization

### Change Backend URL

Edit `app.js`, line 10:
```javascript
const BACKEND_URL = 'http://localhost:3000';  // Change this
```

### Adjust Chart Data Points

Edit `app.js`, line 11:
```javascript
const MAX_CHART_POINTS = 100;  // Change to keep more/fewer points
```

### Modify Status Thresholds

Edit the `determineStatus()` function in `app.js`:
```javascript
// CRITICAL: SpO2 < 90
if ((current.spo2 || 100) < 90) {
    return 'CRITICAL';  // Change threshold
}
```

### Change Color Scheme

Edit `styles.css` for:
- Background gradient (`.header`)
- Metric colors (`.metric-card`)
- Status colors (`.status-banner`)

---

## 🚨 Production Deployment

For production use:

1. **Update Backend URL** to your production server
2. **Enable CORS** properly on backend
3. **Use HTTPS** in production
4. **Add authentication** if needed
5. **Implement rate limiting** on frontend requests
6. **Set up monitoring** for dashboard availability

---

## 📞 Support & Issues

If you encounter issues:

1. **Check Console** - Press F12, check the Console tab
2. **Verify Backend** - Ensure backend is running and accessible
3. **Network Tab** - Check Socket.IO connection in Network tab
4. **Backend Logs** - Check backend logs for errors
5. **Reload Page** - Sometimes a refresh solves it

---

## 🎯 Example Patient IDs

Try these Patient IDs to test:

- `patient_001`
- `patient_123`
- `patient_john`
- `patient_demo`

---

## 🔐 Security Notes

⚠️ This is a **demonstration dashboard**. For production:

- Add authentication/authorization
- Validate all user inputs
- Use HTTPS only
- Implement rate limiting
- Add audit logging
- Secure patient data per HIPAA (if applicable)
- Never expose sensitive credentials in frontend code

---

## 💡 Tips

✨ **Best Practices:**
- Refresh page after backend restart
- Use same time window when comparing patients
- Expected latency: < 1 second for data updates
- Charts update approximately every 2-5 seconds
- Mobile: Portrait mode recommended for small screens

---

## 📄 License

Part of PulseStream Health Monitoring System

---

## 🎉 Enjoy Your Dashboard!

The dashboard is now ready to monitor patients in real-time. Start the backend server and begin tracking health metrics! 

For more information about the backend API, see [../README.md](../README.md)
