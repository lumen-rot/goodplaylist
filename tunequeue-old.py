#!/usr/bin/env python3
import argparse
import sys
import webbrowser

from ytmusicapi import YTMusic


MAX_TEMP_PLAYLIST_ITEMS = 50


def clean_text(value):
    return " ".join(str(value or "").split())


def artist_names(item):
    return ", ".join(clean_text(artist.get("name")) for artist in item.get("artists", []) if artist.get("name"))


def track_label(item):
    title = clean_text(item.get("title"))
    artists = artist_names(item)
    return f"{artists} - {title}" if artists else title


def find_seed(ytmusic, query):
    results = ytmusic.search(query, filter="songs", limit=5)
    for item in results:
        if item.get("videoId"):
            return item
    return None


def related_tracks(ytmusic, video_id, limit):
    playlist = ytmusic.get_watch_playlist(videoId=video_id, limit=limit + 1)
    seen = set()
    tracks = []

    for item in playlist.get("tracks", []):
        item_id = item.get("videoId")
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        tracks.append(item)
        if len(tracks) >= limit:
            break

    return tracks


def youtube_playlist_url(video_ids):
    capped_ids = video_ids[:MAX_TEMP_PLAYLIST_ITEMS]
    return "https://www.youtube.com/watch_videos?video_ids=" + ",".join(capped_ids)


def main():
    parser = argparse.ArgumentParser(description="Generate a temporary YouTube playlist from one song.")
    parser.add_argument("song", help="Song or artist + song to start from")
    parser.add_argument("--limit", type=int, default=25, help="Number of songs to include, max 50")
    parser.add_argument("--open", action="store_true", help="Open the playlist in your browser")
    args = parser.parse_args()

    limit = max(1, min(args.limit, MAX_TEMP_PLAYLIST_ITEMS))
    ytmusic = YTMusic()

    seed = find_seed(ytmusic, args.song)
    if not seed:
        print(f"No YouTube Music song match found for: {args.song}", file=sys.stderr)
        return 1

    tracks = related_tracks(ytmusic, seed["videoId"], limit)
    if not tracks:
        print(f"No related tracks found for: {track_label(seed)}", file=sys.stderr)
        return 1

    url = youtube_playlist_url([track["videoId"] for track in tracks])

    print(f"Seed: {track_label(seed)}")
    print()
    for index, track in enumerate(tracks, start=1):
        print(f"{index:02d}. {track_label(track)}")
    print()
    print(url)

    if args.open:
        webbrowser.open(url)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
