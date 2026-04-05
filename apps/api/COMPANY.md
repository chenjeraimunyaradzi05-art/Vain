# Company portal API

This document describes the minimal API endpoints for company users.

## Endpoints

POST /company/profile

- Body: { companyName, abn?, industry, description?, website?, address?, city?, state?, postcode?, phone?, hrEmail? }

- Creates or updates the company profile for the company user.

GET /company/profile

- Returns the company profile for the company user.

PATCH /company/profile

- Accepts partial updates to any company profile fields.

## Jobs endpoints

POST /company/jobs

- Create a job posting for the company user. Body expects: { title, description, location?, employment?, salaryLow?, salaryHigh?, expiresAt? }

GET /company/jobs

- Returns a list of job postings owned by the company user.

GET /company/jobs/:id

- Return a single job posting (must belong to the company user).

PATCH /company/jobs/:id

- Update fields of a job posting owned by the company user.

DELETE /company/jobs/:id

GET /company/jobs/:id/applicants

- Query params: page, pageSize, status (optional)
- Returns applicants for a job the company user owns with resume metadata and applicant basic info.

GET /company/jobs/:id/applicants/:appId/resume

- Returns a download URL to the applicant's resume (if present). If S3 is configured this will be a time-limited signed GET URL.

PATCH /company/jobs/:id/applicants/:appId/status

- Body: { status: 'SUBMITTED'|'REVIEWED'|'SHORTLISTED'|'REJECTED'|'HIRED' }
- Updates the application status and notifies the applicant via email.

POST /company/jobs/:id/applicants/:appId/schedule

- Body: { scheduledAt: ISO_DATETIME_STRING }
- Updates the application's status to INTERVIEW_SCHEDULED and stores the scheduledAt time; notifies the applicant via email.

- Remove a job posting owned by the authenticated user.

## Notes
