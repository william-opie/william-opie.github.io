# Jekyll Local CMS

Local, container-friendly CMS for editing Jekyll markdown posts stored in `_posts/`
and `_drafts/`.

## Features
- List and preview posts + drafts
- Create, edit, save drafts, and publish posts
- Formatting toolbar with bold/italic/underline, links, and indenting
- WYSIWYG editor with optional source view
- Automatic Git commits on save/publish (no push)
- XSS sanitization for markdown-to-HTML conversion
- 5MB body size limit for post content

## Prerequisites
- Node 18+ (for running locally)
- Docker (for container usage)

## Environment Variables
- `BLOG_REPO_ROOT` (required): absolute path to the Jekyll repo root
- `DEFAULT_AUTHOR` (optional): default `author` front matter
- `GIT_ENABLED` (optional): set to `false` to disable auto-commit
- `GIT_USER_NAME` (optional): git author name for auto-commits
- `GIT_USER_EMAIL` (optional): git author email for auto-commits
- `PORT` (optional): server port (default `3000`)

## .env Setup
Copy the example file and fill in your values:

macOS/Linux:
```
cp cms/.env.example cms/.env
```

Windows PowerShell:
```
Copy-Item cms\.env.example cms\.env
```

Then update `cms/.env` with your git identity and preferred defaults.

## Run with Docker
From the repo root:

```
docker compose -f cms/docker-compose.yml up --build
```

Then open `http://localhost:4001` in your browser.

The Docker configuration always sets `BLOG_REPO_ROOT=/repo` (the container path where
the parent directory is mounted). You only need to configure git identity in `.env`.

## Run Locally
From the `cms/` directory:

macOS/Linux:
```
npm install
BLOG_REPO_ROOT="/path/to/your/repo" DEFAULT_AUTHOR="Will" npm start
```

Windows PowerShell:
```
npm install
$env:BLOG_REPO_ROOT="D:\Github\william-opie.github.io"
$env:DEFAULT_AUTHOR="Will"
$env:GIT_USER_NAME="Your Name"
$env:GIT_USER_EMAIL="you@example.com"
npm start
```

Then open `http://localhost:3000` in your browser.

## Drafts vs Published
- **Save Draft** writes to `_drafts/`.
- **Publish** writes/moves the post to `_posts/` using `YYYY-MM-DD-slug.md`.
- Editing published posts keeps the filename stable (no URL changes).

## Git Commits
If Git is enabled, the CMS auto-commits `_posts/`/`_drafts/` changes when you
save a draft or publish a post. Commit messages follow the format "Action: title"
(e.g., "Create: My New Post" or "Update: Existing Post").

Set `GIT_USER_NAME` and `GIT_USER_EMAIL` so commits have a valid author.
You still need to push commits manually.

## Dependencies
The CMS bundles all JavaScript dependencies locally in `cms/public/vendor/`:

- **marked** - Markdown parser for preview rendering
- **Turndown** - HTML-to-Markdown converter for editor content
- **DOMPurify** - XSS sanitization for HTML rendering

This eliminates reliance on third-party CDNs and improves security and reliability.

## Security Considerations
This CMS is designed for **local use only**. It has no authentication and
exposes endpoints that can:

- Create, modify, and delete files in `_posts/` and `_drafts/`
- Create git commits in the repository (including via `POST /api/git/commit`)

The server enforces a 5MB maximum body size for POST/PUT requests to prevent
resource exhaustion attacks.

Do not expose the CMS server to untrusted networks.

If running in Docker, bind the port to localhost only:

```yaml
ports:
  - "127.0.0.1:4001:3000"  # localhost only
```

If you must expose the server, add authentication (for example via a reverse
proxy such as nginx/Caddy) before doing so.

## Troubleshooting
- If the CMS fails to start, confirm `BLOG_REPO_ROOT` points to the repo root.
- If drafts don't save, confirm `_drafts/` exists or is writable.
- If the UI doesn't load or appears broken, perform a hard refresh in your browser:
  - Chrome/Edge: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
  - Firefox: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (macOS)
- If saving posts returns a 400 error, check that the markdown body is under 5MB.
