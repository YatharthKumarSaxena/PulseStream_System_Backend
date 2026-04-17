# PulseStream Multi-Patient Dashboard Guide

## 🎯 Overview
The dashboard now supports viewing multiple patients simultaneously while maintaining individual patient monitoring capabilities. All features are non-destructive - the existing code continues to work perfectly.

## 🚀 Features

### 1. **Individual Patient View** (Default)
- Enter a patient ID in the input field
- Click "Switch Patient" or press Enter
- View real-time metrics:
  - ❤️ Heart Rate (BPM)
  - 🫁 Oxygen Level (SpO2)
  - 🌡️ Temperature
  - 💧 Humidity
- Each metric shows:
  - **Current** value (real-time)
  - **Average** (from accumulated data)
  - **Minimum** (lowest recorded)
  - **Maximum** (highest recorded)
- View 4 interactive time-series charts

### 2. **Multi-Patient Dashboard** (New!)
- Click **"📊 Multi View"** button to see all patients at once
- Displays cards for all available patients showing:
  - Patient ID
  - Current BPM, SpO2, Temperature, Humidity
  - Health status indicator (🟢 NORMAL, ⚠️ WARNING, 🚨 CRITICAL)
- Grid layout automatically adjusts to screen size (2-3 columns)
- Click any patient card to switch to their individual view

### 3. **Full-Screen Graph View** (New!)
- Click on any metric card to expand it to full-screen
- Shows detailed, enlarged chart for better analysis
- Press **ESC** or click the **✕** button to close
- Works in both individual and multi-patient views

### 4. **View Toggle**
- Button in controls section: **"📊 Multi View"** / **"👤 Individual View"**
- Smoothly transitions between views
- All data persists during toggle

### 5. **Night Mode** (Existing)
- Click **🌙** button in header
- Automatically switches between light and dark themes
- Persists across sessions using localStorage

### 6. **Time Window Selection** (Existing)
- Choose between 15m, 1h, 4h, 8h, 24h windows
- Updates all statistics automatically
- Selected window is highlighted

## 📱 User Experience Flow

### Viewing All Patients
1. Open dashboard in browser at `http://localhost:3000/Frontend/index.html`
2. Click **"📊 Multi View"** button
3. Wait for all patients' data to load
4. See grid with patient cards
5. Each card shows current metrics and status

### Viewing Individual Patient Details
**Option A: From Multi-View**
- Click any patient card
- Automatically switches to individual view for that patient
- Shows full metrics and charts

**Option B: Manual Entry**
- Enter patient ID in the input field
- Click "Switch Patient" or press Enter
- View their detailed metrics and charts

### Expanding a Chart to Full-Screen
1. Click on any metric card (BPM, SpO2, Temperature, or Humidity)
2. Modal opens with enlarged chart
3. Press ESC or click ✕ to close

### Switching Between Views
- Click the view toggle button
- Individual ↔ Multi-Patient view
- All data preserved

## 🔧 Backend Integration

The dashboard fetches data from these endpoints:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /api/heartbeats/patients` | Get list of all patients | `{"patients": [...], "count": N}` |
| `GET /api/heartbeats/data/{patientId}` | Get latest patient metrics | `{"data": {"bpm": N, "spo2": N, ...}}` |
| `GET /api/heartbeats/stats/{patientId}` | Get patient statistics | `{"data": {"bpm": {...}, ...}}` |

Real-time updates come via Socket.IO connection on port 3000.

## 📊 Data Storage

- **Redis**: Stores health metrics with automatic 2-hour pruning
- **Memory**: Browser stores chart data (max 100 points per metric)
- **localStorage**: Saves night mode preference

## 🎨 Responsive Design

- **Desktop**: 2-3 column grid for patient cards
- **Tablet**: Responsive grid adjusts to screen size
- **Mobile**: Single column, full-width cards
- Full-screen view optimized for all screen sizes

## ⚡ Performance

- Charts optimized with Chart.js
- Data points limited to 100 per metric
- Efficient grid rendering with CSS Grid
- Minimal re-renders on data updates

## 🔄 Real-Time Updates

- WebSocket-based communication via Socket.IO
- Updates streaming every 2 seconds (configurable)
- Metrics automatically calculated from accumulated data
- No page refresh needed

## 🛡️ Error Handling

- Graceful fallback if backend unavailable
- Multi-view shows available patient data
- Failed requests don't interrupt other operations
- Detailed console logging for debugging

## 🎯 Data Quality

### Automatic Calculations
- **Average**: All data points in time window
- **Minimum**: Lowest value recorded
- **Maximum**: Highest value recorded
- Updated in real-time as new data arrives

### Health Status Indicators
- 🟢 **NORMAL**: All metrics in safe range
- ⚠️ **WARNING**: 
  - BPM > 120 or < 50
  - Temperature > 38°C
- 🚨 **CRITICAL**: SpO2 < 90%

## 🔐 Browser Support

- Modern browsers with ES6 support
- Chart.js 4.4.0
- Socket.IO compatible
- No additional npm dependencies needed on frontend

## 📝 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select patient | Enter (in input field) |
| Close full-screen | ESC |
| Toggle night mode | Click 🌙 button |
| Switch view | Click toggle button |

## 🐛 Troubleshooting

### Multi-view shows no patients
- Ensure backend is running: `npm start`
- Check test data generator: `node test-data-generator-smart.js`
- Verify network connectivity to `http://localhost:3000`

### Charts not updating
- Check Socket.IO connection in browser console
- Verify backend is receiving test data
- Refresh page if needed

### Full-screen modal not closing
- Press ESC key
- Click ✕ button
- Click outside modal area

### Night mode not persisting
- Check browser's localStorage permissions
- Ensure cookies are enabled
- Try clearing cache and reloading

## 💡 Tips & Tricks

1. **Compare Multiple Patients**: Use multi-view to compare patterns across patients
2. **Full-Screen Analysis**: Expand metrics to full-screen for detailed trend analysis
3. **Time Windows**: Switch time windows to see short-term vs long-term trends
4. **Night Mode**: Enable dark theme for comfortable viewing in low-light conditions
5. **Patient Search**: Use multi-view to quickly find and switch to a specific patient

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: ✅ Production Ready
