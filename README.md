# goodplaylist

Tiny no-login playlist generator.

It takes a song, finds the closest YouTube Music match, pulls related tracks, and prints a temporary YouTube playlist link.

Live at https://goodplaylist.lumenrot.com/

## Web (Cloudflare Worker)

The web app runs on Cloudflare Workers — `worker.ts` handles `/api/*`, and `static/` is served as Worker Assets.

```sh
cd /Users/j/workspace/tunequeue
npm install
npx wrangler dev      # local at http://127.0.0.1:8787
npx wrangler deploy   # ship to Cloudflare
```

Config lives in `wrangler.toml`. No build step — wrangler bundles `worker.ts` directly.

## CLI (Python, legacy)

The original Python CLI is preserved as `tunequeue-old.py` and the Flask web wrapper as `app-old.py`.

```sh
uv run tunequeue-old.py "pinkpantheress pain" --limit 25
uv run tunequeue-old.py "pinkpantheress pain" --limit 25 --open
```

## Next ideas

- Show recent playlists as a lightweight activity feed.
