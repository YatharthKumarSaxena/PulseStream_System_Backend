# PulseStream Backend - Health Monitoring System

Real-time health monitoring backend with Express.js and Socket.IO for tracking patient vital signs (BPM, SpO2, Temperature, Humidity).

## Project Structure

```
├── configs/           # Configuration files
│   ├── http-status.config.js
│   ├── ip.config.js
│   ├── port.config.js
│   ├── redis.config.js
│   └── uri.config.js
├── controllers/       # Request handlers
│   └── heartbeats/
│       └── heartbeat.controller.js
├── services/         # Business logic
│   ├── redis.service.js
│   ├── validation.service.js
│   ├── socket.service.js
│   └── heartbeats/
│       └── heartbeat.service.js
├── routers/          # Route definitions
│   └── heartbeat.routes.js
├── responses/        # Response handlers
│   ├── errors/
│   │   └── error.response.js
│   └── success/
│       └── success.response.js
├── utils/            # Utility functions
│   ├── env.util.js
│   ├── log-error.util.js
│   └── time-stamps.util.js
├── server.js         # Main server file
├── package.json
├── .env
├── .env.example
└── jsconfig.json
```

## Installation & Setup

### Prerequisites
- Node.js v14+
- Redis running on localhost:6379

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and update if needed:
```bash
PORT=3000
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
SERVER_IP=localhost
```

### Start Development Server
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
Response: { status: "OK", timestamp: "2026-04-16T..." }
```

### 1. Store Health Data
```
POST /api/heartbeats/data
Content-Type: application/json

Request Body:
{
  "patientId": "patient_123",
  "bpm": 72,
  "spo2": 98,
  "temp": 98.6,
  "humidity": 45
}

Response: (201 Created)
{
  "success": true,
  "statusCode": 201,
  "data": {
    "patientId": "patient_123",
    "bpm": 72,
    "spo2": 98,
    "temp": 98.6,
    "humidity": 45,
    "timestamp": 1681684800000
  },
  "message": "Health data recorded successfully"
}
```

### 2. Get Latest Health Data
```
GET /api/heartbeats/data/:patientId

Response: (200 OK)
{
  "success": true,
  "statusCode": 200,
  "data": {
    "patientId": "patient_123",
    "bpm": 72,
    "spo2": 98,
    "temp": 98.6,
    "humidity": 45,
    "timestamp": 1681684800000
  },
  "message": "Latest health data for patient patient_123"
}
```

### 3. Get Statistics (Time Window)
```
GET /api/heartbeats/stats/:patientId?window=15

Query Parameters:
- window: Time window in minutes (1-1440, default: 15)

Response: (200 OK)
{
  "success": true,
  "statusCode": 200,
  "data": {
    "bpm": {
      "average": 72.5,
      "minimum": 65,
      "maximum": 85,
      "dataPoints": 5
    },
    "spo2": {
      "average": 97.8,
      "minimum": 95,
      "maximum": 100,
      "dataPoints": 5
    },
    "temp": {
      "average": 98.4,
      "minimum": 98.2,
      "maximum": 98.8,
      "dataPoints": 5
    },
    "humidity": {
      "average": 45.2,
      "minimum": 40,
      "maximum": 50,
      "dataPoints": 5
    },
    "windowInMinutes": 15,
    "totalDataPoints": 5,
    "timestamp": 1681684800000
  },
  "message": "Statistics retrieved for patient patient_123 (15 min window)"
}
```

### 4. List Health Data (Paginated)
```
GET /api/heartbeats/list/:patientId?skip=0&limit=100

Query Parameters:
- skip: Number of records to skip (default: 0)
- limit: Number of records to return (1-1000, default: 100)

Response: (200 OK)
{
  "success": true,
  "statusCode": 200,
  "data": {
    "data": [
      {
        "patientId": "patient_123",
        "bpm": 72,
        "spo2": 98,
        "temp": 98.6,
        "humidity": 45,
        "timestamp": 1681684800000
      },
      ...
    ],
    "total": 150,
    "skip": 0,
    "limit": 100,
    "count": 100
  },
  "message": "Health data list for patient patient_123"
}
```

## Socket.IO Events

### Client → Server Events

#### 1. Select Patient
```javascript
socket.emit("selectPatient", "patient_123");

// Server Response
socket.on("patientSelected", (data) => {
  console.log(data);
  // {
  //   patientId: "patient_123",
  //   timeWindow: 15,
  //   message: "Selected patient patient_123"
  // }
});
```

#### 2. Change Time Window
```javascript
socket.emit("changeWindow", 30);

// Server Response
socket.on("windowChanged", (data) => {
  console.log(data);
  // {
  //   timeWindow: 30,
  //   message: "Time window updated to 30 minutes"
  // }
});
```

### Server → Client Events

#### 1. Health Data Update
Emitted when new health data is stored and client has selected the patient:
```javascript
socket.on("healthData", (data) => {
  console.log(data);
  // {
  //   current: {
  //     patientId: "patient_123",
  //     bpm: 72,
  //     spo2: 98,
  //     temp: 98.6,
  //     humidity: 45,
  //     timestamp: 1681684800000
  //   },
  //   stats: {
  //     bpm: { average: 72.5, minimum: 65, maximum: 85, dataPoints: 5 },
  //     spo2: { average: 97.8, minimum: 95, maximum: 100, dataPoints: 5 },
  //     temp: { average: 98.4, minimum: 98.2, maximum: 98.8, dataPoints: 5 },
  //     humidity: { average: 45.2, minimum: 40, maximum: 50, dataPoints: 5 },
  //     windowInMinutes: 15,
  //     totalDataPoints: 5,
  //     timestamp: 1681684800000
  //   },
  //   clientWindow: 15
  // }
});
```

#### 2. Error Events
```javascript
socket.on("error", (data) => {
  console.log(data);
  // {
  //   message: "Error description",
  //   errors: ["error1", "error2"],
  //   error: "detailed error message"
  // }
});
```

## Data Retention

- All health data is stored in Redis sorted sets
- Data older than **2 hours** is automatically removed
- Time window for statistics can be 1-1440 minutes (1 minute to 24 hours)
- Updates happen in real-time through Socket.IO

## Data Validation

### Health Data Validation
- `patientId`: Required, non-empty string
- `bpm`: Number, 0-300 range
- `spo2`: Number, 0-100 range
- `temp`: Number, 32-110°F range
- `humidity`: Number, 0-100 range

### Time Window Validation
- Minimum: 1 minute
- Maximum: 1440 minutes (24 hours)

## Error Handling

All errors return appropriate HTTP status codes:
- `400 Bad Request`: Validation failures
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors

Example error response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "bpm must be between 0 and 300"
  ]
}
```

## Development

### Available Scripts
```bash
npm start       # Start production server
npm run dev     # Start with automatic reload (nodemon)
```

### Logging
All operations are logged with timestamps using the `logWithTime` utility.

### Module Aliases
- `@configs` → `./configs`
- `@utils` → `./utils`
- `@services` → `./services`
- `@controllers` → `./controllers`
- `@responses` → `./responses`
- `@routers` → `./routers`
- `@/*` → `./`

## Architecture

### Layers

1. **Server Layer** (`server.js`)
   - Express app initialization
   - Socket.IO setup
   - Middleware configuration
   - Route registration

2. **Router Layer** (`routers/`)
   - HTTP route definitions
   - Request error handling

3. **Controller Layer** (`controllers/`)
   - Request validation
   - Response formatting
   - Error handling

4. **Service Layer** (`services/`)
   - Business logic
   - Redis operations
   - Data calculations
   - Validation rules

5. **Config Layer** (`configs/`)
   - Environment-based configuration
   - Constants and settings

6. **Utility Layer** (`utils/`)
   - Logging utilities
   - Timestamp handling
   - Environment variable management

### Data Flow

```
User → Socket.IO/HTTP
       ↓
Router (Express)
       ↓
Controller (Validation, Formatting)
       ↓
Service (Business Logic)
       ↓
Redis (Data Storage)
       ↓
Controller (Response)
       ↓
Socket.IO/HTTP → User
```

## Testing with cURL

### Store Health Data
```bash
curl -X POST http://localhost:3000/api/heartbeats/data \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_123",
    "bpm": 72,
    "spo2": 98,
    "temp": 98.6,
    "humidity": 45
  }'
```

### Get Latest Data
```bash
curl http://localhost:3000/api/heartbeats/data/patient_123
```

### Get Statistics
```bash
curl "http://localhost:3000/api/heartbeats/stats/patient_123?window=15"
```

### List All Data
```bash
curl "http://localhost:3000/api/heartbeats/list/patient_123?skip=0&limit=100"
```

## Testing with Socket.IO Client

```javascript
const io = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected");
  
  // Select patient
  socket.emit("selectPatient", "patient_123");
  
  // Change time window
  socket.emit("changeWindow", 30);
});

socket.on("patientSelected", (data) => {
  console.log("Patient selected:", data);
});

socket.on("windowChanged", (data) => {
  console.log("Window changed:", data);
});

socket.on("healthData", (data) => {
  console.log("New health data:", data);
});

socket.on("error", (data) => {
  console.error("Error:", data);
});
```

## Production Deployment

### Environment Variables
Set these in production:
```
NODE_ENV=production
PORT=3000
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
SERVER_IP=0.0.0.0
```

### Performance Considerations
- Redis sorted set lookups are O(log N + M)
- Data pruning happens on every write
- Consider using Redis cluster for high load
- Implement request rate limiting if needed

## License

ISC
