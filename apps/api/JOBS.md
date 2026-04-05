# Public jobs API

This file documents the public jobs endpoints and how members can apply.

## Endpoints

GET /jobs

- Public: returns list of active jobs. Query params: q, location, employment, page, pageSize

GET /jobs/:id

- Public: returns details for a single job (if active)

POST /jobs/:id/apply

- Body: { resumeId?: string, coverLetter?: string }

- Creates a JobApplication record for the member user

## Notes on notifications

- When an application is submitted the API will attempt to send an email to the company HR email (companyProfile.hrEmail) and a confirmation email to the applicant. If SMTP is not configured the email will be logged to the server output.

## Notes

- The apply endpoint requires the member user to not be the owner of the job.
- The UI allows the member to select an existing resume (UploadedFile.id) or use their resume upload flow first then apply.
