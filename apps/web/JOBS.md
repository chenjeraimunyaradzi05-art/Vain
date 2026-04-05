# Public job board (frontend)

## Pages

- /jobs — Public job listing with search and pagination. Fetches GET /jobs and shows active postings.
- /jobs/:id/:slug — SEO friendly job detail route (the slug is optional). Shows job information and allows logged-in Members to apply.

## Application flow for Members

1. Open a job and use "Apply". You can select an existing resume (from Member Dashboard -> Resume) or add one via the Member UI, then submit a cover letter.

Notes:

- The job listing supports page & pageSize query params for pagination.
- When a Member applies a notification email is sent to the company HR email (if configured) and a confirmation is emailed to the applicant (server logs if SMTP is not configured).
