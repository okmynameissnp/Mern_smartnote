
## AI-Powered Smart Notes App (MERN + AI)

A full-stack notes app with speech-to-text, AI summarization, and text-to-speech. Users can register/login (JWT), create/edit/delete notes, get AI-generated summaries, and play summaries as audio.

## Tech Stack
- Backend: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, CORS, Axios
- Frontend: React (Vite), Web Speech API (STT/TTS)
- AI: Hugging Face Inference API (facebook/bart-large-cnn by default)

## Quick Start

### 1) Prerequisites
- Node 22+
- Docker (or local MongoDB)

### 2) Backend env
Create `server/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zikra_smart_notes
JWT_SECRET=dev_super_secret_change_me
HUGGINGFACE_API_KEY=
HUGGINGFACE_SUMMARIZATION_MODEL=facebook/bart-large-cnn
CORS_ORIGIN=http://localhost:5175,http://localhost:5173
```

### 3) Run services
- Start MongoDB (Docker):
```bash
docker run -d --name zikra-mongo -p 27017:27017 -v zikra_mongo_data:/data/db mongo:6
```
- Backend:
```bash
cd server
npm i
npm run dev
```
Visit: `http://localhost:5000/api/health` → `{ "status": "ok" }`
- Frontend (new terminal, Node 22+):
```bash
cd client
npm i
npm run dev -- --host 0.0.0.0
```
Visit: `http://localhost:5175/`

## Daily backend start

Run these each day to start the backend locally:

```bash
# 1) Start MongoDB (existing container)
docker start zikra-mongo

# 2) Start backend
cd server
npm run dev

# 3) (Optional) Verify health in a new terminal
curl http://localhost:5000/api/health
# -> {"status":"ok"}
```

Tips:
- If container does not exist yet, create it once with the command in Quick Start → Run services.
- Stop backend: press Ctrl+C in the server terminal.
- Stop MongoDB (optional): `docker stop zikra-mongo`.

## Features
- Register/Login (JWT)
- Create notes by typing or speaking (Web Speech API)
- AI summary (Hugging Face) stored with the note
- Text-to-speech for summaries
- List notes with timestamps, edit, and delete

## API
Base: `http://localhost:5000/api`

Auth
- POST `/auth/register` { name, email, password }
- POST `/auth/login` { email, password }

Notes (Bearer token required)
- POST `/note` { noteText } → creates note + summary
- PUT `/note/:id` { noteText } → updates note + summary
- GET `/notes` → list user notes
- DELETE `/note/:id` → delete note

## Notes
- If CORS errors appear, ensure backend CORS allows `http://localhost:5175` and restart the server.
- Hugging Face key optional; without it, summaries fall back to truncation on errors.

## Demo Flow
1. Register (or login)
2. Create a note (type or press Start Mic)
3. Save → summary appears below note
4. Play Summary to listen via TTS
5. Edit or Delete from the list

## Bonus Ideas
- Tags & search
- Dark/light toggle
- Deploy: client (Vercel/Netlify), server (Render/Fly/EC2)

<!-- Deployment section intentionally removed as per request -->
# smartnote

##Video  Below

  
https://github.com/user-attachments/assets/cfe8ddcd-e196-4413-b828-356f4359a145



note :- even the play summary will work but while recording the mointor voice was not recoreded


