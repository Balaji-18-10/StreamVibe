import 'dotenv/config';
import { normalizeMongoUri } from './src/config/db.js';
import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({}, { strict: false });
const Video = mongoose.model('Video', videoSchema, 'videos');

// Mapping of validated Cloudinary video assets (verified returning HTTP 200/206 mp4)
const CATEGORY_VIDEO_MAP = {
  Gaming: 'https://res.cloudinary.com/demo/video/upload/skate.mp4',
  Tech: 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  Music: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
  Education: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  Entertainment: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  Sports: 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
  Food: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  Travel: 'https://res.cloudinary.com/demo/video/upload/forest_bike.mp4',
  News: 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  Other: 'https://res.cloudinary.com/demo/video/upload/dog.mp4'
};

const SPECIFIC_MAP = {
  'Building a Real-Time Video Streaming Architecture from Scratch in 2026': 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  'Cyberpunk 2077 Next-Gen Raytracing Overhaul — 4K 120FPS Gameplay': 'https://res.cloudinary.com/demo/video/upload/skate.mp4',
  'Deep House & Synthwave Mix for Late Night Coding Sessions 🌌': 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
  'Modern UI/UX Design Trends in 2026: Glassmorphism, Spatial, & Micro-Interactions': 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  'Full Stack MERN & Socket.IO Production Architecture Masterclass': 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  'Unreal Engine 5.5 Photorealistic Environment Creation Walkthrough': 'https://res.cloudinary.com/demo/video/upload/forest_bike.mp4',
  'Tokyo Street Food Tour: Tsukiji Outer Market to Omoide Yokocho': 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  'Iceland In Winter: Road Trip Along the Ring Road and Northern Lights': 'https://res.cloudinary.com/demo/video/upload/forest_bike.mp4',
  'How Quantum Computing Works: Beyond Binary Logic': 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  'Global Tech & Geopolitics: Semi-Conductor Supply Chain Overview': 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  'The Future of Autonomous Agents and Multi-Modal AI Workflows': 'https://res.cloudinary.com/demo/video/upload/kitten_fighting.mp4',
  'FIFA World Cup 2026 Stadiums & Technology Preview': 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
  // Shorts
  'Mind-blowing CSS animation trick in 15 seconds! 🤯 #coding #css #webdev': 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
  'Insane Unreal Engine 5.5 physics destruction test 💥 #gaming #ue5 #physics': 'https://res.cloudinary.com/demo/video/upload/skate.mp4',
  'The secret chord progression that makes any track sound emotional 🎹 #music': 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
  'Why AI agents will replace traditional web scraping forever 🤖 #ai #tech': 'https://res.cloudinary.com/demo/video/upload/kitten_fighting.mp4',
  'Fastest way to reverse a linked list (Senior Dev vs Junior Dev) ⚡ #coding': 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  'Crispy Japanese Wagyu Katsu Sando in Shibuya 🥪 #food #tokyo': 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  'POV: Speed flying down the Swiss Alps at 120 km/h 🪂 #sports #adrenaline': 'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
  'How quantum superposition works explained in 30 seconds ⚛️ #science': 'https://res.cloudinary.com/demo/video/upload/cld_rubik.mp4',
};

async function migrate() {
  const uri = normalizeMongoUri(process.env.MONGODB_URI);
  await mongoose.connect(uri, { dbName: 'youtube_clone' });
  console.log('Connected to MongoDB Atlas');

  const videos = await Video.find({}).lean();
  console.log(`Auditing ${videos.length} videos...`);

  let updatedCount = 0;
  for (const v of videos) {
    const currentUrl = v.videoFile?.url || v.videoUrl;
    // Check if URL is broken sample.mp4
    if (!currentUrl || currentUrl.includes('sample.mp4')) {
      const newUrl = SPECIFIC_MAP[v.title] || CATEGORY_VIDEO_MAP[v.category] || 'https://res.cloudinary.com/demo/video/upload/dog.mp4';
      
      await Video.updateOne(
        { _id: v._id },
        {
          $set: {
            'videoFile.url': newUrl,
            'videoFile.format': 'mp4',
            videoUrl: newUrl
          }
        }
      );
      console.log(`[UPDATED] ${v.title} -> ${newUrl}`);
      updatedCount++;
    }
  }

  console.log(`\nMigration Complete: ${updatedCount} video documents updated with verified Cloudinary playback URLs.`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
