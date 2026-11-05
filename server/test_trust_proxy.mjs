import http from 'http';

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- Testing /api/health with X-Forwarded-For header ---');
  
  // Test 1: Simulating Render's reverse proxy forwarding a client request
  // Client IP: 70.41.3.18, forwarded through proxy: 203.0.113.195
  const res1 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    headers: {
      'X-Forwarded-For': '203.0.113.195, 70.41.3.18',
      'X-Forwarded-Proto': 'https'
    }
  });

  console.log('Status code:', res1.statusCode);
  console.log('RateLimit-Limit header:', res1.headers['ratelimit-limit']);
  console.log('RateLimit-Remaining header:', res1.headers['ratelimit-remaining']);
  console.log('Response body:', res1.body);

  if (res1.statusCode !== 200) {
    console.error('FAILED: Expected 200 OK');
    process.exit(1);
  }

  // Test 2: Simulating auth endpoint rate limiting with X-Forwarded-For
  const res2 = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '198.51.100.22',
      'X-Forwarded-Proto': 'https'
    }
  });

  console.log('\n--- Testing /api/v1/auth/login with X-Forwarded-For ---');
  console.log('Status code:', res2.statusCode);
  console.log('RateLimit-Limit header:', res2.headers['ratelimit-limit']);
  console.log('RateLimit-Remaining header:', res2.headers['ratelimit-remaining']);

  // If ValidationError occurred, status code would be 500 and message would contain express-rate-limit error.
  if (res2.body.includes('ValidationError') || res2.statusCode === 500) {
    console.error('FAILED: express-rate-limit ValidationError detected:', res2.body);
    process.exit(1);
  }

  console.log('\n✅ All trust proxy and rate limiting verification checks PASSED successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
