# Passively Push Engine Backend

## Local Setup

1. Run:
npm install

2. Generate VAPID Keys:
npx web-push generate-vapid-keys

3. Rename:
.env.example -> .env

4. Add your environment variables.

5. Start server:
npm start

## Render Deployment

Build Command:
npm install

Start Command:
npm start

Environment Variables Required:
- DATABASE_URL
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT
- ADMIN_PASSWORD

## Endpoints

POST /api/subscribe
POST /api/send-notification
GET /api/subscribers
GET /health