const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const http = require('http');
const authRoutes = require('./src/routes/authRoutes');
const boardRoutes = require('./src/routes/boardRoutes');
const userRoutes = require('./src/routes/userRoutes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticate } = require('./src/middleware/authMiddleware');
const { initializeSocket } = require('./src/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

initializeSocket(server);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // CSP managed by Vite/client in dev
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// Trust proxy for rate limiter (required for Render/Heroku)
app.set('trust proxy', 1);

// Global rate limit — 300 req/15 min per IP (normal usage)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } }
});
app.use('/api', globalLimiter);

// Strict rate limit for auth endpoints — 20 req/15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts, please try again later.' } }
});
app.use('/api/auth', authLimiter);

// File upload rate limit — 30 uploads/15 min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
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
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running correctly' });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/users', userRoutes);

// Export the upload limiter for attachment routes
app.set('uploadLimiter', uploadLimiter);

app.use(errorHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.server = server;
