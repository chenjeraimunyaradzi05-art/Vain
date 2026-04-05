# Vantage Mobile (Expo + React Native)

## Navigation & structure

- Use a simple tab structure:
  - Home (Pathway)
  - Discover (Opportunities/Learn)
  - Connect (Mentors/Community)
  - Tools (Business/Finance)
  - AI (Guidance)
- Keep screens thin; logic in feature modules.

## UX requirements

- Loading/empty/error states for every screen.
- Offline-tolerant patterns where possible (cache last successful fetch).
- Respect privacy: do not expose sensitive info in notification previews.

## Data access

- Use a single API client wrapper shared across the app.
- Use packages/types for all request/response typing.
- Validate outbound payloads with Zod where appropriate (forms).

## Performance

- Avoid heavy re-renders; prefer memoised components where needed.
- Paginate large lists (feeds, opportunities, messages).
