# Vantage API (apps/api)

Express + Prisma backend for the Vantage platform - a pathway platform for jobs, learning, mentorship, community, business tools, financial wellbeing, and real-world opportunities.

**Developer:** Munyaradzi Chenjerai

## Features

### Authentication

- JWT-based authentication with access & refresh tokens
- Role-based access control (candidate, mentor, elder, tafe, company, admin)
- Password reset with email verification
- Rate limiting on sensitive endpoints

### Subscriptions & Billing

- Stripe integration for subscription payments
- Three tiers: Starter ($99), Professional ($249), Enterprise ($499/mo)
- Webhook handling for payment events
- Usage tracking and tier gates

### Jobs & Employment

- Job posting and management
- Featured job listings
- Application tracking
- Indigenous employment analytics

### Mentorship

- Mentor profiles and discovery
- Availability calendar management
- Session booking and tracking
- Mentor compensation
- Mentor circles for group mentoring

### Skills & Training

- Skills taxonomy with Indigenous focus
- Skills gap analysis
- TAFE course sync integration
- Course recommendations
- Course enrolment with payments

### Community

- Forum categories and threads
- Elder verification workflow
- Success stories
- Badge system

### AI Features

- AI wellness support with safety guards
- Resume parsing
- Job matching

### Analytics & Reporting

- Employer analytics dashboard
- Indigenous impact metrics
- RAP (Reconciliation Action Plan) reporting

## Quick Start

1. `cd apps/api`
2. Install: `pnpm install`
3. Copy `.env.example` → `.env` and configure
4. Run migrations: `npx prisma migrate dev`
5. Seed database: `npx prisma db seed`
6. Run dev server: `pnpm run dev`

## Environment Variables

```bash
DATABASE_URL=postgresql://...       # PostgreSQL connection string
JWT_SECRET=your-secret-key          # JWT signing secret
REFRESH_SECRET=your-refresh-secret  # Refresh token secret
STRIPE_SECRET_KEY=sk_...            # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...     # Stripe webhook signing secret
# Optional (Stripe Connect)
STRIPE_CLIENT_ID=ca_...               # Stripe Connect client ID (for OAuth)
STRIPE_PLATFORM_ACCOUNT=acct_...     # Your platform account (optional)

OPENAI_API_KEY=sk-...               # OpenAI API key (optional)
```

## API Routes

### Auth (`/auth`)

- `POST /register` - User registration
- `POST /login` - User login (returns access + refresh tokens)
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout and invalidate tokens
- `GET /me` - Get current user
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

### Subscriptions (`/subscriptions-v2`)

- `GET /plans` - List subscription plans
- `POST /checkout` - Create Stripe checkout session
- `POST /portal` - Create Stripe billing portal session
- `GET /current` - Get current subscription
- `POST /cancel` - Cancel subscription
- `POST /reactivate` - Reactivate cancelled subscription
- `POST /webhook` - Stripe webhook handler

### Jobs (`/jobs`)

- `GET /` - List jobs (with filters)
- `GET /featured` - Featured job listings
- `POST /` - Create job (company only)
- `GET /:id` - Get job details
- `PUT /:id` - Update job
- `DELETE /:id` - Delete job

### Mentorship (`/mentorship`)

- `GET /mentors` - Browse mentors
- `GET /mentors/:id` - Mentor profile
- `GET /availability` - Get mentor availability
- `POST /availability` - Set availability slots
- `POST /sessions` - Book a session
- `GET /sessions` - List sessions
- `POST /sessions/:id/feedback` - Submit feedback
- `GET /earnings` - Mentor earnings
- `GET /circles` - List mentor circles
- `POST /circles` - Create circle

### Mentor Billing (`/mentor`)

- `POST /connect` - Create Stripe connected account for mentor onboarding (auth)
- `GET /connect/link` - Get onboarding link to finish Stripe onboarding (auth)
- `POST /payouts` - Request a payout transfer to connected account (auth, amount in cents)

### Skills (`/skills`)

- `GET /` - List skills taxonomy
- `GET /categories` - Skill categories
- `POST /user` - Update user skills
- `GET /gap-analysis` - Analyze skills gap for job

### Courses (`/courses`)

- `GET /` - List courses
- `GET /recommendations` - Get course recommendations
- `POST /sync` - Sync external courses (admin)

### Course Payments (`/course-payments`)

- `POST /enrol` - Enrol in course (Stripe checkout)
- `POST /confirm` - Confirm payment
- `GET /my-enrolments` - List user enrolments
- `POST /:paymentId/refund` - Request refund

### Forums (`/forums`)

- `GET /categories` - List categories
- `GET /threads/recent` - Recent threads
- `GET /categories/:slug/threads` - Threads in category
- `POST /threads` - Create thread
- `GET /threads/:id` - Get thread with replies
- `POST /threads/:id/replies` - Post reply
- `POST /report` - Report content

### Stories (`/stories`)

- `GET /` - List success stories
- `POST /` - Submit story
- `GET /featured` - Featured stories
- `GET /:id` - Get story details

### Badges (`/badges`)

- `GET /` - List badges
- `GET /user` - User's earned badges
- `POST /award` - Award badge (admin)

### Analytics (`/analytics-employer`)

- `GET /overview` - Dashboard overview
- `GET /funnel` - Hiring funnel data
- `GET /indigenous-impact` - Indigenous employment metrics
- `GET /job-performance` - Per-job analytics
- `GET /rap-progress` - RAP progress tracking

### Elder Verification (`/elder-verification`)

- `POST /submit` - Submit verification request
- `GET /status` - Check verification status
- `GET /pending` - List pending (admin)
- `POST /:id/approve` - Approve request (admin)
- `POST /:id/reject` - Reject request (admin)

## Database

Prisma schema lives in `prisma/schema.prisma`. Key models:

- `User` - All user types (candidate, mentor, elder, tafe, company, admin)
- `Company` - Employer organizations
- `Job` - Job listings
- `Application` - Job applications
- `Subscription` - User/company subscriptions
- `MentorProfile` - Mentor details
- `MentorAvailabilitySlot` - Availability calendar
- `MentorSession` - Booked sessions
- `Skill` / `UserSkill` - Skills taxonomy
- `ExternalCourse` / `CoursePayment` - Training courses
- `ForumCategory` / `ForumThread` / `ForumReply` - Community forums
- `Badge` / `UserBadge` - Achievement system
- `SuccessStory` - Community stories

### Commands

```bash
npx prisma migrate dev      # Run migrations
npx prisma db seed          # Seed database
npx prisma studio           # Open Prisma Studio
npx prisma generate         # Regenerate client
```

## Testing

```bash
pnpm test                   # Run unit tests
pnpm test:integration       # Run integration tests
```

## Deployment

The API is deployed to Netlify Functions. See `netlify.toml` for configuration.

For production:

1. Set all required environment variables
2. Run `npx prisma migrate deploy`
3. Deploy via GitHub Actions CI/CD
