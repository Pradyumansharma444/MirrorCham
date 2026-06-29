# MirrorUp

Built-in AI Model for English Communication Training, Face-to-Face Speaking Practice, and Peer-to-Peer (P2P) Conversation Practice.

## Features

- **Practice English speaking & communication skills**: Watch your gestures, posture, and facial expressions in real-time.
- **Real-time AI Feedback**: Track your pace (WPM), clarity, filler words, and pauses locally.
- **Gamified Level Progression**: Complete challenges, earn XP, and level up from Bronze to Legendary Orator.
- **100% Local & Private**: All speech processing and audio analyses run directly in your browser. No data collection, no login required.
- **Peer-to-Peer (P2P) Speaking Practice**: Practice face-to-face with peers in real-time rooms.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS (shadcn/ui)
- **Backend/API**: Hono (running on Cloudflare Workers), tRPC
- **Database**: Drizzle ORM, MySQL
- **Audio Analysis**: Web Audio API (AnalyserNode), Web Speech API (SpeechRecognition)

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (copy `.env.example` to `.env` and fill in the details).

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
