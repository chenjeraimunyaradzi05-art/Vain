process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const request = require('supertest');
const { default: app, server } = require('../src/index');

const loginEmail = process.env.LOGIN_EMAIL;
const loginPassword = process.env.LOGIN_PASSWORD;

async function testJobsList() {
  await request(app)
    .get('/jobs')
    .expect(200)
    .expect('Content-Type', /json/)
    .expect((res) => {
      if (!res.body || typeof res.body !== 'object') {
        throw new Error('Jobs response missing body');
      }
    });
  console.log('✓ GET /jobs returns JSON');
}

async function testLoginOptional() {
  if (!loginEmail || !loginPassword) {
    console.log('↷ Skipping /auth/login (LOGIN_EMAIL/LOGIN_PASSWORD not set)');
    return;
  }
  await request(app)
    .post('/auth/login')
    .send({ email: loginEmail, password: loginPassword })
    .expect((res) => {
      if (res.status === 401) {
        throw new Error('Login credentials rejected');
      }
    })
    .expect(200)
    .expect('Content-Type', /json/)
    .expect((res) => {
      if (!res.body?.accessToken) throw new Error('accessToken missing');
    });
  console.log('✓ POST /auth/login succeeds');
}

async function main() {
  try {
    await testJobsList();
    await testLoginOptional();
  } catch (err) {
    console.error('Test failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (server && server.close) {
      server.close();
    }
  }
}

main();
