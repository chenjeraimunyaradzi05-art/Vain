/**
 * API Documentation Generator
 * 
 * OpenAPI 3.0 specification generator for the Ngurra Pathways API.
 * Provides comprehensive API docs with examples and Indigenous context.
 */

import { Express, Router, Request, Response } from 'express';

// Optional swagger imports - make documentation optional
let swaggerJsdoc: any = null;
let swaggerUi: any = null;

try {
  swaggerJsdoc = require('swagger-jsdoc');
  swaggerUi = require('swagger-ui-express');
} catch {
  console.warn('Swagger packages not installed - API documentation disabled. Run: npm install swagger-jsdoc swagger-ui-express');
}

// OpenAPI specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ngurra Pathways API',
    version: '1.0.0',
    description: `
# Ngurra Pathways API

Ngurra Pathways is Australia's leading Indigenous professional network and employment platform.
This API powers our web and mobile applications, providing access to job listings, mentorship matching,
community features, and culturally-informed career development tools.

## Cultural Context

**Ngurra** (meaning "home" or "country" in many Aboriginal languages) represents our commitment to
creating a platform that honors Indigenous heritage while empowering career growth.

## Authentication

Most endpoints require authentication via JWT bearer tokens. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limiting

API requests are rate-limited based on subscription tier:
- **Free**: 60 requests/minute
- **Starter**: 300 requests/minute
- **Professional**: 600 requests/minute
- **Enterprise**: 1800 requests/minute

## Indigenous Data Sovereignty

We respect and uphold Indigenous data sovereignty principles. User data is handled according to
Australian privacy laws and Indigenous cultural protocols.

## Support

For API support, contact: api-support@ngurrapathways.com.au
`,
    contact: {
      name: 'Ngurra Pathways API Support',
      email: 'api-support@ngurrapathways.com.au',
      url: 'https://ngurrapathways.com.au/support',
    },
    license: {
      name: 'Proprietary',
      url: 'https://ngurrapathways.com.au/api-terms',
    },
    'x-logo': {
      url: 'https://ngurrapathways.com.au/logo.png',
      altText: 'Ngurra Pathways',
    },
  },
  servers: [
    {
      url: 'https://api.ngurrapathways.com.au/v1',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.ngurrapathways.com.au/v1',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:4000/v1',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User profile and account management',
    },
    {
      name: 'Jobs',
      description: 'Job listings, applications, and employer management',
    },
    {
      name: 'Mentorship',
      description: 'Mentor-mentee matching and session management',
    },
    {
      name: 'Community',
      description: 'Community groups, posts, and discussions',
    },
    {
      name: 'Messaging',
      description: 'Direct messaging and chat features',
    },
    {
      name: 'Search',
      description: 'Global search with Indigenous-aware terminology',
    },
    {
      name: 'Companies',
      description: 'Company profiles and RAP certification',
    },
    {
      name: 'Stories',
      description: 'User success stories and testimonials',
    },
    {
      name: 'Notifications',
      description: 'Push notifications and preferences',
    },
    {
      name: 'Analytics',
      description: 'Usage analytics and reporting (admin)',
    },
    {
      name: 'Payments',
      description: 'Subscription and payment management',
    },
    {
      name: 'Webhooks',
      description: 'Webhook registration and management',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for external integrations',
      },
    },
    schemas: {
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: {
            type: 'string',
            enum: ['MEMBER', 'MENTOR', 'EMPLOYER', 'ADMIN'],
          },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MemberProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          headline: { type: 'string' },
          bio: { type: 'string' },
          location: { type: 'string' },
          isIndigenous: { type: 'boolean' },
          culturalBackground: { type: 'string', description: 'Indigenous cultural background' },
          communityConnection: { type: 'string', description: 'Connection to Country/community' },
          skills: { type: 'array', items: { type: 'string' } },
          interests: { type: 'array', items: { type: 'string' } },
          photoUrl: { type: 'string', format: 'uri' },
        },
      },
      MentorProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          title: { type: 'string' },
          bio: { type: 'string' },
          expertise: { type: 'array', items: { type: 'string' } },
          industries: { type: 'array', items: { type: 'string' } },
          yearsExperience: { type: 'integer' },
          hourlyRate: { type: 'number', format: 'float' },
          isAvailable: { type: 'boolean' },
          rating: { type: 'number', minimum: 0, maximum: 5 },
          totalSessions: { type: 'integer' },
          isIndigenous: { type: 'boolean' },
          culturalBackground: { type: 'string' },
        },
      },
      CompanyProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          industry: { type: 'string' },
          size: { type: 'string', enum: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'] },
          logoUrl: { type: 'string', format: 'uri' },
          websiteUrl: { type: 'string', format: 'uri' },
          rapCertificationLevel: {
            type: 'string',
            enum: ['REFLECT', 'INNOVATE', 'STRETCH', 'ELEVATE'],
            description: 'Reconciliation Action Plan certification level',
          },
          indigenousEmploymentGoal: { type: 'number', format: 'float' },
          indigenousEmploymentCurrent: { type: 'number', format: 'float' },
        },
      },

      // Job schemas
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          requirements: { type: 'string' },
          responsibilities: { type: 'string' },
          location: { type: 'string' },
          isRemote: { type: 'boolean' },
          employmentType: {
            type: 'string',
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CASUAL'],
          },
          experienceLevel: {
            type: 'string',
            enum: ['ENTRY', 'MID', 'SENIOR', 'EXECUTIVE'],
          },
          salaryMin: { type: 'integer' },
          salaryMax: { type: 'integer' },
          salaryCurrency: { type: 'string', default: 'AUD' },
          isIndigenousDesignated: {
            type: 'boolean',
            description: 'Identified position for Indigenous Australians',
          },
          culturalSafetyCommitment: {
            type: 'string',
            description: 'Company\'s commitment to cultural safety',
          },
          company: { $ref: '#/components/schemas/CompanyProfile' },
          skills: { type: 'array', items: { type: 'string' } },
          benefits: { type: 'array', items: { type: 'string' } },
          applicationDeadline: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      JobApplication: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          jobId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          coverLetter: { type: 'string' },
          resumeUrl: { type: 'string', format: 'uri' },
          status: {
            type: 'string',
            enum: ['PENDING', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Mentorship schemas
      MentorSession: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          mentorId: { type: 'string', format: 'uuid' },
          menteeId: { type: 'string', format: 'uuid' },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', description: 'Duration in minutes' },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
          },
          meetingUrl: { type: 'string', format: 'uri' },
          notes: { type: 'string' },
          rating: { type: 'number', minimum: 0, maximum: 5 },
        },
      },

      // Community schemas
      CommunityGroup: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          coverImageUrl: { type: 'string', format: 'uri' },
          memberCount: { type: 'integer' },
          isPrivate: { type: 'boolean' },
          category: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SocialPost: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          authorId: { type: 'string', format: 'uuid' },
          mediaUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
          likeCount: { type: 'integer' },
          commentCount: { type: 'integer' },
          shareCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Messaging schemas
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          participants: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' },
          },
          lastMessage: { $ref: '#/components/schemas/Message' },
          unreadCount: { type: 'integer' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          conversationId: { type: 'string', format: 'uuid' },
          senderId: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          mediaUrl: { type: 'string', format: 'uri' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Payment schemas
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tier: {
            type: 'string',
            enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'RAP'],
          },
          status: {
            type: 'string',
            enum: ['active', 'past_due', 'canceled', 'trialing'],
          },
          currentPeriodStart: { type: 'string', format: 'date-time' },
          currentPeriodEnd: { type: 'string', format: 'date-time' },
          cancelAtPeriodEnd: { type: 'boolean' },
        },
      },

      // Error schemas
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          details: { type: 'object' },
        },
      },

      // Common response schemas
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1, minimum: 1 },
        description: 'Page number',
      },
      PageSizeParam: {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        description: 'Number of items per page',
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        schema: { type: 'string' },
        description: 'Sort field (prefix with - for descending)',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Unauthorized',
              message: 'Invalid or expired token',
              statusCode: 401,
            },
          },
        },
      },
      Forbidden: {
        description: 'Access denied',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Forbidden',
              message: 'You do not have permission to access this resource',
              statusCode: 403,
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Not Found',
              message: 'The requested resource was not found',
              statusCode: 404,
            },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              statusCode: 429,
            },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per minute',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Unix timestamp when limit resets',
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // Jobs endpoints
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List jobs',
        security: [],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
          {
            name: 'location',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by location',
          },
          {
            name: 'employmentType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by employment type',
          },
          {
            name: 'isIndigenousDesignated',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter for Indigenous-designated positions',
          },
        ],
        responses: {
          200: {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Job' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create a job posting',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'location'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  requirements: { type: 'string' },
                  responsibilities: { type: 'string' },
                  location: { type: 'string' },
                  isRemote: { type: 'boolean' },
                  employmentType: { type: 'string' },
                  salaryMin: { type: 'integer' },
                  salaryMax: { type: 'integer' },
                  isIndigenousDesignated: { type: 'boolean' },
                  skills: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Job created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job details',
        security: [],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Job details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/jobs/{id}/apply': {
      post: {
        tags: ['Jobs'],
        summary: 'Apply for a job',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['resume'],
                properties: {
                  resume: { type: 'string', format: 'binary' },
                  coverLetter: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Application submitted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobApplication' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // Mentors endpoints
    '/mentors': {
      get: {
        tags: ['Mentorship'],
        summary: 'List mentors',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
          {
            name: 'expertise',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by expertise areas',
          },
          {
            name: 'industry',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by industry',
          },
          {
            name: 'isIndigenous',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter for Indigenous mentors',
          },
        ],
        responses: {
          200: {
            description: 'List of mentors',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mentors: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/MentorProfile' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/mentors/{id}/book': {
      post: {
        tags: ['Mentorship'],
        summary: 'Book a session with a mentor',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scheduledAt', 'duration'],
                properties: {
                  scheduledAt: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer', description: 'Duration in minutes' },
                  topic: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Session booked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MentorSession' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // Community endpoints
    '/community/groups': {
      get: {
        tags: ['Community'],
        summary: 'List community groups',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by category',
          },
        ],
        responses: {
          200: {
            description: 'List of groups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    groups: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/CommunityGroup' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/community/feed': {
      get: {
        tags: ['Community'],
        summary: 'Get personalized feed',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
        ],
        responses: {
          200: {
            description: 'Feed posts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    posts: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/SocialPost' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // Search endpoint
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Global search',
        description: 'Search across users, jobs, companies, groups, and posts with Indigenous-aware terminology',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search query',
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['all', 'users', 'jobs', 'companies', 'groups', 'posts'],
            },
            description: 'Filter by content type',
          },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: { type: 'array', items: { $ref: '#/components/schemas/MemberProfile' } },
                    jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
                    companies: { type: 'array', items: { $ref: '#/components/schemas/CompanyProfile' } },
                    groups: { type: 'array', items: { $ref: '#/components/schemas/CommunityGroup' } },
                    posts: { type: 'array', items: { $ref: '#/components/schemas/SocialPost' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Companies endpoints  
    '/companies': {
      get: {
        tags: ['Companies'],
        summary: 'List companies',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          {
            name: 'rapLevel',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by RAP certification level',
          },
        ],
        responses: {
          200: {
            description: 'List of companies',
          },
        },
      },
    },

    // Webhooks endpoints
    '/webhooks': {
      post: {
        tags: ['Webhooks'],
        summary: 'Register a webhook',
        description: 'Register a webhook endpoint to receive real-time updates',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'Endpoint URL to receive webhook events',
                  },
                  events: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Events to subscribe to',
                  },
                },
              },
              example: {
                url: 'https://yourapp.com/webhooks/ngurra',
                events: ['job.application.new', 'mentorship.session.booked'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Webhook registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    url: { type: 'string' },
                    events: { type: 'array', items: { type: 'string' } },
                    secret: {
                      type: 'string',
                      description: 'Secret for verifying webhook signatures',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Swagger-jsdoc options for additional route documentation
const swaggerOptions = {
  definition: openApiSpec,
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

/**
 * Initialize API documentation
 */
export function initializeApiDocs(app: Express): void {
  // Check if swagger packages are available
  if (!swaggerJsdoc || !swaggerUi) {
    console.warn('Swagger packages not available - skipping API documentation setup');
    app.get('/api-docs', (_req: Request, res: Response) => {
      res.status(503).json({ 
        error: 'API documentation not available',
        message: 'Install swagger-jsdoc and swagger-ui-express packages to enable docs'
      });
    });
    return;
  }

  // Generate OpenAPI spec
  const specs = swaggerJsdoc(swaggerOptions);

  // Serve Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .info .title { color: #2d6a4f }
      `,
      customSiteTitle: 'Ngurra Pathways API Documentation',
      customfavIcon: '/favicon.ico',
    })
  );

  // Serve raw OpenAPI spec
  app.get('/api-docs/spec', (_req: Request, res: Response) => {
    res.json(specs);
  });
}

/**
 * Get API documentation router (for mounting at custom path)
 */
export function getApiDocsRouter(): Router {
  const router = Router();
  
  // Check if swagger packages are available
  if (!swaggerJsdoc || !swaggerUi) {
    router.get('/', (_req: Request, res: Response) => {
      res.status(503).json({ error: 'API documentation not available' });
    });
    return router;
  }

  const specs = swaggerJsdoc(swaggerOptions);

  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(specs));
  router.get('/spec', (_req: Request, res: Response) => res.json(specs));

  return router;
}

// Export the raw spec for testing
export const apiSpec = openApiSpec;
