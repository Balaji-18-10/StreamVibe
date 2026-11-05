import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import { normalizeMongoUri } from '../config/db.js';
import Video from '../models/Video.model.js';
import User from '../models/User.model.js';

const SAMPLE_VIDEOS = [
  {
    title: 'Building a Real-Time Video Streaming Architecture from Scratch in 2026',
    description: 'Deep dive into full-stack WebRTC, Socket.IO, and distributed HLS media transcoding pipelines.',
    duration: 1420,
    views: 342000,
    likeCount: 18500,
    dislikeCount: 120,
    commentCount: 430,
    category: 'Tech',
    tags: ['tech', 'streaming', 'architecture', 'nodejs'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 1,
  },
  {
    title: 'Cyberpunk 2077 Next-Gen Raytracing Overhaul — 4K 120FPS Gameplay',
    description: 'Max settings benchmark with path tracing, DLSS 4, and custom cinematic reshade mods.',
    duration: 980,
    views: 1250000,
    likeCount: 89000,
    dislikeCount: 450,
    commentCount: 1200,
    category: 'Gaming',
    tags: ['gaming', 'cyberpunk', 'raytracing', 'benchmark'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 2,
  },
  {
    title: 'Deep House & Synthwave Mix for Late Night Coding Sessions 🌌',
    description: 'Atmospheric electronic beats and lofi melodic soundscapes to get into the flow zone.',
    duration: 3600,
    views: 890000,
    likeCount: 54000,
    dislikeCount: 210,
    commentCount: 780,
    category: 'Music',
    tags: ['music', 'synthwave', 'coding', 'chill'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 3,
  },
  {
    title: 'Modern UI/UX Design Trends in 2026: Glassmorphism, Spatial, & Micro-Interactions',
    description: 'Exploring the latest digital design aesthetics across web, mobile, and spatial computing.',
    duration: 1145,
    views: 415000,
    likeCount: 23000,
    dislikeCount: 85,
    commentCount: 310,
    category: 'Entertainment',
    tags: ['design', 'ui', 'ux', 'trends'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 4,
  },
  {
    title: 'Full Stack MERN & Socket.IO Production Architecture Masterclass',
    description: 'Learn how to structure high-concurrency microservices, JWT token rotation, and MongoDB indexing.',
    duration: 2840,
    views: 95000,
    likeCount: 8200,
    dislikeCount: 40,
    commentCount: 165,
    category: 'Education',
    tags: ['education', 'mern', 'socketio', 'tutorial'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 5,
  },
  {
    title: 'Unreal Engine 5.5 Photorealistic Environment Creation Walkthrough',
    description: 'Building volumetric clouds, Nanite foliage, and Lumen lighting systems step-by-step.',
    duration: 1720,
    views: 520000,
    likeCount: 34000,
    dislikeCount: 130,
    commentCount: 520,
    category: 'Gaming',
    tags: ['gaming', 'unrealengine', 'gamedev', '3d'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 6,
  },
];

const SAMPLE_SHORTS = [
  {
    title: 'Mind-blowing CSS animation trick in 15 seconds! 🤯 #coding #css #webdev',
    description: 'How to use CSS scroll-driven animations with zero JavaScript. Modern web development is getting crazy!',
    duration: 18,
    views: 480000,
    likeCount: 34000,
    dislikeCount: 110,
    commentCount: 320,
    category: 'Tech',
    tags: ['shorts', 'css', 'webdev', 'tech'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 1,
  },
  {
    title: 'Insane Unreal Engine 5.5 physics destruction test 💥 #gaming #ue5 #physics',
    description: 'Chaos physics system simulation testing 100,000 real-time rigid bodies in 4K.',
    duration: 24,
    views: 890000,
    likeCount: 76000,
    dislikeCount: 240,
    commentCount: 580,
    category: 'Gaming',
    tags: ['shorts', 'gaming', 'unrealengine', 'physics'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 2,
  },
  {
    title: 'The secret chord progression that makes any track sound emotional 🎹 #music',
    description: 'Borrowing chords from the parallel minor mode to create instant cinematic goosebumps.',
    duration: 30,
    views: 310000,
    likeCount: 28000,
    dislikeCount: 75,
    commentCount: 240,
    category: 'Music',
    tags: ['shorts', 'music', 'piano', 'chords'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 3,
  },
  {
    title: 'Why AI agents will replace traditional web scraping forever 🤖 #ai #tech',
    description: 'Vision-based language models that navigate complex dynamic SPAs and bypass honeypots effortlessly.',
    duration: 35,
    views: 620000,
    likeCount: 49000,
    dislikeCount: 180,
    commentCount: 410,
    category: 'Tech',
    tags: ['shorts', 'ai', 'agents', 'automation'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 2,
  },
  {
    title: 'Fastest way to reverse a linked list (Senior Dev vs Junior Dev) ⚡ #coding',
    description: 'Pointer manipulation visualizer for LeetCode interview mastery in 20 seconds.',
    duration: 22,
    views: 740000,
    likeCount: 61000,
    dislikeCount: 190,
    commentCount: 520,
    category: 'Education',
    tags: ['shorts', 'coding', 'leetcode', 'algorithms'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 4,
  },
  {
    title: 'Crispy Japanese Wagyu Katsu Sando in Shibuya 🥪 #food #tokyo',
    description: 'A5 Miyazaki Wagyu beef panko breaded and fried to medium rare perfection with tonkatsu glaze.',
    duration: 19,
    views: 950000,
    likeCount: 83000,
    dislikeCount: 140,
    commentCount: 680,
    category: 'Food',
    tags: ['shorts', 'food', 'wagyu', 'japan'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 1,
  },
  {
    title: 'POV: Speed flying down the Swiss Alps at 120 km/h 🪂 #sports #adrenaline',
    description: 'Skimming inches above snow-capped cliffs in Lauterbrunnen with an 8m speed wing.',
    duration: 28,
    views: 1100000,
    likeCount: 95000,
    dislikeCount: 220,
    commentCount: 820,
    category: 'Sports',
    tags: ['shorts', 'sports', 'speedflying', 'alps'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 3,
  },
  {
    title: 'How quantum superposition works explained in 30 seconds ⚛️ #science',
    description: 'A coin spinning on a table is both heads and tails until you stop it. That is a qubit.',
    duration: 30,
    views: 560000,
    likeCount: 45000,
    dislikeCount: 130,
    commentCount: 390,
    category: 'Tech',
    tags: ['shorts', 'quantum', 'science', 'physics'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    daysAgo: 2,
  },
];

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  const mongoUri = normalizeMongoUri(process.env.MONGODB_URI);
  await mongoose.connect(mongoUri, { dbName: 'youtube_clone' });

  // Find or create default creator
  let creator = await User.findOne({ username: 'streamvibe_creator' });
  if (!creator) {
    creator = await User.create({
      username: 'streamvibe_creator',
      email: 'creator@streamvibe.io',
      password: 'Password123!',
      displayName: 'StreamVibe Studio',
      avatar: {
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        publicId: 'default_avatar',
      },
      bio: 'Official creator channel showcasing the best of StreamVibe content.',
    });
    console.log('Created default creator user:', creator.username);
  }

  // Seed Shorts if none exist
  const existingShortsCount = await Video.countDocuments({ type: 'short' });
  if (existingShortsCount === 0) {
    console.log(`Seeding ${SAMPLE_SHORTS.length} high-quality vertical Shorts...`);
    const shortDocs = SAMPLE_SHORTS.map((item, idx) => {
      const createdAt = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);
      return {
        title: item.title,
        description: item.description,
        videoFile: {
          url: item.videoUrl,
          publicId: `sample_short_${idx + 1}`,
          duration: item.duration,
          format: 'mp4',
        },
        thumbnail: {
          url: item.thumbnailUrl,
          publicId: `sample_short_thumb_${idx + 1}`,
        },
        owner: creator._id,
        category: item.category,
        tags: item.tags,
        type: 'short',
        views: item.views,
        likeCount: item.likeCount,
        dislikeCount: item.dislikeCount,
        commentCount: item.commentCount,
        visibility: 'public',
        isPublished: true,
        status: 'ready',
        createdAt,
        updatedAt: createdAt,
      };
    });

    await Video.insertMany(shortDocs);
    await User.findByIdAndUpdate(creator._id, { $inc: { videoCount: SAMPLE_SHORTS.length } });
    console.log(`✅ Successfully seeded ${SAMPLE_SHORTS.length} Shorts!`);
  } else {
    console.log(`Database already has ${existingShortsCount} shorts.`);
  }

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
