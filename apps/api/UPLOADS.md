Uploads & S3 signed URL flow (API)
=================================

This document explains the lightweight direct-upload flow implemented in the API.

Environment variables
---------------------

Make sure these are present in `apps/api/.env.local` when you want to use S3 signed URL flow:

- AWS_REGION - (eg ap-southeast-2)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_S3_BUCKET

Endpoints
---------

POST /uploads/s3-url

- Auth: required (JWT)
- Body: { filename, mimeType, category }
- Returns: { url, key, bucket, filename, mimeType, category, publicUrl }

PUT to returned `url` directly from the client to upload the file (Content-Type must match).

POST /uploads/metadata

- Auth: required (JWT)
- Body: { key, filename, url, mimeType?, size?, category? }
- Creates an `UploadedFile` record for the authenticated user.

GET /uploads/me

- Auth: required (JWT)
- Returns: { files: [...] } list of files uploaded by the current user.

Notes
-----
- The API uses presigned PUT URLs; files uploaded with the signed URL should be accessible via the `publicUrl` returned by /s3-url (if bucket permissions allow).
- If S3 env vars are missing the /s3-url endpoint will return an S3 not configured error — the fallback endpoints (/uploads/photo etc.) still accept manual URLs for now.

Local testing
-------------

1) Ensure `apps/api/.env.local` has the S3 env variables set.
2) Request a signed URL using a logged-in account.
3) Upload file from client with a PUT request to the signed URL.
4) POST metadata to /uploads/metadata to persist the record.

Example cURL flow
-----------------

1) Request a signed url

```bash
curl -X POST "http://localhost:3001/uploads/s3-url" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"my-file.jpg","mimeType":"image/jpeg","category":"PHOTO"}'
```

You'll receive a response that contains `url` and `publicUrl` fields.

1) Upload the file using the pre-signed URL (use PUT and the exact Content-Type)

```bash
curl -X PUT "<SIGNED_URL>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/my-file.jpg
```

1) Save the metadata with the public URL returned earlier

```bash
curl -X POST "http://localhost:3001/uploads/metadata" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"key":"uploads/userid/...-my-file.jpg","filename":"my-file.jpg","url":"<PUBLIC_URL>","mimeType":"image/jpeg","size":12345,"category":"PHOTO"}'
```
