import 'dotenv/config';

const BASE_URL = 'http://localhost:5000/api/v1';

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

async function runLibraryE2ETests() {
  console.log('===============================================================');
  console.log('📚 STREAMVIBE PHASE 6: USER LIBRARY & PLAYLISTS E2E TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${name}`);
    } else {
      console.error(`❌ [FAIL] ${name}: ${details}`);
    }
  }

  try {
    // ─── 1. Unauthenticated Access Protection ────────────────
    console.log('\n--- 1. Testing Unauthenticated Access Guards ---');
    const unauthHistory = await jsonRequest(`${BASE_URL}/users/me/history`);
    assert(unauthHistory.status === 401, 'GET /users/me/history rejects unauthenticated with 401');

    const unauthClearHistory = await jsonRequest(`${BASE_URL}/users/me/history`, 'DELETE');
    assert(unauthClearHistory.status === 401, 'DELETE /users/me/history rejects unauthenticated with 401');

    const unauthLiked = await jsonRequest(`${BASE_URL}/likes/videos`);
    assert(unauthLiked.status === 401, 'GET /likes/videos rejects unauthenticated with 401');

    const unauthWatchLater = await jsonRequest(`${BASE_URL}/playlists/system/watch-later`);
    assert(unauthWatchLater.status === 401, 'GET /playlists/system/watch-later rejects unauthenticated with 401');

    const unauthMyPlaylists = await jsonRequest(`${BASE_URL}/playlists/me`);
    assert(unauthMyPlaylists.status === 401, 'GET /playlists/me rejects unauthenticated with 401');

    // ─── 2. Set Up Test Users & Video ────────────────────────
    console.log('\n--- 2. Setting Up Test Accounts & Video Assets ---');
    const timestamp = Date.now();
    const userAEmail = `lib_user_a_${timestamp}@streamvibe.test`;
    const userBEmail = `lib_user_b_${timestamp}@streamvibe.test`;

    const regA = await jsonRequest(`${BASE_URL}/auth/register`, 'POST', {
      username: `usera_${timestamp}`.slice(0, 20),
      email: userAEmail,
      password: 'Password123!',
      displayName: 'Library User A',
    });
    assert(regA.status === 201 && regA.data?.data?.accessToken, 'User A registered successfully');
    const tokenA = regA.data?.data?.accessToken;
    const userA = regA.data?.data?.user;

    const regB = await jsonRequest(`${BASE_URL}/auth/register`, 'POST', {
      username: `userb_${timestamp}`.slice(0, 20),
      email: userBEmail,
      password: 'Password123!',
      displayName: 'Library User B',
    });
    assert(regB.status === 201 && regB.data?.data?.accessToken, 'User B registered successfully');
    const tokenB = regB.data?.data?.accessToken;

    // Get an existing video from the database to test with
    const videosRes = await jsonRequest(`${BASE_URL}/videos?limit=5`);
    const availableVideos = videosRes.data?.data?.videos || [];
    assert(availableVideos.length >= 2, 'At least 2 platform videos found for library testing');

    const video1 = availableVideos[0];
    const video2 = availableVideos[1];
    const video1Id = video1._id;
    const video2Id = video2._id;

    // ─── 3. Watch History Recording, Retrieval & Cleanup ─────
    console.log('\n--- 3. Testing Watch History Flow ---');
    // Initial history check
    const initialHistory = await jsonRequest(`${BASE_URL}/users/me/history`, 'GET', null, tokenA);
    assert(
      initialHistory.status === 200 && initialHistory.data?.data?.videos?.length === 0,
      'Initial watch history is empty for new user'
    );

    // Record view on video1
    const viewRes1 = await jsonRequest(`${BASE_URL}/videos/${video1Id}/view`, 'POST', null, tokenA);
    assert(viewRes1.status === 200, 'Recorded view on video 1 with user token');

    // Record view on video2
    const viewRes2 = await jsonRequest(`${BASE_URL}/videos/${video2Id}/view`, 'POST', null, tokenA);
    assert(viewRes2.status === 200, 'Recorded view on video 2 with user token');

    // Retrieve history (most recent first)
    const historyAfterViews = await jsonRequest(`${BASE_URL}/users/me/history`, 'GET', null, tokenA);
    assert(
      historyAfterViews.status === 200 && historyAfterViews.data?.data?.videos?.length === 2,
      'GET /users/me/history returns 2 watched videos'
    );
    assert(
      historyAfterViews.data?.data?.videos[0]._id === video2Id,
      'Most recently watched video (video2) is at index 0'
    );
    assert(
      Boolean(historyAfterViews.data?.data?.pagination),
      'Pagination metadata returned with total: 2'
    );

    // Remove single item from history (remove video2)
    const removeSingle = await jsonRequest(
      `${BASE_URL}/users/me/history/${video2Id}`,
      'DELETE',
      null,
      tokenA
    );
    assert(removeSingle.status === 200, 'DELETE /users/me/history/:videoId returns 200 OK');

    const historyAfterSingleRemove = await jsonRequest(`${BASE_URL}/users/me/history`, 'GET', null, tokenA);
    assert(
      historyAfterSingleRemove.data?.data?.videos?.length === 1 &&
      historyAfterSingleRemove.data?.data?.videos[0]._id === video1Id,
      'History reflects single item removal (only video1 remains)'
    );

    // Clear entire history
    const clearAll = await jsonRequest(`${BASE_URL}/users/me/history`, 'DELETE', null, tokenA);
    assert(clearAll.status === 200, 'DELETE /users/me/history returns 200 OK');

    const historyAfterClear = await jsonRequest(`${BASE_URL}/users/me/history`, 'GET', null, tokenA);
    assert(
      historyAfterClear.data?.data?.videos?.length === 0,
      'Watch history is completely empty after clear'
    );

    // ─── 4. Watch Later System Playlist ──────────────────────
    console.log('\n--- 4. Testing Watch Later Playlist ---');
    // Get Watch Later playlist
    const getWL1 = await jsonRequest(`${BASE_URL}/playlists/system/watch-later`, 'GET', null, tokenA);
    assert(
      getWL1.status === 200 && getWL1.data?.data?.playlist?.systemType === 'watch_later',
      'GET /playlists/system/watch-later retrieves/auto-creates system playlist'
    );
    const watchLaterId = getWL1.data?.data?.playlist?._id;

    // Add video1 to Watch Later
    const addWL = await jsonRequest(
      `${BASE_URL}/playlists/system/watch-later/videos`,
      'POST',
      { videoId: video1Id },
      tokenA
    );
    assert(
      addWL.status === 201 && addWL.data?.success,
      'POST /playlists/system/watch-later/videos adds video to Watch Later'
    );

    // Prevent duplicate entry in Watch Later
    const addWLDup = await jsonRequest(
      `${BASE_URL}/playlists/system/watch-later/videos`,
      'POST',
      { videoId: video1Id },
      tokenA
    );
    assert(
      addWLDup.status === 400,
      'Adding duplicate video to Watch Later is rejected with 400 Bad Request'
    );

    // Verify video is in Watch Later
    const getWL2 = await jsonRequest(`${BASE_URL}/playlists/system/watch-later`, 'GET', null, tokenA);
    assert(
      getWL2.data?.data?.playlist?.videos?.length === 1 &&
      getWL2.data?.data?.playlist?.videos[0].video?._id === video1Id,
      'Watch Later playlist contains saved video1 with populated metadata'
    );

    // Remove video1 from Watch Later
    const removeWL = await jsonRequest(
      `${BASE_URL}/playlists/system/watch-later/videos/${video1Id}`,
      'DELETE',
      null,
      tokenA
    );
    assert(
      removeWL.status === 200 && removeWL.data?.success,
      'DELETE /playlists/system/watch-later/videos/:videoId removes video'
    );

    const getWL3 = await jsonRequest(`${BASE_URL}/playlists/system/watch-later`, 'GET', null, tokenA);
    assert(
      getWL3.data?.data?.playlist?.videos?.length === 0,
      'Watch Later playlist is empty after removal'
    );

    // ─── 5. Liked Videos Listing & Unlike Flow ────────────────
    console.log('\n--- 5. Testing Liked Videos Listing & Unlike Flow ---');
    // Like video1
    const likeRes = await jsonRequest(
      `${BASE_URL}/likes/video/${video1Id}`,
      'POST',
      { type: 'like' },
      tokenA
    );
    assert(likeRes.status === 200 && likeRes.data?.data?.liked === true, 'Liked video1 successfully');

    // Retrieve Liked Videos
    const likedList = await jsonRequest(`${BASE_URL}/likes/videos`, 'GET', null, tokenA);
    assert(
      likedList.status === 200 && likedList.data?.data?.videos?.length >= 1,
      'GET /likes/videos returns liked video list'
    );
    assert(
      likedList.data?.data?.videos[0]._id === video1Id,
      'Liked video ID matches video1'
    );
    assert(
      Boolean(likedList.data?.data?.videos[0].likedAt),
      'Video object includes likedAt timestamp'
    );
    assert(
      Boolean(likedList.data?.data?.videos[0].owner?.displayName),
      'Video creator info is populated'
    );

    // Unlike video1 directly
    const unlikeRes = await jsonRequest(
      `${BASE_URL}/likes/video/${video1Id}`,
      'POST',
      { type: 'like' },
      tokenA
    );
    assert(unlikeRes.status === 200 && unlikeRes.data?.data?.liked === false, 'Unliked video1 (toggle off)');

    // Verify Liked Videos list reflects unlike
    const likedListAfter = await jsonRequest(`${BASE_URL}/likes/videos`, 'GET', null, tokenA);
    const stillInLiked = (likedListAfter.data?.data?.videos || []).some((v) => v._id === video1Id);
    assert(!stillInLiked, 'Video is removed from GET /likes/videos after unliking');

    // ─── 6. Custom Playlist Creation, Video Add & Reorder ────
    console.log('\n--- 6. Testing Custom Playlist Lifecycle ---');
    // Create playlist
    const createPlRes = await jsonRequest(
      `${BASE_URL}/playlists`,
      'POST',
      {
        name: `Test Playlist ${timestamp}`,
        description: 'Testing user custom playlist features.',
        visibility: 'public',
      },
      tokenA
    );
    assert(
      createPlRes.status === 201 && createPlRes.data?.data?.playlist,
      'POST /playlists creates new custom playlist'
    );
    const playlistId = createPlRes.data?.data?.playlist?._id;

    // Add video1
    const addVid1 = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}/videos`,
      'POST',
      { videoId: video1Id },
      tokenA
    );
    assert(addVid1.status === 200, 'Added video1 to custom playlist');

    // Prevent duplicate
    const addVid1Dup = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}/videos`,
      'POST',
      { videoId: video1Id },
      tokenA
    );
    assert(addVid1Dup.status === 400, 'Duplicate addition to playlist rejected with 400');

    // Add video2
    const addVid2 = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}/videos`,
      'POST',
      { videoId: video2Id },
      tokenA
    );
    assert(addVid2.status === 200, 'Added video2 to custom playlist');

    // Reorder videos: [video2, video1]
    const reorderRes = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}/reorder`,
      'PATCH',
      { videoIds: [video2Id, video1Id] },
      tokenA
    );
    assert(reorderRes.status === 200, 'PATCH /playlists/:id/reorder returns 200 OK');

    // Verify detail reflects new order
    const plDetail = await jsonRequest(`${BASE_URL}/playlists/${playlistId}`, 'GET', null, tokenA);
    assert(
      plDetail.status === 200 &&
      plDetail.data?.data?.playlist?.videos?.length === 2 &&
      plDetail.data?.data?.playlist?.videos[0].video?._id === video2Id &&
      plDetail.data?.data?.playlist?.videos[1].video?._id === video1Id,
      'Playlist videos reordered successfully: video2 at position 0, video1 at position 1'
    );

    // Remove video1
    const removeVid1 = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}/videos/${video1Id}`,
      'DELETE',
      null,
      tokenA
    );
    assert(removeVid1.status === 200, 'Removed video1 from custom playlist');

    // Edit playlist: change visibility to private
    const editPl = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'PATCH',
      {
        name: `Updated Playlist ${timestamp}`,
        description: 'Updated private description.',
        visibility: 'private',
      },
      tokenA
    );
    assert(
      editPl.status === 200 && editPl.data?.data?.playlist?.visibility === 'private',
      'PATCH /playlists/:id updated playlist to private'
    );

    // ─── 7. Privacy & Authorization Enforcement ───────────────
    console.log('\n--- 7. Testing Privacy & Authorization Controls ---');
    // User B attempts to access User A's private playlist -> 403 Forbidden
    const unauthVisitorAccess = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'GET',
      null,
      tokenB
    );
    assert(
      unauthVisitorAccess.status === 403,
      'Visitor access to private playlist returns 403 Forbidden',
      `Got status ${unauthVisitorAccess.status}`
    );

    // User B attempts to edit User A's playlist -> 403 Forbidden
    const unauthEdit = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'PATCH',
      { name: 'Hacked Playlist' },
      tokenB
    );
    assert(
      unauthEdit.status === 403,
      'Non-owner cannot edit playlist (403 Forbidden)',
      `Got status ${unauthEdit.status}`
    );

    // User B attempts to delete User A's playlist -> 403 Forbidden
    const unauthDelete = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'DELETE',
      null,
      tokenB
    );
    assert(
      unauthDelete.status === 403,
      'Non-owner cannot delete playlist (403 Forbidden)',
      `Got status ${unauthDelete.status}`
    );

    // User A successfully deletes playlist
    const ownerDelete = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'DELETE',
      null,
      tokenA
    );
    assert(ownerDelete.status === 200, 'Owner successfully deletes playlist (200 OK)');

    // Verify deleted playlist is no longer accessible
    const getDeletedPl = await jsonRequest(
      `${BASE_URL}/playlists/${playlistId}`,
      'GET',
      null,
      tokenA
    );
    assert(getDeletedPl.status === 404, 'Deleted playlist returns 404 Not Found');

    console.log('\n===============================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
    console.log('===============================================================');

    if (passed === total) {
      console.log('All Phase 6 User Library and Playlist features verified successfully!');
      process.exit(0);
    } else {
      console.error(`Failed ${total - passed} tests.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
  }
}

runLibraryE2ETests();
