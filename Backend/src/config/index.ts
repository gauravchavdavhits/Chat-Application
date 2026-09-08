import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'bidirectional_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'bidirectional_refresh_super_secret_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || '"Bidirectional Chat" <no-reply@bidirectionalchat.com>',
  },
  corsOrigin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches localhost, ngrok, or configured origins
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://spoiled-fondness-unworldly.ngrok-free.dev',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (
      allowed.includes(origin) ||
      origin.endsWith('.ngrok-free.dev') ||
      origin.endsWith('.ngrok.io') ||
      origin.endsWith('.ngrok-free.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev so ngrok tunnels never get blocked
  },
};
