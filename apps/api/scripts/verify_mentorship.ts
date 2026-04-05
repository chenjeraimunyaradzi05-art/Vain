import fetch from 'node-fetch';
import { createApp } from '../src/app';
import http from 'http';

async function run() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Invalid server address');
  const port = addr.port;
  const base = `http://127.0.0.1:${port}`;
  console.log('Test server running at', base);

  try {
    // Login mentee
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jarrah@example.com', password: 'Password123!' }),
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    console.log('Login (mentee) status', loginRes.status, loginJson?.message || loginJson);
    const token = loginJson?.token;
    if (!token) throw new Error('Failed to get token for mentee');

    // Search mentors
    const searchRes = await fetch(`${base}/mentor/search`, { method: 'GET' });
    const searchJson = await searchRes.json().catch(() => ({}));
    console.log('Mentor search status', searchRes.status);
    const mentor = (searchJson?.mentors || [])[0];
    if (!mentor) throw new Error('No mentors found in seed data');
    console.log('Using mentor:', mentor.name || mentor.id, 'id=', mentor.id);

    // Create mentorship session
    const scheduledAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const createRes = await fetch(`${base}/mentorship/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mentorId: mentor.id, scheduledAt, duration: 30, topic: 'Career advice' }),
    });
    const createJson = await createRes.json().catch(() => ({}));
    console.log('Create session status', createRes.status, createJson);

  } catch (err) {
    console.error('Flow error:', err);
  } finally {
    server.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
