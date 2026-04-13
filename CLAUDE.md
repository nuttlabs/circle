# CLAUDE.md

Notes for Claude instances working in this folder.

## Project

This folder contains the source for the **AI Orchestration** landing page (part of Nutt Labs Circle). The site promotes William Nutt's Distilled AI Coaching program.

Folder layout for the AI site inside `/ai-orchestration`:

- `/ai-orchestration/index.html`, `/ai-orchestration/privacy.html`, `/ai-orchestration/terms.html` — the live HTML pages inside the site directory
- `/ai-orchestration/css/` — `main.css` (main site) and `legal.css` (privacy/terms pages)
- `/ai-orchestration/js/` — `main.js`
- `/ai-orchestration/assets/` — images, logos, SVGs, and the OG image
- `/ai-orchestration/reference/` — reference materials (design screenshots, legal markdown drafts). Not part of the deployed site.

## Deploying ("deploy the site")

When William says "deploy" or "commit and push" or anything similar, do the following:

1. Review current changes with `git status` and `git diff`.
2. Stage the modified files by name (do **not** use `git add -A` or `git add .`).
3. Create a commit with a clear message describing *why* the changes were made, not just what. Use a HEREDOC and include the Claude co-author trailer.
4. Push to `origin main`.

The remote is already configured with an embedded fine-grained PAT, so `git push` works without additional auth. If the push fails with an auth error, the token has likely been rotated — ask William for a new one.

### Commit message style

- Short first line (under 72 chars) in imperative voice ("Tighten CTA fine print copy", not "Tightened..." or "Tightens...").
- Optional body explaining the reasoning behind the change.
- Always include the co-author trailer:

  ```
  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
  ```

### Example

```bash
git add ai.html css/main.css
git commit -m "$(cat <<'EOF'
Tighten CTA fine print copy and layout

Reframes the three notables as equal-width columns with a quiet
italic intro, and replaces the "Two logistics to know" numbered
list with plain paragraphs at 13px to recede visually while
remaining clearly legible.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

## Git configuration

- Default branch: `main`
- Remote: `origin` → `https://github.com/nuttlabs/circle.git` (with embedded PAT)
- `.gitignore` excludes `.DS_Store`, editor files, `node_modules/`, `.env*`, and build output

## Known quirks

- This folder lives inside Google Drive, which can occasionally leave a stale `.git/index.lock` file after a sync hiccup. If a git command fails with "Unable to create ... index.lock: File exists", use the `allow_cowork_file_delete` tool to enable deletion for `.git/index.lock`, then `rm -f .git/index.lock` and retry.
- Because `.git/config` syncs to Google Drive, the PAT in the remote URL is stored on Google's servers. That's a known trade-off William accepted in exchange for frictionless pushes.

## Editorial notes

- **Never use em dashes (`—`) in new copy.** William considers the em dash the most common "AI tell" and has explicitly asked to avoid it. Use periods, commas, semicolons, or parentheses instead. Exception: if William himself writes an em dash into a draft he hands you, leave it alone.
- William's voice is confident, concrete, and a bit distinctive (words like "amassing," "notables"). Preserve his phrasing when editing — don't sand it into generic marketing copy.
- The three notables above the CTA button exist to set clear expectations (cohort-dependent start date, no human support, no refunds). When touching that section, the goal is always "subtle but not overlooked." Keep them above the button, not below.
