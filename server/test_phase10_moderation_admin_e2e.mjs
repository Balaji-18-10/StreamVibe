/**
 * StreamVibe – Phase 10 Content Moderation & Admin Dashboard Integration Test Suite
 * Tests:
 * 1. Video Reporting & Active Duplicate Prevention
 * 2. Comment Reporting & Active Duplicate Prevention
 * 3. Comment Moderation (Video Owner & Admin deletion vs Unauthorized rejection)
 * 4. Live Chat Moderation (Video Owner socket message deletion & user timeout)
 * 5. Strict Admin RBAC (403 Forbidden for regular users)
 * 6. Admin Statistics & Report Filtering/Pagination
 * 7. Admin Review & Content Takedown Actions
 */

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import dotenv from 'dotenv';
dotenv.config({ path: 'E:/Youtube Clone/server/.env' });
import { normalizeMongoUri } from './src/config/db.js';
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const BASE_URL = 'http://localhost:5000/api/v1';

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

async function registerAndLogin(prefix) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const user = {
    username: `${prefix}_${ts}`,
    email: `${prefix}_${ts}@streamvibe.internal`,
    password: 'Password123!',
    displayName: `${prefix.toUpperCase()} User`,
  };

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error(`Registration failed for ${prefix}: ${regData.message}`);
  }

  return {
    user: regData.data.user,
    token: regData.data.accessToken,
  };
}

async function runTests() {
  console.log('\n🎬 ══════════════════════════════════════════════════════════');
  console.log('   STREAMVIBE PHASE 10: CONTENT MODERATION & ADMIN DASHBOARD');
  console.log('══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Setup test users: Creator, Viewer A, Viewer B, Admin
    console.log('📦 Step 1: Provisioning test accounts...');
    const creator = await registerAndLogin('p10_creator');
    const viewerA = await registerAndLogin('p10_viewer_a');
    const viewerB = await registerAndLogin('p10_viewer_b');
    const adminUser = await registerAndLogin('p10_admin');

    // Escalate adminUser role directly in MongoDB via mongoose for testing RBAC
    const mongoose = (await import('mongoose')).default;
    const dbUri = normalizeMongoUri(process.env.MONGODB_URI);
    await mongoose.connect(dbUri);
    await mongoose.connection.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(adminUser.user._id) },
      { $set: { role: 'admin' } }
    );
    console.log('  👑 Admin privileges assigned to admin user.');

    // 2. Creator uploads a test video
    console.log('\n📹 Step 2: Creator creates a video for moderation testing...');
    const videoDoc = await mongoose.connection.collection('videos').insertOne({
      title: 'Phase 10 Test Video on Moderation',
      description: 'Testing video reports and content takedown',
      videoFile: {
        url: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
        publicId: 'sample_video_p10',
        duration: 120,
      },
      thumbnail: {
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        publicId: 'sample_thumb_p10',
      },
      owner: new mongoose.Types.ObjectId(creator.user._id),
      category: 'Tech',
      type: 'video',
      views: 10,
      isPublished: true,
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const videoId = videoDoc.insertedId.toString();
    console.log(`  ✅ Video created with ID: ${videoId}`);

    // 3. Video Reporting Tests
    console.log('\n🚩 Step 3: Video Reporting & Duplicate Prevention...');
    // A. Unauthenticated report fails
    const unauthReportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'Video',
        entityId: videoId,
        reason: 'spam',
      }),
    });
    assert(unauthReportRes.status === 401, 'Unauthenticated user cannot report video (401)');

    // B. Viewer A reports video
    const report1Res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerA.token}`,
      },
      body: JSON.stringify({
        entityType: 'Video',
        entityId: videoId,
        reason: 'misleading',
        description: 'Misleading thumbnail and title claims.',
      }),
    });
    const report1Data = await report1Res.json();
    assert(report1Res.status === 201 && report1Data.success, 'Viewer A successfully reports video (201)');
    assert(report1Data.data.report.status === 'pending', 'Initial report status is "pending"');
    const videoReportId = report1Data.data.report._id;

    // C. Viewer A attempts duplicate active report -> must fail
    const dupReportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerA.token}`,
      },
      body: JSON.stringify({
        entityType: 'Video',
        entityId: videoId,
        reason: 'spam',
      }),
    });
    const dupReportData = await dupReportRes.json();
    assert(dupReportRes.status === 400 && !dupReportData.success, 'Duplicate active report from same user is rejected (400)');

    // D. Viewer B reports the same video with a different reason -> succeeds
    const viewerBReportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerB.token}`,
      },
      body: JSON.stringify({
        entityType: 'Video',
        entityId: videoId,
        reason: 'spam',
        description: 'Contains spam affiliate links.',
      }),
    });
    assert(viewerBReportRes.status === 201, 'Different user can submit report for same content (201)');

    // 4. Comment Moderation & Reporting
    console.log('\n💬 Step 4: Comment Reporting & Video Owner Deletion...');
    // A. Viewer B posts a comment
    const commentRes = await fetch(`${BASE_URL}/comments/video/${videoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerB.token}`,
      },
      body: JSON.stringify({ content: 'Spam comment with malicious link!' }),
    });
    const commentData = await commentRes.json();
    const commentId = commentData.data.comment._id;
    assert(commentRes.status === 201, 'Viewer B posts a test comment');

    // B. Viewer A reports the comment
    const commentReportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${viewerA.token}`,
      },
      body: JSON.stringify({
        entityType: 'Comment',
        entityId: commentId,
        reason: 'harassment',
        description: 'Offensive language in comment.',
      }),
    });
    const commentReportData = await commentReportRes.json();
    assert(commentReportRes.status === 201, 'Viewer A reports comment successfully (201)');
    const commentReportId = commentReportData.data.report._id;

    // C. Viewer A (unauthorized non-owner, non-author) tries to delete the comment -> 403 Forbidden
    const unauthDeleteRes = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${viewerA.token}` },
    });
    assert(unauthDeleteRes.status === 403, 'Unauthorized user cannot delete another user\'s comment (403)');

    // D. Video Creator deletes the comment on their own video -> 200 Success
    const creatorDeleteRes = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creator.token}` },
    });
    const creatorDeleteData = await creatorDeleteRes.json();
    assert(creatorDeleteRes.status === 200 && creatorDeleteData.success, 'Video Creator can delete comment on their own video (200)');

    // 5. Live Chat Moderation via Socket.IO
    console.log('\n🔴 Step 5: Real-Time Live Chat Moderation (Delete & Timeout)...');
    const creatorSocket = io('http://localhost:5000', {
      auth: { token: creator.token },
      transports: ['websocket'],
    });
    const viewerSocket = io('http://localhost:5000', {
      auth: { token: viewerA.token },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      let connected = 0;
      const check = () => {
        connected++;
        if (connected === 2) resolve();
      };
      creatorSocket.on('connect', check);
      viewerSocket.on('connect', check);
    });

    // Both join video chat
    await new Promise((res) => creatorSocket.emit('chat:join', { videoId }, res));
    await new Promise((res) => viewerSocket.emit('chat:join', { videoId }, res));

    // Viewer sends a chat message
    const chatMsg = await new Promise((res) => {
      viewerSocket.emit('chat:message', { videoId, message: 'Message to be deleted by host' }, res);
    });
    assert(chatMsg.success && chatMsg.data?._id, 'Viewer sends message in live chat');
    const chatMsgId = chatMsg.data._id;

    // Non-owner (Viewer B) attempts to delete message -> rejected
    const viewerBSocket = io('http://localhost:5000', {
      auth: { token: viewerB.token },
      transports: ['websocket'],
    });
    await new Promise((res) => viewerBSocket.on('connect', res));
    const unauthChatDelete = await new Promise((res) => {
      viewerBSocket.emit('chat:delete_message', { videoId, messageId: chatMsgId }, res);
    });
    assert(!unauthChatDelete.success, 'Unauthorized user cannot delete live chat message');

    // Video Creator deletes chat message
    let broadcastDeleteReceived = false;
    viewerSocket.on('chat:message_deleted', (payload) => {
      if (payload.messageId === chatMsgId) broadcastDeleteReceived = true;
    });

    const creatorChatDelete = await new Promise((res) => {
      creatorSocket.emit('chat:delete_message', { videoId, messageId: chatMsgId }, res);
    });
    assert(creatorChatDelete.success, 'Video Creator deletes live chat message');
    await new Promise((r) => setTimeout(r, 200));
    assert(broadcastDeleteReceived, 'chat:message_deleted event broadcast to room');

    // Creator timeouts Viewer A for 10 seconds
    let muteEventReceived = false;
    viewerSocket.on('chat:user_muted', (payload) => {
      if (payload.userId === viewerA.user._id) muteEventReceived = true;
    });

    const muteRes = await new Promise((res) => {
      creatorSocket.emit('chat:mute_user', { videoId, targetUserId: viewerA.user._id, durationSeconds: 10 }, res);
    });
    assert(muteRes.success, 'Creator times out Viewer A in chat');
    await new Promise((r) => setTimeout(r, 200));
    assert(muteEventReceived, 'chat:user_muted broadcast event received');

    // Muted viewer attempts to send message -> rejected
    const mutedSendRes = await new Promise((res) => {
      viewerSocket.emit('chat:message', { videoId, message: 'I am timed out' }, res);
    });
    assert(!mutedSendRes.success, 'Timed-out user is blocked from sending live chat messages');

    creatorSocket.disconnect();
    viewerSocket.disconnect();
    viewerBSocket.disconnect();

    // 6. Admin RBAC & Dashboard Statistics
    console.log('\n👑 Step 6: Admin Role Enforcement & Dashboard Stats...');
    // Regular user accesses /admin/stats -> 403 Forbidden
    const unauthStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${viewerA.token}` },
    });
    assert(unauthStatsRes.status === 403, 'Regular user cannot access admin stats (403)');

    // Admin accesses /admin/stats -> 200 OK
    const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
    });
    const adminStatsData = await adminStatsRes.json();
    assert(adminStatsRes.status === 200 && adminStatsData.success, 'Admin user can fetch admin stats (200)');
    assert(adminStatsData.data.stats.totalUsers >= 4, 'Stats contain valid totalUsers count');
    assert(adminStatsData.data.stats.totalReports >= 2, 'Stats contain valid totalReports count');
    assert(adminStatsData.data.stats.pendingReports >= 1, 'Stats contain valid pendingReports count');

    // 7. Admin Reports Querying, Filtering & Pagination
    console.log('\n📋 Step 7: Admin Reports Querying, Filters & Pagination...');
    const reportsRes = await fetch(`${BASE_URL}/admin/reports?status=pending&limit=10`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
    });
    const reportsData = await reportsRes.json();
    assert(reportsRes.status === 200 && reportsData.success, 'Admin queries pending reports with pagination (200)');
    assert(Array.isArray(reportsData.data.reports) && reportsData.data.reports.length > 0, 'Pending reports returned');

    // Filter by entityType = Video
    const videoFilterRes = await fetch(`${BASE_URL}/admin/reports?entityType=Video`, {
      headers: { Authorization: `Bearer ${adminUser.token}` },
    });
    const videoFilterData = await videoFilterRes.json();
    assert(
      videoFilterData.data.reports.every((r) => r.entityType === 'Video'),
      'Filter by entityType="Video" correctly filters records'
    );

    // 8. Admin Moderation Actions & Content Takedown
    console.log('\n⚖️ Step 8: Admin Review & Content Takedown Actions...');
    // A. Mark report as under review
    const updateRes = await fetch(`${BASE_URL}/admin/reports/${videoReportId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminUser.token}`,
      },
      body: JSON.stringify({
        status: 'reviewed',
        moderatorNotes: 'Investigating copyright & misleading claims.',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.data.report.status === 'reviewed', 'Admin marks report as reviewed (200)');

    // B. Admin executes takedown on reported video
    const takedownRes = await fetch(`${BASE_URL}/admin/reports/${videoReportId}/takedown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminUser.token}`,
      },
      body: JSON.stringify({
        moderatorNotes: 'Content violated StreamVibe policy: removed by moderation team.',
      }),
    });
    const takedownData = await takedownRes.json();
    assert(takedownRes.status === 200 && takedownData.success, 'Admin successfully executes content takedown (200)');
    assert(takedownData.data.report.status === 'resolved', 'Report status updated to "resolved"');
    assert(takedownData.data.report.moderationAction === 'content_removed', 'Moderation action is "content_removed"');

    // C. Verify video is now unlisted/unpublished in DB
    const checkVideo = await mongoose.connection.collection('videos').findOne({
      _id: new mongoose.Types.ObjectId(videoId),
    });
    assert(checkVideo.isPublished === false, 'Violating video isPublished set to false');

    // D. Verify duplicate active report was also auto-resolved
    const duplicateReport = await mongoose.connection.collection('reports').findOne({
      reporter: new mongoose.Types.ObjectId(viewerB.user._id),
      entityId: new mongoose.Types.ObjectId(videoId),
    });
    assert(duplicateReport.status === 'resolved', 'Duplicate active report on same entity was auto-resolved');

    // Close mongoose test connection
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

runTests();
