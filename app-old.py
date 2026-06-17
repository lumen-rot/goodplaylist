from flask import Flask, jsonify, request, send_from_directory
from ytmusicapi import YTMusic

from importlib import import_module

_tq = import_module("tunequeue-old")
MAX_TEMP_PLAYLIST_ITEMS = _tq.MAX_TEMP_PLAYLIST_ITEMS
artist_names = _tq.artist_names
related_tracks = _tq.related_tracks
track_label = _tq.track_label
youtube_playlist_url = _tq.youtube_playlist_url


app = Flask(__name__, static_folder="static")
ytmusic = YTMusic()


def serialize_track(track):
    thumbnails = track.get("thumbnails") or []
    return {
        "videoId": track.get("videoId"),
        "title": track.get("title"),
        "artists": artist_names(track),
        "label": track_label(track),
        "album": (track.get("album") or {}).get("name"),
        "duration": track.get("duration"),
        "thumbnail": thumbnails[-1]["url"] if thumbnails else None,
    }


@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/favicon.ico")
def favicon():
    return send_from_directory(app.static_folder, "favicon.svg")


@app.get("/api/search")
def search():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"results": []})

    results = ytmusic.search(query, filter="songs", limit=8)
    songs = [serialize_track(item) for item in results if item.get("videoId")][:8]
    return jsonify({"results": songs})


@app.post("/api/playlist")
def playlist():
    payload = request.get_json(silent=True) or {}
    video_id = payload.get("videoId")
    limit = max(1, min(int(payload.get("limit", 15)), MAX_TEMP_PLAYLIST_ITEMS))

    if not video_id:
        return jsonify({"error": "Pick a song first."}), 400

    tracks = related_tracks(ytmusic, video_id, limit)
    if not tracks:
        return jsonify({"error": "No related songs found."}), 404

    return jsonify({
        "tracks": [serialize_track(track) for track in tracks],
        "url": youtube_playlist_url([track["videoId"] for track in tracks]),
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8765, debug=True)
