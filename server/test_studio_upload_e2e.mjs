import 'dotenv/config';
import https from 'https';

const BASE_URL = 'http://localhost:5000/api/v1';

// Download small test MP4 buffer
function fetchSampleVideoBuffer() {
  return new Promise((resolve, reject) => {
    https.get('https://raw.githubusercontent.com/youtube/api-samples/master/java/src/main/resources/sample-video.mp4', (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download sample video: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// 1x1 transparent PNG buffer
const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_THUMBNAIL_BUFFER = Buffer.from(TEST_PNG_BASE64, 'base64');

async function jsonRequest(url, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runStudioAndUploadTests() {
  console.log('===============================================================');
  console.log('🎬 STREAMVIBE CREATOR STUDIO & VIDEO UPLOAD E2E TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`);
    }
  }

  try {
    // ─── 1. Security & Auth Guard Check ──────────────────────
    console.log('\n--- 1. Testing Unauthenticated Access Guards ---');
    const unauthStudioVideos = await jsonRequest(`${BASE_URL}/videos/studio/my-videos`);
    assert(
      unauthStudioVideos.status === 401,
      'GET /videos/studio/my-videos rejects unauthenticated requests with 401',
      `Got status ${unauthStudioVideos.status}`
    );

    const unauthAnalytics = await jsonRequest(`${BASE_URL}/analytics/channel`);
    assert(
      unauthAnalytics.status === 401,
      'GET /analytics/channel rejects unauthenticated requests with 401',
      `Got status ${unauthAnalytics.status}`
    );

    // ─── 2. Creator Account Authentication ────────────────────
    console.log('\n--- 2. Setting Up Test Creator Accounts ---');
    const timestamp = Date.now();
    const creatorEmail = `creator_${timestamp}@streamvibe.test`;
    const creatorPassword = 'Password123!';

    const regCreator = await jsonRequest(`${BASE_URL}/auth/register`, 'POST', {
      username: `creator_${timestamp}`.slice(0, 20),
      email: creatorEmail,
      password: creatorPassword,
      displayName: 'Studio Test Creator',
    });

    assert(
      regCreator.status === 201 && regCreator.data?.data?.accessToken,
      'Creator account registered successfully',
      JSON.stringify(regCreator.data)
    );
    const creatorToken = regCreator.data?.data?.accessToken;

    // Second user for permission tests
    const otherEmail = `other_${timestamp}@streamvibe.test`;
    const regOther = await jsonRequest(`${BASE_URL}/auth/register`, 'POST', {
      username: `other_${timestamp}`.slice(0, 20),
      email: otherEmail,
      password: 'Password123!',
      displayName: 'Other Channel User',
    });
    const otherToken = regOther.data?.data?.accessToken;
    assert(Boolean(otherToken), 'Second test user registered for ownership verification');

    // ─── 3. Initial Studio Analytics Check ───────────────────
    console.log('\n--- 3. Testing Channel Analytics API ---');
    const initialAnalytics = await jsonRequest(`${BASE_URL}/analytics/channel`, 'GET', null, creatorToken);
    assert(
      initialAnalytics.status === 200 && initialAnalytics.data?.success,
      'GET /analytics/channel returns 200 OK for creator',
      JSON.stringify(initialAnalytics.data)
    );

    const overview = initialAnalytics.data?.data?.overview;
    assert(
      overview &&
      typeof overview.totalViews === 'number' &&
      typeof overview.totalSubscribers === 'number' &&
      typeof overview.totalVideos === 'number' &&
      overview.totalVideos === 0,
      'Analytics returns initialized overview metrics with 0 initial videos'
    );

    // ─── 4. Initial Studio Video Listing ─────────────────────
    console.log('\n--- 4. Testing Studio Videos Management API ---');
    const initialVideos = await jsonRequest(`${BASE_URL}/videos/studio/my-videos`, 'GET', null, creatorToken);
    assert(
      initialVideos.status === 200 && initialVideos.data?.success,
      'GET /videos/studio/my-videos returns 200 OK',
      JSON.stringify(initialVideos.data)
    );
    assert(
      Array.isArray(initialVideos.data?.data?.videos) && initialVideos.data?.data?.videos.length === 0,
      'Studio video list is initially empty for new creator'
    );
    assert(
      initialVideos.data?.data?.pagination?.total === 0,
      'Pagination metadata present with total: 0'
    );

    // ─── 5. Upload Video with Cloudinary Streaming ───────────
    console.log('\n--- 5. Testing Real Video Upload to Cloudinary ---');
    console.log('Downloading sample MP4 buffer for real video upload test...');
    const videoBuffer = await fetchSampleVideoBuffer();
    console.log(`Downloaded sample MP4 (${videoBuffer.length} bytes). Preparing multipart upload...`);

    const form = new FormData();
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
    const thumbBlob = new Blob([TEST_THUMBNAIL_BUFFER], { type: 'image/png' });

    form.append('video', videoBlob, 'test_sample.mp4');
    form.append('thumbnail', thumbBlob, 'thumb.png');
    form.append('title', `Studio E2E Test Video ${timestamp}`);
    form.append('description', 'Comprehensive end-to-end testing of StreamVibe Creator Studio.');
    form.append('category', 'Tech');
    form.append('tags', 'tech,studio,testing,upload');
    form.append('type', 'video');
    form.append('visibility', 'public');

    const uploadRes = await fetch(`${BASE_URL}/videos/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creatorToken}`,
      },
      body: form,
    });
    const uploadData = await uploadRes.json().catch(() => null);

    assert(
      uploadRes.status === 201 && uploadData?.success,
      'POST /videos/upload returns 201 Created with valid Cloudinary asset',
      JSON.stringify(uploadData)
    );

    const uploadedVideo = uploadData?.data?.video;
    assert(Boolean(uploadedVideo?._id), 'Video saved to MongoDB with valid ObjectId');
    assert(
      uploadedVideo?.videoFile?.url?.startsWith('https://res.cloudinary.com/'),
      'videoFile.url is a valid secure Cloudinary URL'
    );
    assert(
      Boolean(uploadedVideo?.videoFile?.publicId),
      `videoFile.publicId stored: "${uploadedVideo?.videoFile?.publicId}"`
    );
    assert(
      uploadedVideo?.videoFile?.duration > 0,
      `Video duration detected: ${uploadedVideo?.videoFile?.duration}s`
    );
    assert(
      uploadedVideo?.thumbnail?.url?.startsWith('https://res.cloudinary.com/'),
      'thumbnail.url is a valid secure Cloudinary URL'
    );
    assert(uploadedVideo?.category === 'Tech', 'Video category matches "Tech"');
    assert(
      Array.isArray(uploadedVideo?.tags) && uploadedVideo.tags.includes('testing'),
      'Tags correctly parsed and saved'
    );

    const videoId = uploadedVideo._id;

    // ─── 6. Verify Studio Listing & Filters ───────────────────
    console.log('\n--- 6. Testing Studio Video Listing with Filters & Search ---');
    const myVideosAfterUpload = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos`,
      'GET',
      null,
      creatorToken
    );
    assert(
      myVideosAfterUpload.data?.data?.videos?.length === 1,
      'Studio my-videos lists newly uploaded video'
    );
    assert(
      myVideosAfterUpload.data?.data?.videos[0]._id === videoId,
      'Listed video ID matches uploaded video'
    );

    // Search filter
    const searchMatch = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos?search=Studio+E2E`,
      'GET',
      null,
      creatorToken
    );
    assert(
      searchMatch.data?.data?.videos?.length === 1,
      'Studio search by title substring returns matching video'
    );

    const searchNoMatch = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos?search=NonExistentQuery12345`,
      'GET',
      null,
      creatorToken
    );
    assert(
      searchNoMatch.data?.data?.videos?.length === 0,
      'Studio search with no match returns empty list'
    );

    // Visibility filter
    const publicFilter = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos?visibility=public`,
      'GET',
      null,
      creatorToken
    );
    assert(
      publicFilter.data?.data?.videos?.length === 1,
      'Filter visibility=public returns the public video'
    );

    const privateFilter = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos?visibility=private`,
      'GET',
      null,
      creatorToken
    );
    assert(
      privateFilter.data?.data?.videos?.length === 0,
      'Filter visibility=private returns 0 items'
    );

    // Analytics update check
    const updatedAnalytics = await jsonRequest(`${BASE_URL}/analytics/channel`, 'GET', null, creatorToken);
    assert(
      updatedAnalytics.data?.data?.overview?.totalVideos === 1,
      'Analytics totalVideos count updated to 1 via database aggregation'
    );
    assert(
      updatedAnalytics.data?.data?.latestVideoPerformance?._id === videoId,
      'Analytics latestVideoPerformance points to newly uploaded video'
    );

    // ─── 7. Video Metadata Update (Edit) ──────────────────────
    console.log('\n--- 7. Testing Video Metadata Update (Edit) ---');
    const updateForm = new FormData();
    updateForm.append('title', `Updated Studio Title ${timestamp}`);
    updateForm.append('description', 'Updated description from edit video modal.');
    updateForm.append('category', 'Gaming');
    updateForm.append('visibility', 'unlisted');
    updateForm.append('tags', 'updated,gaming,patch');

    const updateRes = await fetch(`${BASE_URL}/videos/${videoId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${creatorToken}`,
      },
      body: updateForm,
    });
    const updateData = await updateRes.json().catch(() => null);

    assert(
      updateRes.status === 200 && updateData?.success,
      'PATCH /videos/:id returns 200 OK on metadata update',
      JSON.stringify(updateData)
    );
    const updatedVideo = updateData?.data?.video;
    assert(
      updatedVideo?.title === `Updated Studio Title ${timestamp}`,
      'Updated title persists in database'
    );
    assert(updatedVideo?.category === 'Gaming', 'Updated category persists as "Gaming"');
    assert(updatedVideo?.visibility === 'unlisted', 'Updated visibility persists as "unlisted"');

    // ─── 8. Security & Ownership Authorization ────────────────
    console.log('\n--- 8. Testing Video Ownership & Authorization Controls ---');
    // Other user attempts to update creator's video
    const unauthForm = new FormData();
    unauthForm.append('title', 'Hacked Title');
    const unauthorizedUpdate = await fetch(`${BASE_URL}/videos/${videoId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherToken}` },
      body: unauthForm,
    });

    assert(
      unauthorizedUpdate.status === 403,
      'Non-owner cannot update video (403 Forbidden)',
      `Got status ${unauthorizedUpdate.status}`
    );

    // Other user attempts to delete creator's video
    const unauthorizedDelete = await jsonRequest(
      `${BASE_URL}/videos/${videoId}`,
      'DELETE',
      null,
      otherToken
    );
    assert(
      unauthorizedDelete.status === 403,
      'Non-owner cannot delete video (403 Forbidden)',
      `Got status ${unauthorizedDelete.status}`
    );

    // ─── 9. Video Deletion & Cloudinary Cleanup ───────────────
    console.log('\n--- 9. Testing Video Deletion & Cloudinary Cleanup ---');
    const deleteRes = await jsonRequest(
      `${BASE_URL}/videos/${videoId}`,
      'DELETE',
      null,
      creatorToken
    );
    assert(
      deleteRes.status === 200 && deleteRes.data?.success,
      'DELETE /videos/:id returns 200 OK on video removal',
      JSON.stringify(deleteRes.data)
    );

    // Verify video is removed from MongoDB
    const getDeleted = await jsonRequest(`${BASE_URL}/videos/${videoId}`);
    assert(
      getDeleted.status === 404,
      'Deleted video is no longer accessible (404 Not Found)'
    );

    // Verify Studio listing is empty again
    const studioAfterDelete = await jsonRequest(
      `${BASE_URL}/videos/studio/my-videos`,
      'GET',
      null,
      creatorToken
    );
    assert(
      studioAfterDelete.data?.data?.videos?.length === 0,
      'Studio my-videos list reflects video deletion'
    );

    // Verify user videoCount decremented
    const analyticsAfterDelete = await jsonRequest(
      `${BASE_URL}/analytics/channel`,
      'GET',
      null,
      creatorToken
    );
    assert(
      analyticsAfterDelete.data?.data?.overview?.totalVideos === 0,
      'Analytics totalVideos decrements back to 0'
    );

    console.log('\n===============================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('===============================================================');

    if (passedTests === totalTests) {
      console.log('All Creator Studio and Video Upload workflows verified successfully!');
      process.exit(0);
    } else {
      console.error(`Failed ${totalTests - passedTests} tests.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
  }
}

runStudioAndUploadTests();
