# 🎬 StreamVibe — YouTube-Inspired Video Sharing Platform

A full-stack MERN application with real-time features, built for scale.

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | React 18 + Vite, Tailwind CSS, Axios, Socket.IO |
| Backend    | Node.js, Express.js, Socket.IO                  |
| Database   | MongoDB + Mongoose                              |
| Auth       | JWT (Access + Refresh tokens)                   |
| Storage    | Cloudinary (video, thumbnail, avatar)           |
| Real-time  | Socket.IO (notifications, live chat)            |

## Project Structure

```
Youtube Clone/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
├── .gitignore
└── README.md
```

## Features (Phases)

### Phase 1 — Core Platform (Current)
- [x] Project scaffolding & configuration
- [ ] Authentication (Register/Login/JWT)
- [ ] Video upload, playback & browsing
- [ ] Creator channels & profiles
- [ ] Likes, comments, subscriptions

### Phase 2 — Engagement
- [ ] Shorts (vertical video feed)
- [ ] Playlists
- [ ] Watch history
- [ ] Search & recommendations
- [ ] Creator Studio & analytics

### Phase 3 — Real-time
- [ ] Notifications (Socket.IO)
- [ ] Live chat
- [ ] Live streaming (HLS/WebRTC)

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB Atlas (free tier)
- Cloudinary account (free tier)

### Setup

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Configure env files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Run development servers
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — React app
cd client && npm run dev
```

## Environment Variables

See `server/.env.example` and `client/.env.example` for required variables.
