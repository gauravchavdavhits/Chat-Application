import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from project root .env or local fallback
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'bidirectional_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'bidirectional_refresh_super_secret_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  redisEnabled: process.env.REDIS_ENABLED === 'true' || false,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '266812807141-ap7him4qdtr7in6qc99qhesb1efdffjr.apps.googleusercontent.com',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || '"Bidirectional Chat" <no-reply@bidirectionalchat.com>',
  },
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const configuredOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean);

    const defaultAllowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://spoiled-fondness-unworldly.ngrok-free.dev',
    ];

    const allowedOrigins = new Set([...defaultAllowed, ...configuredOrigins]);
    const cleanOrigin = origin.replace(/\/$/, '');

    if (
      allowedOrigins.has(cleanOrigin) ||
      cleanOrigin.endsWith('.ngrok-free.dev') ||
      cleanOrigin.endsWith('.ngrok.io') ||
      cleanOrigin.endsWith('.ngrok-free.app') ||
      cleanOrigin.endsWith('.github.io')
    ) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true); // Permissive in development
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
};
