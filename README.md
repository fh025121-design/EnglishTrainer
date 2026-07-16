# English Trainer

A local-first English vocabulary trainer built with plain HTML, CSS, and JavaScript.

## Features
- Desktop-first Eiken Grade 3 typing trainer
- Day1-Day7 vocabulary dataset (word + phrase)
- Home dashboard with study range, master count, review count, streak, tickets, and weekly solved count
- Normal test mode with 10 questions per session
- Review mode powered by a spaced-repetition review box
- Retry flow after incorrect answers (blank answers are ignored)
- Type badge above input (word or phrase)
- Pronunciation playback with Enter-to-replay-and-next flow
- Progress screen with review list and day-by-day best accuracy
- All progress is stored locally with LocalStorage

## Run locally
Open index.html in your browser, or serve the folder with a simple static server.

Example:
```bash
python -m http.server 8000
```
Then open http://localhost:8000/

## Publish on GitHub Pages
This repository includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

### One-time setup
1. Create a GitHub repository and upload all files in this folder.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` (or `master`).

After the workflow finishes, your app will be available at:
- Project Pages: `https://<your-account>.github.io/<repo-name>/`
- User/Org Pages (if repo name is `<your-account>.github.io`): `https://<your-account>.github.io/`

### Update flow (same URL)
For future updates, only push your changes to GitHub. The workflow redeploys automatically, and users can continue using the same URL.

## LocalStorage compatibility policy (important)
- Storage key is fixed: `english-trainer-state-v1` (defined in `app.js`).
- Do not rename this key.
- Do not clear/reset saved state on deploy.
- Existing migration/sanitization logic in `loadState()` must be kept so older saved data remains readable.

When data formats are extended, add backward-compatible migration in `loadState()` and related `sanitize*` functions instead of replacing or deleting saved data.abc
