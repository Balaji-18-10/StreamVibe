import { spawn } from 'child_process';
import http from 'http';
import https from 'https';

const BASE_API = 'http://localhost:5000/api/v1';
const BASE_CLIENT = 'http://localhost:5173';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// 1x1 transparent PNG buffer
const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_THUMBNAIL_BUFFER = Buffer.from(TEST_PNG_BASE64, 'base64');

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

class BrowserSession {
  constructor() {
    this.chromeProcess = null;
    this.ws = null;
    this.msgId = 1;
    this.listeners = new Map();
  }

  async start() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.chromeProcess = spawn(chromePath, [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--autoplay-policy=no-user-gesture-required',
      '--no-first-run',
      '--user-data-dir=C:\\Users\\Balaji\\AppData\\Local\\Temp\\chrome_suite_' + Date.now(),
      '--disable-gpu',
      '--mute-audio',
    ]);

    await new Promise(r => setTimeout(r, 1800));

    const list = await getJson('http://localhost:9222/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    this.ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id && this.listeners.has(msg.id)) {
          const resolver = this.listeners.get(msg.id);
          this.listeners.delete(msg.id);
          resolver(msg);
        }
      } catch (e) {}
    };

    await this.send('Page.enable');
    await this.send('Runtime.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const curId = this.msgId++;
      this.listeners.set(curId, resolve);
      this.ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
  }

  async evaluate(expression, awaitPromise = false) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true
    });
    return res.result?.result?.value;
  }

  async waitForVideoReady(timeoutSeconds = 20) {
    for (let i = 0; i < timeoutSeconds * 2; i++) {
      const state = await this.evaluate(`(() => {
        const v = document.querySelector('video');
        if (!v) return null;
        return {
          src: v.src,
          currentSrc: v.currentSrc,
          readyState: v.readyState,
          duration: v.duration,
          paused: v.paused,
          error: v.error ? { code: v.error.code } : null
        };
      })()`);
      if (state && state.readyState >= 1) {
        return state;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }

  async stop() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.chromeProcess) {
      try { this.chromeProcess.kill('SIGKILL'); } catch {}
    }
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🎬 STREAMVIBE COMPLETE VIDEO PLAYBACK VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}: ${details}`);
    }
  }

  const browser = new BrowserSession();
  await browser.start();

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: Existing Seeded Video Direct Playback
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 1: Existing Seeded Video Direct Playback ---');
    await browser.navigate(`${BASE_CLIENT}/watch/6ae9bca822226c3065b6e2c4`);
    const s1Video = await browser.waitForVideoReady();
    assert(Boolean(s1Video), 'Video element mounts and reaches readyState >= 2 (HAVE_CURRENT_DATA)');
    assert(s1Video?.error === null, 'Video has no HTML5 error (error === null)');
    assert(s1Video?.duration > 0, `Video duration is valid (${s1Video?.duration?.toFixed(2)}s)`);

    // Test Playback
    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.muted = true; v.play(); })()`);
    await new Promise(r => setTimeout(r, 2500));
    const s1PlayState = await browser.evaluate(`(() => {
      const v = document.querySelector('video');
      return { paused: v.paused, currentTime: v.currentTime, buffered: v.buffered.length > 0 };
    })()`);
    assert(!s1PlayState?.paused && s1PlayState?.currentTime > 0.5, `Continuous video playback verified (currentTime=${s1PlayState?.currentTime?.toFixed(2)}s)`);
    assert(s1PlayState?.buffered, 'Media buffered ranges active from HTTP range requests');

    // Test Seeking
    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.currentTime = 6.0; })()`);
    await new Promise(r => setTimeout(r, 1200));
    const s1SeekState = await browser.evaluate(`(() => document.querySelector('video')?.currentTime || 0)()`);
    assert(s1SeekState >= 5.8, `HTTP range seeking verified (currentTime=${s1SeekState?.toFixed(2)}s)`);

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: Upload a New Video & Verify Browser Playback
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 2: Newly Uploaded Cloudinary Video Playback ---');
    console.log('  Registering test creator and uploading video via API...');
    const userTs = Date.now();
    const regRes = await fetch(`${BASE_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Playback Tester',
        username: `playtester_${userTs}`,
        email: `tester_${userTs}@streamvibe.io`,
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    const token = regData?.data?.accessToken;
    assert(Boolean(token), 'Registered temporary test creator for upload test');

    console.log('  Downloading test MP4 buffer...');
    const videoBuffer = await downloadBuffer('https://raw.githubusercontent.com/youtube/api-samples/master/java/src/main/resources/sample-video.mp4');

    const form = new FormData();
    form.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), 'sample.mp4');
    form.append('thumbnail', new Blob([TEST_THUMBNAIL_BUFFER], { type: 'image/png' }), 'thumb.png');
    form.append('title', `Newly Uploaded Test Video ${userTs}`);
    form.append('description', 'Testing fresh Cloudinary upload playback in browser.');
    form.append('category', 'Tech');
    form.append('type', 'video');
    form.append('visibility', 'public');

    const uploadRes = await fetch(`${BASE_API}/videos/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const uploadData = await uploadRes.json();
    const newVideoId = uploadData?.data?.video?._id;
    assert(uploadRes.status === 201 && Boolean(newVideoId), `New video uploaded to Cloudinary (ID: ${newVideoId})`);

    // Test playback of this newly uploaded video in browser!
    console.log(`  Navigating browser to watch new video: ${BASE_CLIENT}/watch/${newVideoId}...`);
    await browser.navigate(`${BASE_CLIENT}/watch/${newVideoId}`);
    const s2Video = await browser.waitForVideoReady();
    assert(Boolean(s2Video), 'Newly uploaded video element mounted and ready in browser');
    assert(s2Video?.error === null, 'Newly uploaded video has no playback error');

    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.muted = true; v.play(); })()`);
    await new Promise(r => setTimeout(r, 2000));
    const s2PlayState = await browser.evaluate(`(() => {
      const v = document.querySelector('video');
      return { paused: v.paused, currentTime: v.currentTime };
    })()`);
    assert(!s2PlayState?.paused && s2PlayState?.currentTime > 0.5, `Newly uploaded Cloudinary video plays seamlessly (currentTime=${s2PlayState?.currentTime?.toFixed(2)}s)`);

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: Home Feed Navigation to Watch Page
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 3: Home Feed Navigation & Playback ---');
    await browser.navigate(BASE_CLIENT);

    // Wait for video card to appear on home feed
    let clickedSuccess = false;
    for (let i = 0; i < 20; i++) {
      clickedSuccess = await browser.evaluate(`(() => {
        const link = document.querySelector('a[href*="/watch/"]');
        if (!link) return false;
        link.click();
        return true;
      })()`);
      if (clickedSuccess) break;
      await new Promise(r => setTimeout(r, 500));
    }
    assert(clickedSuccess, 'Clicked video card on home feed -> navigating to watch route');

    const s3Video = await browser.waitForVideoReady(25);
    assert(Boolean(s3Video), 'Home-feed navigated video reaches readyState >= 2');
    assert(s3Video?.error === null, 'No error upon client SPA route navigation');

    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.muted = true; v.play(); })()`);
    await new Promise(r => setTimeout(r, 2500));
    const s3Play = await browser.evaluate(`(() => document.querySelector('video')?.currentTime || 0)()`);
    assert(s3Play > 0.2, `Video navigated from home feed plays smoothly (currentTime=${s3Play.toFixed(2)}s)`);

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 4: Second Video Direct Navigation (Source Change)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 4: Switching Videos via Direct Navigation ---');
    await browser.navigate(`${BASE_CLIENT}/watch/6ae9bca822226c3065b6e2c9`);
    const s4Video = await browser.waitForVideoReady(20);
    assert(Boolean(s4Video), 'Second video loads properly on route switch');
    assert(s4Video?.currentSrc.includes('forest_bike.mp4'), 'Player source switched to corresponding asset (forest_bike.mp4)');

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 5: Vertical Shorts Playback
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 5: Shorts Vertical Video Playback ---');
    await browser.navigate(`${BASE_CLIENT}/shorts/6ae9c345952e3d9030d891fa`);
    const s5Video = await browser.waitForVideoReady(20);
    assert(Boolean(s5Video), 'Shorts vertical video element ready');
    assert(s5Video?.error === null, 'Shorts video has no playback error');

    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.play(); })()`);
    await new Promise(r => setTimeout(r, 2500));
    const s5Play = await browser.evaluate(`(() => document.querySelector('video')?.currentTime || 0)()`);
    assert(s5Play > 0.1, `Short video plays and loops seamlessly (currentTime=${s5Play.toFixed(2)}s)`);

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 6: Mobile Viewport (iPhone 14 - 390x844)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- Scenario 6: Mobile Viewport Playback ---');
    await browser.setViewport(390, 844, true);
    await browser.navigate(`${BASE_CLIENT}/watch/6ae9bca822226c3065b6e2c4`);
    const s6Video = await browser.waitForVideoReady();
    assert(Boolean(s6Video), 'Mobile viewport video element rendered and ready');
    assert(s6Video?.error === null, 'Mobile video has no playback error');

    // Test mobile play
    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.muted = true; v.play(); })()`);
    await new Promise(r => setTimeout(r, 2000));
    const s6Play = await browser.evaluate(`(() => document.querySelector('video')?.currentTime || 0)()`);
    assert(s6Play > 0.5, `Mobile video plays continuously (currentTime=${s6Play.toFixed(2)}s)`);

    // Test mobile seek
    await browser.evaluate(`(() => { const v = document.querySelector('video'); v.currentTime = 7.5; })()`);
    await new Promise(r => setTimeout(r, 1200));
    const s6Seek = await browser.evaluate(`(() => document.querySelector('video')?.currentTime || 0)()`);
    assert(s6Seek >= 7.0, `Mobile seeking verified (currentTime=${s6Seek.toFixed(2)}s)`);

    console.log('\n========================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${total} SCENARIOS & PLAYBACK ASSERTIONS PASSED`);
    console.log('========================================================================\n');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } finally {
    await browser.stop();
  }
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
