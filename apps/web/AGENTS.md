# Vantage Web (Next.js App Router)

## Next.js patterns

- Use Server Components by default.
- Only add "use client" when interactivity is required.
- Keep route files thin; move logic into feature modules.

## Folder structure

- app/ routes contain page.tsx, layout.tsx, loading.tsx, error.tsx where needed.
- features/ contains domain modules:
  - opportunities, learn, connect, business, finance, housing, partners, admin
- components/ contains shared components used across features.
- lib/ contains API client, auth helpers, utilities.

## UI/UX requirements

- Every screen must include:
  - loading state
  - empty state
  - error state
- Accessibility:
  - labels for inputs
  - keyboard navigable menus/dialogs
  - visible focus states
- Use consistent CTAs (verb-first): "Get started", "Save", "Apply", "Continue".

## Data access

- All network calls go through a single API client wrapper (no raw fetch scattered).
- Use shared types from packages/types for request/response shapes.
