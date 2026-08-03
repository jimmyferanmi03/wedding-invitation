# Wedding Invitation

This is a static wedding invitation landing page built with HTML, CSS, and JavaScript.

## Local Preview

Option 1: Open `index.html` directly in your browser.

Option 2: Run a local server (recommended).

1. Install Node.js if needed: https://nodejs.org/
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

Then open `http://localhost:8080`.

## Deployment

This project is ready to deploy to any static hosting provider.

### GitHub Pages

If your repository is connected to GitHub, you can deploy with GitHub Pages.

1. Push the project to a GitHub repository.
2. Ensure the branch is named `main` (or update the workflow branch accordingly).
3. The workflow in `.github/workflows/deploy.yml` will publish the site automatically when you push.

### Local CLI deploy

You can also deploy from your machine using the `gh-pages` package:

```bash
npm install
npm run deploy:link
```

This publishes the site to the `gh-pages` branch of the current repository.

<!-- DEPLOY_LINK_START -->
**Live site:** _Not yet deployed_
<!-- DEPLOY_LINK_END -->

## Notes

- GitHub Pages
- Netlify
- Vercel
- Surge
- Firebase Hosting

Just deploy the folder contents and make sure `index.html` is the entrypoint.

## Notes

- The invitation can optionally run with a backend server for RSVP storage and admin notifications.
- RSVP submissions are saved to a local SQLite database and can be emailed to admin addresses when configured.

## Backend Setup

1. Copy `.env.example` to `.env`.
2. Update `ADMIN_EMAILS` with the email addresses you want to notify when a guest submits the form. Separate multiple emails with commas.
3. Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` with valid SMTP credentials.
4. Set `SEND_USER_CONFIRMATION=true` to send a confirmation email to the guest after they submit the RSVP.
5. Run `npm install`.
6. Start the backend with `npm run server`.

The backend serves the static site and handles RSVP form submissions at `/api/rsvp`.

If you want the site to use a custom domain, add a `CNAME` file with the domain name and configure DNS for that domain.

### What gets notified

- Admins listed in `ADMIN_EMAILS` receive a new RSVP notification email.
- The guest providing their email address receives a confirmation email when `SEND_USER_CONFIRMATION=true`.
