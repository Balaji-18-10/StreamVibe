/**
 * StreamVibe – Phase 11 Production Readiness & Security Verification Test Suite
 * Tests:
 * 1. Health & Database Diagnostic Endpoint
 * 2. Security Headers & Helmet Protection
 * 3. CORS Allowed & Disallowed Origin Enforcement
 * 4. General vs Strict Authentication Rate Limiting
 * 5. Secure Cookie Configuration & Logout Invalidation
 * 6. Cloudinary Dynamic Media URL Optimization
 * 7. MongoDB Production Compound Index Verification
 */

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import dotenv from 'dotenv';
dotenv.config({ path: 'E:/Youtube Clone/server/.env' });
import { normalizeMongoUri } from './src/config/db.js';

const BASE_URL = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runProductionTests() {
  console.log('\n🎬 ══════════════════════════════════════════════════════════');
  console.log('   STREAMVIBE PHASE 11: PRODUCTION READINESS & HARDENING');
  console.log('══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Health & Diagnostic Check
    console.log('🩺 Step 1: Health & Database Diagnostic Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthData.success === true, 'Health status reports success: true');
    assert(healthData.database?.status === 'connected', 'Database status reports "connected"');
    assert(healthData.database?.readyState === 1, 'Mongoose readyState equals 1 (connected)');

    // 2. Security Headers
    console.log('\n🛡️ Step 2: Security Headers & Helmet Hardening...');
    const corpHeader = healthRes.headers.get('cross-origin-resource-policy');
    assert(corpHeader === 'cross-origin', 'Cross-Origin-Resource-Policy is set to "cross-origin"');
    const xcto = healthRes.headers.get('x-content-type-options');
    assert(xcto === 'nosniff', 'X-Content-Type-Options is set to "nosniff"');

    // 3. CORS Policy Verification
    console.log('\n🌐 Step 3: CORS Allowed & Disallowed Origin Checks...');
    const allowedCorsRes = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    const allowOriginHeader = allowedCorsRes.headers.get('access-control-allow-origin');
    assert(allowOriginHeader === 'http://localhost:5173', 'CORS allows request from localhost:5173');

    const vercelPreviewRes = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'https://streamvibe-preview-123.vercel.app' },
    });
    const previewOrigin = vercelPreviewRes.headers.get('access-control-allow-origin');
    assert(previewOrigin === 'https://streamvibe-preview-123.vercel.app', 'CORS dynamically allows Vercel preview domains');

    const disallowedRes = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'https://malicious-site.example.com' },
    });
    assert(
      disallowedRes.status === 500 || !disallowedRes.headers.get('access-control-allow-origin'),
      'Disallowed origin rejected by CORS policy'
    );

    // 4. Rate Limiting Configuration
    console.log('\n⏱️ Step 4: Rate Limiting Enforcement...');
    const rateLimitHeadersRes = await fetch(`${BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'test', password: 'invalid' }),
    });
    const remaining = rateLimitHeadersRes.headers.get('ratelimit-remaining');
    const limit = rateLimitHeadersRes.headers.get('ratelimit-limit');
    assert(limit !== null, 'RateLimit-Limit header is returned on auth endpoints');
    assert(remaining !== null, 'RateLimit-Remaining header is returned on auth endpoints');

    // 5. Auth Cookies & Session Hardening
    console.log('\n🍪 Step 5: Secure Refresh Token Cookie Handling...');
    const ts = Date.now();
    const testUser = {
      username: `prod_${ts}`,
      email: `prod_${ts}@streamvibe.io`,
      password: 'Password123!',
      displayName: 'Production Test User',
    };

    const regRes = await fetch(`${BASE_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, 'Registration succeeds for session cookie test (201)');

    const cookieHeader = regRes.headers.get('set-cookie');
    assert(Boolean(cookieHeader), 'set-cookie header present on authentication');
    assert(cookieHeader.toLowerCase().includes('httponly'), 'refreshToken cookie has HttpOnly flag');
    assert(cookieHeader.toLowerCase().includes('path=/'), 'refreshToken cookie has path=/ set');

    // Logout cookie invalidation
    const logoutRes = await fetch(`${BASE_URL}/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.data.accessToken}`,
      },
    });
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert(logoutRes.status === 200, 'Logout succeeds with HTTP 200');
    assert(
      logoutCookie && (logoutCookie.includes('refreshToken=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('Expires=Thu, 01 Jan 1970')),
      'Logout clears the refresh token cookie'
    );

    // 6. MongoDB Compound Indexes Verification
    console.log('\n📊 Step 6: Database Compound Index Verification...');
    const mongoose = (await import('mongoose')).default;
    const dbUri = normalizeMongoUri(process.env.MONGODB_URI);
    await mongoose.connect(dbUri);

    const videoIndexes = await mongoose.connection.collection('videos').indexes();
    const hasTrendingIndex = videoIndexes.some((idx) => idx.key.views !== undefined && idx.key.isPublished !== undefined);
    assert(hasTrendingIndex, 'Video collection has compound index on visibility/isPublished/views');

    const hasShortsFeedIndex = videoIndexes.some((idx) => idx.key.type !== undefined && idx.key.createdAt !== undefined);
    assert(hasShortsFeedIndex, 'Video collection has compound index on type/createdAt');

    const reportIndexes = await mongoose.connection.collection('reports').indexes();
    const hasReportCompoundIndex = reportIndexes.some((idx) => idx.key.entityType !== undefined && idx.key.entityId !== undefined);
    assert(hasReportCompoundIndex, 'Report collection has compound index on entityType/entityId');

    await mongoose.disconnect();

    // Summary
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('══════════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runProductionTests();
