# Vantage Platform

**Developer:** Munyaradzi Chenjerai

A comprehensive pathway platform that helps people move from opportunity discovery to long-term progress.

## Overview

Vantage is a pathway platform (web + mobile + API) for jobs, learning, mentorship, community, AI guidance, business tools, financial wellbeing, housing/stability, employer dashboards, and public-sector opportunities.

## Tech Stack

- **Monorepo** with apps/ and packages/
- **Web:** Next.js (App Router) + TypeScript
- **API:** Node.js + TypeScript (REST) + Prisma
- **DB:** PostgreSQL (via Prisma)
- **Mobile:** React Native (Expo) + TypeScript
- **Validation:** Zod at all boundaries

## Architecture

- **Strict separation:**
  - apps/web (frontend)
  - apps/api (backend)
  - apps/mobile (mobile)
  - packages/* (shared types, UI, DB, config)
- **Feature-first organisation:**
  - opportunities, learn, connect, business, finance, housing, partners, admin
- **Shared types** live in packages/types and are imported everywhere.
- **All DB access** goes through Prisma in packages/db (no ad-hoc SQL in apps).

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or pnpm

### Installation

```bash
# Install dependencies
cd apps/api && npm install
cd apps/web && npm install
cd apps/mobile && npm install

# Setup environment variables
cd apps/api && cp .env.example .env
cd apps/web && cp .env.example .env
cd apps/mobile && cp .env.example .env
```

### Running the Platform

```bash
# Start API server
cd apps/api
npm run dev

# Start web application
cd apps/web
npm run dev

# Start mobile app (optional)
cd apps/mobile
npm start
```

## Applications

### Web Application
- **URL:** http://localhost:3000
- **Framework:** Next.js (App Router)
- **Features:** Job search, user dashboards, mentorship, community, business tools

### API
- **URL:** http://localhost:3333
- **Framework:** Express + TypeScript
- **Documentation:** http://localhost:3333/docs
- **Features:** REST API, authentication, database operations, real-time WebSocket

### Mobile App
- **Framework:** React Native (Expo)
- **Features:** Mobile-optimized interface for all platform features

## Core Features

### Opportunities (Jobs + Public Opportunities)
- Job listings and search
- Application tracking
- Opportunity Radar (smart matching)
- Employer dashboards

### Learn (Courses)
- Course discovery
- Learning pathways
- Progress tracking
- Certification management

### Connect (Mentors + Community)
- Mentor profiles and booking
- Community forums
- Social networking
- Group mentoring

### Business Tools
- Business setup guidance
- Document management
- Invoicing and cashbook
- Grants and resources

### Financial Wellbeing
- Budget management
- Savings goals
- Expense tracking
- Financial education

### Housing/Stability Support
- Rental listings
- Housing resources
- Stability support services

### Partner Dashboards
- Employer dashboards
- Government/enterprise dashboards
- Analytics and reporting
- Outcome tracking

## Development Guidelines

- TypeScript strict for all new code
- Prefer small, composable modules over large files
- No "bonus" refactors. Only change what the task requires
- Prefer predictable naming (kebab-case for folders, PascalCase for components, camelCase for functions)
- Always add or update types when changing data shapes

## API Guidelines

- Every endpoint must have Zod validation for input
- Role-based access checks
- Consistent error shape
- Avoid breaking API changes; version or add new fields instead of removing
- Use pagination for list endpoints

## UI Guidelines

- Accessibility is non-negotiable (labels, focus states, semantic elements)
- Loading, empty, and error states required for every screen
- Keep pages thin; put logic in feature modules

## Security & Privacy

- Principle of least privilege for roles and data access
- Do not log secrets or personal data
- Never commit .env files or keys
- Any feature touching messaging, housing, or safety must include privacy controls

## Testing

- Run: lint + typecheck + tests before stating "done"
- Add unit tests for utilities and critical domain logic (matching, scoring, permissions)
- Add basic integration tests for new API routes where feasible

## License

Copyright © 2026 Vantage Platform. All rights reserved.

## Contact

- **Developer:** Munyaradzi Chenjerai
- **Platform:** Vantage - Pathways for Progress
- **Email:** support@vantageplatform.com

---

**Built with ❤️ by Munyaradzi Chenjerai**
