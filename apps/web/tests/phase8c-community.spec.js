const { test, expect } = require('@playwright/test');

function makeJwt(payload) {
  const base64Payload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.mock-signature`;
}

async function setAuth(page, context, webBase, jwt) {
  const url = new URL(webBase);
  await context.addCookies([
    {
      name: 'ngurra_token',
      value: jwt,
      domain: url.hostname,
      path: '/',
    },
  ]);

  await page.goto(webBase);
  await page.evaluate((t) => {
    localStorage.setItem('ngurra_token', t);
  }, jwt);
}

test('Phase 8C: forums create topic and reply', async ({ page, context }) => {
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const jwt = makeJwt({ userId: 'member-1', email: 'member@example.com', userType: 'MEMBER', exp: Math.floor(Date.now() / 1000) + 3600 });
  await setAuth(page, context, webBase, jwt);

  // Mock categories + category topics
  await page.route('**/community/categories**', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        categories: [
          { id: 'cat-1', slug: 'general', name: 'General Discussion', description: 'Open discussions', icon: '💬', color: 'blue', topicCount: 1, postCount: 1 },
        ],
      }),
    });
  });

  await page.route('**/community/category/general**', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category: { id: 'cat-1', slug: 'general', name: 'General Discussion', description: 'Open discussions' },
        topics: [
          { id: 't-0', title: 'Welcome', createdAt: new Date().toISOString(), replies: 0, author: 'Community Member', category: 'general', categoryName: 'General Discussion' },
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      }),
    });
  });

  // Mock create topic -> redirect to topic id
  await page.route('**/community/topic', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    if (route.request().method() !== 'POST') return route.fallback();
    const body = await route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ topic: { id: 't-1', title: body.title, content: body.content } }),
    });
  });

  // Mock topic detail + reply submission
  await page.route('**/community/topic/t-1', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        topic: {
          id: 't-1',
          title: 'My First Topic',
          content: 'Hello community',
          author: 'Community Member',
          createdAt: new Date().toISOString(),
          category: 'general',
          categoryName: 'General Discussion',
          viewCount: 1,
          isPinned: false,
          isLocked: false,
        },
        replies: [],
      }),
    });
  });

  await page.route('**/community/topic/t-1/reply', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    if (route.request().method() !== 'POST') return route.fallback();
    const body = await route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: { id: 'r-1', content: body.content, author: 'You', createdAt: new Date().toISOString() } }),
    });
  });

  // Forums page
  await page.goto(`${webBase}/community/forums`);
  await page.waitForSelector('text=Community Forums', { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'New Topic' })).toBeVisible();

  // Category page
  await page.getByRole('link', { name: 'General Discussion' }).click();
  await page.waitForURL('**/community/category/general');
  await expect(page.getByRole('heading', { name: 'General Discussion' })).toBeVisible();

  // Create new topic
  await page.goto(`${webBase}/community/new`);
  await page.waitForSelector('text=Start a New Discussion', { timeout: 10000 });
  await page.selectOption('select', { value: 'cat-1' });
  await page.fill('input[type="text"]', 'My First Topic');
  await page.fill('textarea', 'Hello community');
  await page.getByRole('button', { name: 'Create Topic' }).click();

  await page.waitForURL('**/community/topic/t-1');
  await expect(page.getByRole('heading', { name: 'My First Topic' })).toBeVisible();

  // Reply
  await page.fill('textarea', 'Nice to meet you all');
  await page.getByRole('button', { name: /post reply/i }).click();
  await expect(page.locator('text=Nice to meet you all')).toBeVisible();
});

test('Phase 8C: success stories gallery + submit', async ({ page, context }) => {
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

  const jwt = makeJwt({ userId: 'member-2', email: 'member2@example.com', userType: 'MEMBER', exp: Math.floor(Date.now() / 1000) + 3600 });
  await setAuth(page, context, webBase, jwt);

  await page.route('**/stories?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stories: [{ id: 's-1', title: 'Got hired', story: 'It worked!', authorName: 'Community Member', publishedAt: new Date().toISOString() }] }),
    });
  });

  await page.route('**/stories', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ story: { id: 's-new' } }) });
  });

  await page.goto(`${webBase}/community/stories`);
  await page.waitForSelector('text=Success Stories', { timeout: 10000 });
  await expect(page.locator('text=Got hired')).toBeVisible();

  await page.getByRole('link', { name: 'Share Your Story' }).click();
  await page.waitForURL('**/community/stories/submit');
  await expect(page.getByRole('heading', { name: 'Share Your Success Story' })).toBeVisible();

  await page.fill('input[placeholder*="Leave blank" i]', '');
  await page.fill('input[placeholder*="What’s your story" i]', 'My Story Title');
  await page.fill('textarea', 'My story body');
  await page.check('input[type="checkbox"]');
  await page.getByRole('button', { name: 'Submit Story' }).click();

  await page.waitForURL('**/community/stories');
});

test('Phase 8C: admin moderation dashboard reviews flag', async ({ page, context }) => {
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

  const jwt = makeJwt({ userId: 'admin-1', email: 'admin@example.com', userType: 'GOVERNMENT', exp: Math.floor(Date.now() / 1000) + 3600 });
  await setAuth(page, context, webBase, jwt);

  let reviewed = false;

  await page.route('**/forums/flags', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ flags: [{ id: 'flag-1', reason: 'spam', details: 'test', threadId: 't-1', status: 'pending' }] }),
    });
  });

  await page.route('**/forums/flags/flag-1', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    reviewed = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ flag: { id: 'flag-1', status: 'resolved' } }) });
  });

  await page.goto(`${webBase}/admin/moderation`);
  await page.waitForSelector('text=Moderation Queue', { timeout: 10000 });
  await expect(page.locator('text=Reason:')).toBeVisible();

  await page.getByRole('button', { name: 'Resolve' }).click();
  await page.waitForTimeout(100);
  await expect(reviewed).toBeTruthy();
});
