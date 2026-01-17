# Jekyll Local CMS

Local, container-friendly CMS for editing Jekyll markdown posts stored in `_posts/`
and `_drafts/`.

## Features
- List and preview posts + drafts
- Create, edit, save drafts, and publish posts
- Formatting toolbar with bold/italic/underline, links, and indenting
- WYSIWYG editor with optional source view
- Automatic Git commits on save/publish (no push)

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
save a draft or publish a post. Commit messages include the action and title.
Set `GIT_USER_NAME` and `GIT_USER_EMAIL` so commits have a valid author.
You still need to push commits manually.

## Troubleshooting
- If the CMS fails to start, confirm `BLOG_REPO_ROOT` points to the repo root.
- If drafts don’t save, confirm `_drafts/` exists or is writable.
