# goodplaylist

Tiny no-login playlist generator.

It takes a song, finds the closest YouTube Music match, pulls related tracks, and prints a temporary YouTube playlist link.

## Use

```sh
cd /Users/j/workspace/playground-2/tunequeue
uv run tunequeue.py "pinkpantheress pain" --limit 25
```

Open the printed YouTube link. It is a temporary playlist, not a saved playlist.

To open it automatically:

```sh
uv run tunequeue.py "pinkpantheress pain" --limit 25 --open
```

## Web

```sh
uv run python app.py
```

Open http://127.0.0.1:8765

## Next ideas

- Show recent playlists as a lightweight activity feed.
