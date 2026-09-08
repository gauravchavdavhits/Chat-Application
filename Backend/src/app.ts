import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { config } from './config';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import groupRoutes from './routes/group.routes';
import callRoutes from './routes/call.routes';
import settingsRoutes from './routes/settings.routes';
import monitoringRoutes from './routes/monitoring.routes';
import { logger } from './utils/logger';

// Connect MongoDB Database
connectDB();

const app: Application = express();

// Use Helmet for security headers and clickjacking prevention
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows static uploaded images/audio to load
    contentSecurityPolicy: false, // Managed by reverse proxy or frontend bundler
  })
);

// Disable X-Powered-By header to prevent server fingerprinting
app.disable('x-powered-by');

// Use Morgan for HTTP request logging
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));

// Configure CORS middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Compress HTTP responses with gzip for high throughput and reduced bandwidth
app.use(compression());

// Body parser limits to prevent payload exhaustion (25mb for high-res screen snapshots)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running securely' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`❌ Server Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

