const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const http = require('http');
const morgan = require('morgan');
const logger = require('./src/utils/logger');
require('./src/config/passport');
const authRoutes = require('./src/routes/authRoutes');
const boardRoutes = require('./src/routes/boardRoutes');
const userRoutes = require('./src/routes/userRoutes');
const organizationRoutes = require('./src/routes/organizationRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const billingController = require('./src/controllers/billingController');
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticate } = require('./src/middleware/authMiddleware');
const { initializeSocket } = require('./src/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

initializeSocket(server);

// Structured HTTP Request Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));


// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP managed by Vite/client in dev
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true
}));

const parseOrigins = (val) => {
  if (!val) return [];
  return val.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...parseOrigins(process.env.CORS_ORIGIN),
  ...parseOrigins(process.env.CLIENT_URL)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app')))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'stripe-signature']
}));

// Stripe Webhook MUST be placed before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// Trust proxy for rate limiter (required for Render/Heroku)
app.set('trust proxy', 1);

const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

let rateLimitStore;
if (process.env.REDIS_URI) {
  const redisClient = new Redis(process.env.REDIS_URI);
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  
  rateLimitStore = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  });
}

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } }
});
app.use('/api', globalLimiter);

// Auth endpoints rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: { success: false, error: { message: 'Too many authentication attempts, please try again later.' } }
});
app.use('/api/auth', authLimiter);


// File upload rate limit — 30 uploads/15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: { success: false, error: { message: 'Too many file uploads, please try again later.' } }
});

// Fix for Node.js SRV DNS resolution issues on certain Windows/Network setups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (error) {
  console.warn('Could not set custom DNS servers:', error.message);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow', {
  family: 4
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error(`MongoDB connection error: ${err.message}`));

// Production-ready health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const isHealthy = dbState === 1;
  const memory = process.memoryUsage();

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: isHealthy
    },
    system: {
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
      }
    }
  };

  res.status(isHealthy ? 200 : 503).json(healthData);
});

app.use('/api/auth', authRoutes);
app.use('/api/orgs', organizationRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/users', userRoutes);

// Export the upload limiter for attachment routes
app.set('uploadLimiter', uploadLimiter);

app.use(errorHandler);

// Global unhandled error catchers
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
