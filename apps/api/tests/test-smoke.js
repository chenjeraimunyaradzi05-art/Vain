process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const request = require('supertest');
const { default: app, server } = require('../src/index');

async function main() {
  try {
    await request(app)
      .get('/')
      .expect(200)
      .expect((res) => {
        if (!res.body || res.body.status !== 'ok') {
          throw new Error('Health endpoint did not return ok');
        }
      });
    console.log('✓ API health endpoint responds with ok');
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (server && server.close) {
      server.close();
    }
  }
}

main();
