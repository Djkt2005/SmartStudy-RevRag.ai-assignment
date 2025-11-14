import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:4000';
const TEST_PORT = 4001; // Use different port to avoid conflicts
let server;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, port = 4000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${port}`);
    const options = {
      hostname: 'localhost',
      port: port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Smart Study Assistant API Tests', () => {
  before(async () => {
    // Note: These tests assume the server is already running on port 4000
    // Start the server manually before running tests: npm run start
    // Or run tests while server is running in another terminal
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  after(() => {
    // Server cleanup would go here if needed
  });

  it('Test Case 1: Health endpoint returns OK', async () => {
    const response = await makeRequest('GET', '/health');
    assert.strictEqual(response.status, 200, 'Health endpoint should return 200');
    assert.deepStrictEqual(response.body, { status: 'ok' }, 'Health endpoint should return { status: "ok" }');
  });

  it('Test Case 2: Standard mode generates study package for valid topic', async () => {
    const response = await makeRequest('POST', '/study', {
      topic: 'Photosynthesis',
      mode: 'standard',
    });

    assert.strictEqual(response.status, 200, 'Should return 200 for valid topic');
    assert(response.body, 'Response body should exist');
    assert.strictEqual(response.body.topic, 'Photosynthesis', 'Topic should match input');
    assert.strictEqual(response.body.mode, 'standard', 'Mode should be standard');
    assert(Array.isArray(response.body.summary), 'Summary should be an array');
    assert.strictEqual(response.body.summary.length, 3, 'Summary should have 3 items');
    assert(Array.isArray(response.body.quiz), 'Quiz should be an array');
    assert.strictEqual(response.body.quiz.length, 3, 'Quiz should have 3 questions');
    assert(typeof response.body.studyTip === 'string', 'Study tip should be a string');
    assert(response.body.sourceAttribution, 'Source attribution should exist');
    assert.strictEqual(response.body.sourceAttribution.source, 'Wikipedia', 'Source should be Wikipedia');
  });

  it('Test Case 3: Returns 404 for invalid/non-existent topic', async () => {
    const response = await makeRequest('POST', '/study', {
      topic: 'XyZ123AbC999InvalidTopic',
      mode: 'standard',
    });

    assert.strictEqual(response.status, 404, 'Should return 404 for invalid topic');
    assert(response.body.error, 'Error message should exist');
    assert(
      response.body.error.includes('could not find any information'),
      'Error message should indicate topic not found',
    );
  });
});

