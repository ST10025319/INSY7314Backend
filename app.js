const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { apiLimiter } = require('./middleware/rateLimiter');
const hpp = require('hpp');

dotenv.config();

const app = express();


// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true                
}));
app.use(express.json({ limit: '10kb' }));
app.use(apiLimiter);
app.use(hpp());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

module.exports = app;