import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ParkFlow API',
      version: '1.0.0',
      description:
        'Property Parking Reservation & Management Platform API. Representative endpoints are ' +
        'annotated here; see docs/api-specification.md for the complete endpoint catalogue, ' +
        'including planned endpoints not yet annotated in this live spec.',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Users' },
      { name: 'Properties' },
      { name: 'Parking' },
      { name: 'Reservations' },
      { name: 'Visitor Passes' },
      { name: 'Notifications' },
      { name: 'Audit' },
    ],
  },
  apis: [
    `${env.NODE_ENV === 'production' ? 'dist' : 'src'}/modules/**/*.routes.${env.NODE_ENV === 'production' ? 'js' : 'ts'}`,
  ],
});
