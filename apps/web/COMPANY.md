# Company portal (frontend)

This document explains the client-side flow implemented for company users.

## Pages

- /company/setup — Company profile setup form (companyName, ABN, industry, contact details, address). Submits to `/company/profile`.

- /company/dashboard — Company dashboard that shows profile information and uploaded files (uses `/company/profile` and `/uploads/me`).

- /company/jobs — Job listing & management for the company (list your posted jobs)
- /company/jobs/new — Create a new job posting
- /company/jobs/:id/applicants — View applicants for a job, filter by status, download resumes and update application status

## Notes

## Company applicants UI

- Companies can manage applicants at `/company/jobs/:id/applicants` — the UI calls `/company/jobs/:id/applicants` to list and `/company/jobs/:id/applicants/:appId/status` to update status. Resumes are retrieved via `/company/jobs/:id/applicants/:appId/resume`.
- Companies can manage applicants at `/company/jobs/:id/applicants` — the UI calls `/company/jobs/:id/applicants` to list and `/company/jobs/:id/applicants/:appId/status` to update status. Resumes are retrieved via `/company/jobs/:id/applicants/:appId/resume`.
- Companies can schedule interviews using `/company/jobs/:id/applicants/:appId/schedule` and the UI includes a lightweight scheduling flow.
