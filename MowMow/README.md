# MowMow — Demo App

MowMow is an AI-style food discovery and ordering prototype. The existing frontend is preserved, with a demo Node.js/Express backend and browser voice-assistant layer added around it.

## Stack
- HTML/CSS/JavaScript frontend
- Node.js + Express API
- MongoDB-ready architecture (database integration can be added next)
- Browser Web Speech API for voice input/output
- Optional AI provider API key through `.env` (never expose a secret key in frontend code)

## Run
1. Install Node.js LTS.
2. Open this folder in VS Code terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and add a key only if you connect an AI provider.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## API
- `GET /api/health`
- `GET /api/foods`
- `GET /api/foods/:id`
- `POST /api/recommendations` with `{ "query": "high protein under ₹300" }`
- `POST /api/orders`

## Voice assistant
Use the microphone buttons in the Home and Discover search boxes. Chrome/Edge may ask for microphone permission. Voice recognition depends on browser support and internet availability.

## Important
The backend is intentionally demo-ready. Real authentication, MongoDB persistence, payment, delivery tracking and production AI integration should be connected before deployment.
