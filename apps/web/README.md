# Ngurra Web (apps/web)

The Next.js frontend for the Ngurra Pathways / Gimbi platform - an Indigenous employment, training, and community platform.

## Features

### Authentication

- JWT-based authentication with refresh tokens
- Secure cookie storage for tokens
- Role-based access control (candidate, mentor, elder, tafe, company, admin)
- Password reset flow
- Protected routes via middleware

### Billing & Subscriptions

- Three-tier subscription model (Starter $99, Professional $249, Enterprise $499/mo)
- Stripe integration for payments
- Usage tracking (job posts, featured jobs, candidate views)
- Invoice history and billing portal

### Employer Analytics

- Hiring funnel visualization
- Indigenous employment impact metrics
- RAP (Reconciliation Action Plan) progress tracking
- Job performance analytics
- Export to CSV/PDF

### Mentorship

- Mentor discovery and matching
- Availability calendar with booking
- Session history and feedback
- Mentor circles for group mentoring
- Mentor compensation tracking

### Skills & Training

- Skills taxonomy with Indigenous focus
- Skills gap analysis
- TAFE course integration
- Course recommendations based on job matches
- Course enrolment with payments

### Community

- Forum discussions with categories
- Elder verification system
- Success stories gallery
- Badge system for achievements

### AI Features

- AI wellness support (with safety guards)
- Resume parsing and suggestions
- Job matching recommendations

## Quick Start

1. `cd apps/web`
2. Install dependencies: `pnpm install`
3. Set up environment variables (see below)
4. Run dev server: `pnpm run dev`

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001  # API server URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...  # Stripe public key
```

## Components

### Auth Components

- `useAuth` hook - Auth context with login/logout/register
- `useRequireAuth` - Protect routes requiring authentication
- `useRequireRole` - Protect routes requiring specific roles

### Billing Components

- `BillingPortal` - Subscription management UI
- Tier comparison cards with pricing
- Usage statistics display

### Analytics Components

- `AnalyticsDashboard` - Employer analytics visualization
- Key metrics cards
- Hiring funnel chart
- Indigenous impact section

### Mentorship Components

- `MentorCalendar` - Availability management
- Week/month view toggle
- Slot booking for mentees

### Skills & Courses Components

- `SkillsGapAnalysis` - Visual skills match analysis
- `CourseRecommendations` - Recommended courses display
- Enrolment with Stripe checkout

### Community Components

- `ForumThread` - Thread display with replies
- `ForumThreadList` - Thread listing
- `CreateThreadForm` - New thread creation
- `ElderVerification` - Elder status verification
- `SuccessStories` - Story gallery and submission

---

## CI/CD & Snapshots

### Thumbnail generation

- `THUMB_SMALL_W` — pixel width for small thumbnail (default: 320). Set as a repo secret to override.
- `THUMB_MED_W` — pixel width for medium thumbnail (default: 1280). Set as a repo secret to override.

Thumbnails are published alongside the full image and added to `thumbnail_urls` metadata.

### Dry-run / test webhook

- Provide a `TEST_WEBHOOK` secret (e.g., webhook.site URL) and set `TEST_NOTIFY=true` to exercise payloads safely.
- Local harness: `WEBHOOK_URL=https://webhook.site/xxxx node tools/send-test-webhook.js all`.
- Limit platforms with `TEST_WEBHOOK_PLATFORM=slack|teams|discord|all`.

### Playwright snapshots

- Install browsers: `npm run e2e:install` (or `pnpm run e2e:install`).
- Update snapshots: `npx playwright test -u` (or `pnpm run test:e2e:update`).

### CI snapshot updates

- GitHub Action can update snapshots and open a PR automatically.
- Trusted auto-merge (branch starts with `update/snapshots-`, author is `github-actions[bot]`, not a draft).
- Audit trail: auto-merge comment + metadata in `snapshot-merge-artifacts/` with PR, merge SHA, run URL, files, and timestamp.

### Repo policy

Configure trusted prefixes/authors in `.github/snapshot-policy.json`:

```json
{
  "trustedPrefixes": ["update/snapshots-", "ci/update-snapshots-"],
  "trustedAuthors": ["github-actions[bot]", "your-org-bot[bot]"]
}
```

### Optional webhook notifications

- `SLACK_WEBHOOK` — Incoming Slack webhook URL.
- `TEAMS_WEBHOOK` — Incoming Microsoft Teams webhook URL.
- `DISCORD_WEBHOOK` — Incoming Discord webhook URL (embed message).

You can add a few optional repository secrets to control how the notification appears:

- `SLACK_MENTION` — free-form mention string added to the top of the Slack message (e.g., "<!here>" or "<@U12345678>"). Use `<!here>` or `<!channel>` for channel pings.
- `SLACK_EMOJI` — emoji short code to appear in the header/title (e.g. `:package:` or `:sparkles:`).
- `SLACK_COLOR` — hex color for Slack attachment color (default `#36a64f`).
- `SLACK_TITLE_LINK` — optional PR/branch URL to include in the PR title link portion of the Slack message.
- `TEAMS_MENTION` — brief text included in the Teams MessageCard (Teams webhooks generally do not support user pings by connector; this is a friendly text position).
- `DISCORD_MENTION` — Discord mention string to send in the top-level `content` (e.g. `<@&ROLE_ID>` or `<@1234567890>`).

Discord embed image options

You can include an image in the Discord embed (e.g., a snapshot thumbnail) and keep a ping/mention at the top of the message using these secrets:

- `DISCORD_IMAGE_URL` — public image URL to include in the embed (thumbnail/preview).
- `DISCORD_IMAGE_ALT` — alt/description for the image (default: `Snapshot preview`).

When a mention is included the workflow sends a top-level message `content` field with the mention (e.g., `<@&ROLE_ID>`) so it pings the channel/role, and the embed remains structured with fields and optional image.

Slack threaded previews

If you want the CI message to include a preview or image in a threaded reply (useful for PR previews or snapshot thumbnails), set these repo secrets:

- `SLACK_BOT_TOKEN` — bot token (xoxb-...) needed to call Slack's Web API. Must have chat:write scope for the channel.
- `SLACK_CHANNEL` — channel ID where messages should be posted (e.g., C1234ABCDE).
- `SLACK_POST_IN_THREAD` — set to `true` to enable posting a thread reply containing preview content.
- `SLACK_PREVIEW_IMAGE_URL` — public image URL (e.g., deployed snapshot preview) to embed in the thread reply.
- `SLACK_PREVIEW_LINK` — URL to the snapshot preview site or PR preview to include in the thread reply.

Teams preview/action settings

These additional secrets let the workflow include a preview button and (optionally) an image in the Teams MessageCard sent on auto-merge:

- `TEAMS_PREVIEW_LINK` — a public URL to your snapshot preview or PR preview. If empty the workflow will link to the workflow run URL.
- `TEAMS_IMAGE_URL` — public image URL (e.g., a snapshot thumbnail) to show inside the MessageCard.
- `TEAMS_ACTION_TEXT` — text for the action button (default: "Open preview").

When configured the workflow will post the main summary to Slack (via chat.postMessage), capture the message timestamp (ts) returned by Slack and then post a second message as a thread reply containing the preview link and/or image. If `SLACK_BOT_TOKEN` or `SLACK_CHANNEL` are missing the workflow falls back to the incoming webhook behavior (no threading).

Automatic preview publishing (GH Pages & S3)

The CI workflow can automatically publish a preview image (the most recently updated image in the workspace) for each auto-merge and include the preview URL in the merge metadata and in notifications.

To enable GitHub Pages publishing (recommended, no extra cloud credentials required):

- `UPLOAD_PREVIEW_TO_PAGES` — set to `true` to publish the preview into a dedicated branch (default `snapshot-previews`).
- `GH_PAGES_BRANCH` — optional, branch name to publish previews to (default `snapshot-previews`).
- `PREVIEWS_MAX` — optional integer (as a secret) that limits how many previews are published in one run (default: `5`).

To enable S3 publishing (if you prefer a managed bucket):

- `UPLOAD_PREVIEW_TO_S3` — set to `true` to upload preview images to S3.
- `S3_PREVIEW_BUCKET` — S3 bucket name (required for S3 uploads).
- `S3_UPLOAD_PREFIX` — optional prefix/folder inside the bucket (default `snapshot-previews`).
- `AWS_REGION` — optional AWS region (used to build the public s3 URL).
- `PREVIEWS_MAX` — optional integer (as a secret) that limits how many previews are published in one run (default: `5`).
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` — must be added as repository secrets for S3 uploads.

Behavior

- The workflow searches for the most recent image (png/jpg/jpeg/webp) in the workspace and uploads it to GH Pages and/or S3 when enabled.
- The workflow writes discovered public preview URL(s) into the merge metadata file (snapshot-merge-artifacts/*.json) under `preview_urls` so notifications can use them.
- Notification steps prefer the generated preview URL from metadata; for images they will attempt to embed it, otherwise they fall back to using it as a preview link.

Advanced customization

If your team prefers a specific look you can also set:

- `SLACK_COLOR` — string hex like `#36a64f` used as the attachment color.
- `SLACK_TITLE_LINK` — a URL used to make the PR title link in the Slack message clickable (useful if you want to link to a PR/branch/preview).
- `TEAMS_COLOR` — hex-ish color string for the Teams MessageCard themeColor (defaults to `0076D7`).
- `DISCORD_COLOR` — numeric color for discord embeds (default `3066993`).
- `DISCORD_TITLE_EMOJI` — emoji short-code included in the Discord embed title (default `:package:`).

The workflow only posts to each platform if the corresponding webhook secret is present. To debug the payload locally or in a dev repo, you can set `TEST_NOTIFY` to `true` (secret) and the workflow will print the metadata & a sample payload to the Actions log so you can verify formatting.
