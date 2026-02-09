import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { StoreController } from './controllers/store.controller';
import { requestLogger, errorHandler, notFoundHandler } from './middleware';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Initialize controllers
const storeController = new StoreController();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check route
app.get('/health', storeController.healthCheck);
app.get('/api/health', storeController.healthCheck);

// Store routes
app.get('/api/stores', storeController.getAllStores);
app.get('/api/stores/:id', storeController.getStore);
app.post('/api/stores', storeController.createStore);
app.delete('/api/stores/:id', storeController.deleteStore);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   🚀 Store Platform API Server                    ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║   📡 Server running on port ${PORT}               ║`);
  console.log(`║   🌍 Environment: ${process.env.NODE_ENV || 'development'}║`);
  console.log(`║   ⏰ Started at: ${new Date().toISOString()}      ║`);
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /health              - Health check');
  console.log('  GET    /api/stores          - List all stores');
  console.log('  GET    /api/stores/:id      - Get store details');
  console.log('  POST   /api/stores          - Create new store');
  console.log('  DELETE /api/stores/:id      - Delete store');
  console.log('');
});

export default app;