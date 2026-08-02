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
npm run deploy
```

This publishes the site to the `gh-pages` branch of the current repository.

## Notes

- GitHub Pages
- Netlify
- Vercel
- Surge
- Firebase Hosting

Just deploy the folder contents and make sure `index.html` is the entrypoint.

## Notes

- The invitation is fully static and does not require a backend.
- RSVP submissions are handled in-browser only and are not stored.
