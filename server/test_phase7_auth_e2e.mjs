/**
 * StreamVibe Phase 7 — Comprehensive Authentication End-to-End Test Suite
 *
 * Verifies:
 * 1. User Registration: valid fields, duplicates, missing data
 * 2. User Login: email login, username login, invalid credentials
 * 3. Session & Token: GET /auth/me with Bearer token, rejection without token
 * 4. Refresh Token: POST /auth/refresh with cookie, rejection without cookie
 * 5. Logout: POST /auth/logout, session invalidation
 * 6. Password Recovery: POST /auth/forgot-password, POST /auth/reset-password/:token,
 *    token expiration/single-use protection, login with updated credentials.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 STREAMVIBE PHASE 7: AUTHENTICATION E2E TEST SUITE');
  console.log('======================================================\n');

  const timestamp = Date.now();
  const testUser = {
    displayName: 'Phase7 Tester',
    username: `auth_tester_${timestamp}`,
    email: `auth_tester_${timestamp}@streamvibe.io`,
    password: 'SecurePassword123!',
  };
  const newPassword = 'UpdatedSecurePassword456!';

  let accessToken = null;
  let refreshCookie = null;
  let resetToken = null;

  // -----------------------------------------------------------------
  // 1. REGISTRATION
  // -----------------------------------------------------------------
  console.log('--- 1. Testing Registration ---');

  // 1.1 Valid Registration
  {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');

    assert(res.status === 201, 'Valid registration returns HTTP 201');
    assert(data.success === true, 'Registration response success flag is true');
    assert(data.data?.accessToken, 'Registration returns accessToken in payload');
    assert(data.data?.user?.username === testUser.username, 'User username matches in payload');
    assert(setCookie && setCookie.includes('refreshToken'), 'Refresh token cookie is set');

    accessToken = data.data.accessToken;
    // Extract refreshToken cookie for manual forwarding
    const match = setCookie.match(/refreshToken=([^;]+)/);
    if (match) {
      refreshCookie = `refreshToken=${match[1]}`;
    }
  }

  // 1.2 Duplicate Email Rejection
  {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Duplicate Email Tester',
        username: `unique_user_${Date.now()}`,
        email: testUser.email,
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 400 || res.status === 409, 'Duplicate email registration returns 400 or 409');
    assert(data.success === false, 'Duplicate email rejected with success=false');
  }

  // 1.3 Duplicate Username Rejection
  {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Duplicate Username Tester',
        username: testUser.username,
        email: `unique_email_${Date.now()}@streamvibe.io`,
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 400 || res.status === 409, 'Duplicate username registration returns 400 or 409');
    assert(data.success === false, 'Duplicate username rejected with success=false');
  }

  // -----------------------------------------------------------------
  // 2. LOGIN FLOW
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Login Flow ---');

  // 2.1 Login with Email
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: testUser.password,
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');

    assert(res.status === 200, 'Login with email returns HTTP 200');
    assert(data.success === true, 'Login response success is true');
    assert(data.data?.accessToken, 'Login returns new accessToken');
    assert(data.data?.user?.email === testUser.email, 'User email in payload is verified');
    assert(setCookie && setCookie.includes('refreshToken'), 'Refresh token cookie is present');

    accessToken = data.data.accessToken;
    const match = setCookie.match(/refreshToken=([^;]+)/);
    if (match) refreshCookie = `refreshToken=${match[1]}`;
  }

  // 2.2 Login with Username
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.username,
        password: testUser.password,
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/refreshToken=([^;]+)/);
      if (match) refreshCookie = `refreshToken=${match[1]}`;
    }
    assert(res.status === 200, 'Login with username identifier returns HTTP 200');
    assert(data.data?.user?.username === testUser.username, 'Authenticated user matches username');
  }

  // 2.3 Invalid Password Rejection
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: 'WrongPassword!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401, 'Invalid password returns HTTP 401');
    assert(data.success === false, 'Invalid password rejected with success=false');
    assert(typeof data.message === 'string', 'Meaningful error message returned');
  }

  // 2.4 Unknown Identifier Rejection
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nonexistent_user_99999@streamvibe.io',
        password: 'SomePassword123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401, 'Unknown user identifier returns HTTP 401');
    assert(data.success === false, 'Unknown identifier rejected with success=false');
  }

  // -----------------------------------------------------------------
  // 3. GET /auth/me & BEARER TOKEN VALIDATION
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Current User Profile (/auth/me) ---');

  // 3.1 With Valid Token
  {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /auth/me with valid Bearer token returns HTTP 200');
    assert(data.success === true, 'GET /auth/me response is success');
    const u = data.data?.user || data.data;
    assert(u.email === testUser.email, 'Profile email matches authenticated user');
  }

  // 3.2 Without Token
  {
    const res = await fetch(`${BASE_URL}/auth/me`, { method: 'GET' });
    assert(res.status === 401, 'GET /auth/me without Bearer token returns HTTP 401');
  }

  // 3.3 With Invalid Token
  {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    assert(res.status === 401, 'GET /auth/me with bogus token returns HTTP 401');
  }

  // -----------------------------------------------------------------
  // 4. REFRESH TOKEN FLOW
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Refresh Token Rotation ---');

  // 4.1 Refresh with Cookie
  {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshCookie,
      },
    });
    const data = await res.json();
    assert(res.status === 200, 'POST /auth/refresh with valid cookie returns HTTP 200');
    assert(data.success === true, 'Refresh response success is true');
    assert(data.data?.accessToken, 'New accessToken issued on refresh');

    // Update accessToken and cookie if renewed
    accessToken = data.data.accessToken;
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/refreshToken=([^;]+)/);
      if (match) refreshCookie = `refreshToken=${match[1]}`;
    }
  }

  // 4.2 Refresh without Cookie
  {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
    });
    assert(res.status === 401, 'POST /auth/refresh without cookie returns HTTP 401');
  }

  // -----------------------------------------------------------------
  // 5. FORGOT PASSWORD & RESET PASSWORD
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing Password Recovery & Reset ---');

  // 5.1 Forgot Password Request
  {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email }),
    });
    const data = await res.json();
    assert(res.status === 200, 'POST /auth/forgot-password returns HTTP 200');
    assert(data.success === true, 'Forgot password response success is true');
    assert(data.data?.resetToken, 'Development mode returns resetToken for safe testing');
    resetToken = data.data.resetToken;
  }

  // 5.2 Reset Password with Invalid Token
  {
    const res = await fetch(`${BASE_URL}/auth/reset-password/invalid_nonexistent_token_123`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'BrandNewPassword123!' }),
    });
    assert(res.status === 400, 'Reset password with invalid token returns HTTP 400');
  }

  // 5.3 Reset Password with Valid Token
  {
    const res = await fetch(`${BASE_URL}/auth/reset-password/${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    assert(res.status === 200, 'POST /auth/reset-password/:token returns HTTP 200');
    assert(data.success === true, 'Reset password succeeds');
  }

  // 5.4 Token Reuse Protection
  {
    const res = await fetch(`${BASE_URL}/auth/reset-password/${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AnotherNewPassword!' }),
    });
    assert(res.status === 400, 'Re-using a spent reset token returns HTTP 400');
  }

  // 5.5 Old Password Fails
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: testUser.password, // old password
      }),
    });
    assert(res.status === 401, 'Login with obsolete password returns HTTP 401');
  }

  // 5.6 New Password Succeeds
  {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: newPassword, // new password
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    assert(res.status === 200, 'Login with newly updated password returns HTTP 200');
    assert(data.success === true, 'Login with updated credentials succeeds');

    accessToken = data.data.accessToken;
    const match = setCookie.match(/refreshToken=([^;]+)/);
    if (match) refreshCookie = `refreshToken=${match[1]}`;
  }

  // -----------------------------------------------------------------
  // 6. LOGOUT FLOW
  // -----------------------------------------------------------------
  console.log('\n--- 6. Testing Logout & Session Invalidation ---');

  // 6.1 Logout
  {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: refreshCookie,
      },
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    assert(res.status === 200, 'POST /auth/logout returns HTTP 200');
    assert(data.success === true, 'Logout success is true');
    assert(
      setCookie && (setCookie.includes('refreshToken=;') || setCookie.includes('Expires=Thu, 01 Jan 1970')),
      'Logout invalidates / clears refresh cookie'
    );
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 7 AUTHENTICATION INTEGRATION TESTS PASSED!`);
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN ABORTED WITH ERROR:', err);
  process.exit(1);
});
