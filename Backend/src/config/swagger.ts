import swaggerJSDoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bidirectional Chat Application API',
      version: '1.0.0',
      description: 'Interactive REST API documentation for the Bidirectional Real-Time Chat & Video Calling Application.',
      contact: {
        name: 'Chat App Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token below (obtained from /api/auth/login)',
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
