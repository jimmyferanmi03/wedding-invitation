Backend deployment (quick guide)

This project contains `server.js` (Express + SQLite + nodemailer). To enable email notifications and receive RSVPs you must deploy the backend to a Node host and provide SMTP credentials.

Recommended hosts: Render, Railway, Fly.io, Heroku.

Render (recommended):
1. Create an account at https://render.com and connect your GitHub repo.
2. Create a new Web Service and select the `wedding-invitation` repo.
3. Build command: `npm install`
4. Start command: `npm run server`
5. Set environment variables (in Render service settings):
   - `ADMIN_EMAILS` (comma-separated admin emails)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - `EMAIL_FROM` (optional)
   - `SEND_USER_CONFIRMATION=true` (optional)
6. Deploy. The service will provide a public URL like `https://my-backend.onrender.com`.

Railway quick deploy:
1. Create a Railway project and link the GitHub repo (or use "Deploy from GitHub").
2. Set the start command as `npm run server` and the env vars as above.

Front-end configuration:
- If the frontend (GitHub Pages) is served from a different origin than the backend, open `index.html` and set the meta tag `api-base` to your backend origin, e.g.:
  <meta name="api-base" content="https://my-backend.onrender.com">

Security:
- Use real SMTP credentials for the `SMTP_*` variables.
- Do not commit secrets to the repo. Use the host's environment variables / secret store.

Testing locally:
1. Copy `.env.example` to `.env` and fill values.
2. Run `npm install`
3. Start the server: `npm run server`
4. Open the frontend at `http://localhost:3000` (the backend serves static files too).

If you want, I can prepare a GitHub Actions workflow to deploy the backend automatically when you push to `main` (requires adding service API keys as GitHub Secrets).