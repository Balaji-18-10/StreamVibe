/**
 * StreamVibe Phase 9 — Comprehensive Real-Time Live Chat E2E Test Suite
 *
 * Verifies:
 * 1. Two separate authenticated users (Alice and Bob) + 1 guest connection
 * 2. Socket.IO connection & room joining (chat:join) with history retrieval
 * 3. Instant real-time message exchange between Alice and Bob
 * 4. Message persistence in MongoDB & verification via GET /api/v1/videos/:id/chat
 * 5. Typing indicator emissions (chat:typing, chat:stop_typing)
 * 6. Live room presence & viewer count updates (chat:viewer_count)
 * 7. Security & Validation:
 *    - Unauthenticated guest message rejection
 *    - Empty message rejection
 *    - Message length limit (>500 chars)
 *    - Anti-spam rate limiting (>5 msgs in 3s)
 * 8. Room leaving (chat:leave) and disconnection cleanup
 */

import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const BASE_URL = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

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
  console.log('\n================================================================');
  console.log('🚀 STREAMVIBE PHASE 9: REAL-TIME LIVE CHAT E2E TEST SUITE');
  console.log('================================================================\n');

  const ts = Date.now();

  // 1. Setup Test Users
  console.log('--- 1. Setting Up Test Users & Video ---');
  const userAliceData = {
    displayName: 'Chat Alice',
    username: `alice_${ts}`,
    email: `alice_${ts}@streamvibe.io`,
    password: 'Password123!',
  };
  const userBobData = {
    displayName: 'Chat Bob',
    username: `bob_${ts}`,
    email: `bob_${ts}@streamvibe.io`,
    password: 'Password123!',
  };

  const [resAlice, resBob] = await Promise.all([
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userAliceData),
    }),
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userBobData),
    }),
  ]);

  const [dataAlice, dataBob] = await Promise.all([resAlice.json(), resBob.json()]);

  assert(resAlice.status === 201, 'User Alice registered successfully');
  assert(resBob.status === 201, 'User Bob registered successfully');

  const tokenAlice = dataAlice.data.accessToken;
  const idAlice = dataAlice.data.user._id;
  const tokenBob = dataBob.data.accessToken;
  const idBob = dataBob.data.user._id;

  // Obtain an existing video ID to attach live chat
  const videosRes = await fetch(`${BASE_URL}/videos?limit=1`);
  const videosData = await videosRes.json();
  const testVideo = videosData.data?.videos?.[0];
  assert(testVideo && testVideo._id, 'Retrieved valid video asset for live chat testing');
  const videoId = testVideo._id;

  // -----------------------------------------------------------------
  // 2. SOCKET CONNECTIONS (ALICE, BOB, GUEST)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Establishing Socket.IO Connections ---');

  const socketAlice = io(SOCKET_URL, {
    auth: { token: tokenAlice },
    transports: ['websocket'],
  });

  const socketBob = io(SOCKET_URL, {
    auth: { token: tokenBob },
    transports: ['websocket'],
  });

  const socketGuest = io(SOCKET_URL, {
    transports: ['websocket'],
  });

  // Wait for all 3 sockets to connect
  await Promise.all([
    new Promise((resolve) => socketAlice.on('connect', resolve)),
    new Promise((resolve) => socketBob.on('connect', resolve)),
    new Promise((resolve) => socketGuest.on('connect', resolve)),
  ]);

  assert(socketAlice.connected === true, 'Alice authenticated socket connected');
  assert(socketBob.connected === true, 'Bob authenticated socket connected');
  assert(socketGuest.connected === true, 'Guest socket connected for read-only viewing');

  // -----------------------------------------------------------------
  // 3. JOINING CHAT ROOMS & HISTORY RETRIEVAL
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Room Joining & History Retrieval ---');

  // Alice joins chat room
  const joinAlicePromise = new Promise((resolve) => {
    socketAlice.emit('chat:join', { videoId }, (res) => resolve(res));
  });
  const resJoinAlice = await joinAlicePromise;
  assert(resJoinAlice.success === true, 'Alice joined chat room successfully');
  assert(Array.isArray(resJoinAlice.messages), 'Initial chat history returned as an array');

  // Bob joins chat room
  const joinBobPromise = new Promise((resolve) => {
    socketBob.emit('chat:join', { videoId }, (res) => resolve(res));
  });
  const resJoinBob = await joinBobPromise;
  assert(resJoinBob.success === true, 'Bob joined chat room successfully');
  assert(resJoinBob.viewerCount >= 2, 'Viewer count reflects active room participants (>=2)');

  // -----------------------------------------------------------------
  // 4. REAL-TIME MESSAGE EXCHANGE (ALICE -> BOB, BOB -> ALICE)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Real-Time Live Message Delivery ---');

  const messageTextFromAlice = `Hello Bob! Real-time live stream test at ${Date.now()}`;

  // Set up listener for Bob to receive Alice's message
  const bobReceivesAliceMsgPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Bob timed out waiting for Alice message')), 5000);
    socketBob.on('chat:message', (msg) => {
      if (msg.message === messageTextFromAlice) {
        clearTimeout(timeout);
        resolve(msg);
      }
    });
  });

  // Alice sends message
  const aliceSendPromise = new Promise((resolve) => {
    socketAlice.emit('chat:message', { videoId, message: messageTextFromAlice }, (res) => resolve(res));
  });

  const [sendResultAlice, receivedByBob] = await Promise.all([
    aliceSendPromise,
    bobReceivesAliceMsgPromise,
  ]);

  assert(sendResultAlice.success === true, 'Alice message acknowledged with success: true');
  assert(receivedByBob.message === messageTextFromAlice, 'Bob received Alice exact message string');
  assert(receivedByBob.user?.username === userAliceData.username, 'Sender username matches Alice');
  assert(receivedByBob._id, 'Message payload contains persistent MongoDB _id');

  // Bob replies to Alice
  const messageTextFromBob = `Hey Alice! Received your message instantly! ${Date.now()}`;

  const aliceReceivesBobMsgPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Alice timed out waiting for Bob message')), 5000);
    socketAlice.on('chat:message', (msg) => {
      if (msg.message === messageTextFromBob) {
        clearTimeout(timeout);
        resolve(msg);
      }
    });
  });

  socketBob.emit('chat:message', { videoId, message: messageTextFromBob });
  const receivedByAlice = await aliceReceivesBobMsgPromise;

  assert(receivedByAlice.message === messageTextFromBob, 'Alice received Bob reply in real time');
  assert(receivedByAlice.user?.username === userBobData.username, 'Sender username matches Bob');

  // -----------------------------------------------------------------
  // 5. TYPING INDICATORS
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing Typing Indicators ---');

  // Alice starts typing
  const bobReceivesTypingPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Bob timed out waiting for typing indicator')), 5000);
    socketBob.on('chat:typing', (data) => {
      if (String(data.videoId) === String(videoId) && data.user?.username === userAliceData.username) {
        clearTimeout(timeout);
        resolve(data);
      }
    });
  });

  socketAlice.emit('chat:typing', { videoId });
  const typingEvent = await bobReceivesTypingPromise;
  assert(typingEvent.user?.username === userAliceData.username, 'Bob received Alice typing event');

  // Alice stops typing
  const bobReceivesStopTypingPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Bob timed out waiting for stop typing')), 5000);
    socketBob.on('chat:stop_typing', (data) => {
      if (String(data.videoId) === String(videoId) && String(data.userId) === String(idAlice)) {
        clearTimeout(timeout);
        resolve(data);
      }
    });
  });

  socketAlice.emit('chat:stop_typing', { videoId });
  const stopTypingEvent = await bobReceivesStopTypingPromise;
  assert(String(stopTypingEvent.userId) === String(idAlice), 'Bob received Alice stop typing event');

  // -----------------------------------------------------------------
  // 6. REST API CHAT HISTORY
  // -----------------------------------------------------------------
  console.log('\n--- 6. Verifying Chat History REST Endpoint ---');

  const historyRes = await fetch(`${BASE_URL}/videos/${videoId}/chat?limit=50`);
  const historyData = await historyRes.json();
  assert(historyRes.status === 200, 'GET /videos/:id/chat returns HTTP 200');
  assert(historyData.success === true, 'History response success is true');
  assert(Array.isArray(historyData.data?.messages), 'Messages array returned');
  assert(historyData.data.messages.length >= 2, 'History contains at least the 2 newly sent messages');

  const lastMsg = historyData.data.messages[historyData.data.messages.length - 1];
  assert(lastMsg.message === messageTextFromBob, 'Latest message in history matches Bob reply');

  // -----------------------------------------------------------------
  // 7. SECURITY & VALIDATION CONTROLS
  // -----------------------------------------------------------------
  console.log('\n--- 7. Testing Security & Rate Limits ---');

  // 7.1 Guest cannot send messages
  {
    const guestSendPromise = new Promise((resolve) => {
      socketGuest.emit('chat:message', { videoId, message: 'I am a guest' }, (res) => resolve(res));
    });
    const guestResult = await guestSendPromise;
    assert(guestResult.success === false, 'Guest message sending is rejected');
  }

  // 7.2 Empty message rejection
  {
    const emptySendPromise = new Promise((resolve) => {
      socketAlice.emit('chat:message', { videoId, message: '    ' }, (res) => resolve(res));
    });
    const emptyResult = await emptySendPromise;
    assert(emptyResult.success === false, 'Empty/whitespace message is rejected');
  }

  // 7.3 Exceeding max length (500 chars) rejection
  {
    const longMessage = 'A'.repeat(501);
    const longSendPromise = new Promise((resolve) => {
      socketAlice.emit('chat:message', { videoId, message: longMessage }, (res) => resolve(res));
    });
    const longResult = await longSendPromise;
    assert(longResult.success === false, 'Message exceeding 500 characters is rejected');
  }

  // 7.4 Anti-Spam Rate Limit (>5 msgs in rapid succession)
  {
    let rateLimited = false;
    const spamPromises = [];
    for (let i = 0; i < 7; i++) {
      spamPromises.push(
        new Promise((resolve) => {
          socketAlice.emit('chat:message', { videoId, message: `Spam test ${i}` }, (r) => resolve(r));
        })
      );
    }
    const results = await Promise.all(spamPromises);
    rateLimited = results.some(
      (res) => res && res.success === false && /rate limit/i.test(res.message || '')
    );
    assert(rateLimited === true, 'Anti-spam rate limiter caught rapid message emissions');
  }

  // -----------------------------------------------------------------
  // 8. ROOM LEAVING & CLEANUP
  // -----------------------------------------------------------------
  console.log('\n--- 8. Testing Room Leaving & Socket Teardown ---');

  const bobLeavesPromise = new Promise((resolve) => {
    socketBob.emit('chat:leave', { videoId }, (res) => resolve(res));
  });
  const leaveResult = await bobLeavesPromise;
  assert(leaveResult.success === true, 'Bob left chat room cleanly');

  // Disconnect sockets
  socketAlice.disconnect();
  socketBob.disconnect();
  socketGuest.disconnect();

  assert(socketAlice.disconnected === true, 'Alice socket disconnected');
  assert(socketBob.disconnected === true, 'Bob socket disconnected');
  assert(socketGuest.disconnected === true, 'Guest socket disconnected');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 9 LIVE CHAT E2E INTEGRATION TESTS PASSED!`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN ABORTED WITH ERROR:', err);
  process.exit(1);
});
