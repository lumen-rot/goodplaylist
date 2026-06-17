import { Innertube, YTNodes } from "youtubei.js/web";

interface Env {
  ASSETS: Fetcher;
}

const MAX_TEMP_PLAYLIST_ITEMS = 50;

let cached: Promise<Innertube> | null = null;
function getYT(): Promise<Innertube> {
  if (!cached) cached = Innertube.create({
    retrieve_player: false,
    fetch: (input, init) => fetch(input as RequestInfo, init as RequestInit),
  });
  return cached;
}

interface Track {
  videoId: string;
  title: string | null;
  artists: string;
  label: string;
  album: string | null;
  duration: string | null;
  thumbnail: string | null;
}

function cleanText(value: unknown): string {
  return String(value ?? "").split(/\s+/).filter(Boolean).join(" ");
}

function pickThumb(source: any): string | null {
  const thumbs: { url: string }[] | undefined =
    source?.thumbnails ??
    source?.thumbnail?.contents ??
    source?.thumbnail ??
    (Array.isArray(source) ? source : undefined);
  if (!thumbs || thumbs.length === 0) return null;
  return thumbs[thumbs.length - 1].url;
}

function trackLabel(title: string, artists: string): string {
  return artists ? `${artists} - ${title}` : title;
}

function youtubePlaylistUrl(videoIds: string[]): string {
  const capped = videoIds.slice(0, MAX_TEMP_PLAYLIST_ITEMS);
  return "https://www.youtube.com/watch_videos?video_ids=" + capped.join(",");
}

function searchResultToTrack(node: any): Track | null {
  const videoId = node?.id;
  if (!videoId) return null;
  const title = cleanText(node?.title);
  const artistsArr: string[] = (node?.artists ?? []).map((a: any) => cleanText(a?.name)).filter(Boolean);
  const artists = artistsArr.join(", ");
  return {
    videoId,
    title,
    artists,
    label: trackLabel(title, artists),
    album: node?.album?.name ? cleanText(node.album.name) : null,
    duration: node?.duration?.text ?? null,
    thumbnail: pickThumb(node),
  };
}

function upNextItemToTrack(item: any): Track | null {
  const videoId = item?.video_id ?? item?.id;
  if (!videoId) return null;
  const title = cleanText(item?.title?.text ?? item?.title);
  const artistsRaw = item?.artists ?? item?.author;
  let artists = "";
  if (Array.isArray(artistsRaw)) {
    artists = artistsRaw.map((a: any) => cleanText(a?.name)).filter(Boolean).join(", ");
  } else if (artistsRaw?.name) {
    artists = cleanText(artistsRaw.name);
  }
  return {
    videoId,
    title,
    artists,
    label: trackLabel(title, artists),
    album: item?.album?.name ? cleanText(item.album.name) : null,
    duration: item?.duration?.text ?? null,
    thumbnail: pickThumb(item),
  };
}

async function handleSearch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ results: [] });

  const yt = await getYT();
  const res = await yt.music.search(q, { type: "song" });
  const items: any[] = (res.contents?.flatMap((s: any) => s.contents ?? []) ?? []).filter(Boolean);

  const tracks: Track[] = [];
  for (const node of items) {
    const t = searchResultToTrack(node);
    if (t) tracks.push(t);
    if (tracks.length >= 8) break;
  }
  return Response.json({ results: tracks });
}

async function handlePlaylist(request: Request): Promise<Response> {
  let body: any = {};
  try { body = await request.json(); } catch { /* keep empty */ }

  const videoId: string | undefined = body?.videoId;
  if (!videoId) return Response.json({ error: "Pick a song first." }, { status: 400 });

  const requested = Number(body?.limit ?? 15);
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 15, MAX_TEMP_PLAYLIST_ITEMS));

  const yt = await getYT();
  const upNext = await yt.music.getUpNext(videoId);
  const raw: any[] = upNext?.contents ?? [];

  const seen = new Set<string>([videoId]);
  const tracks: Track[] = [];
  for (const item of raw) {
    const t = upNextItemToTrack(item);
    if (!t || seen.has(t.videoId)) continue;
    seen.add(t.videoId);
    tracks.push(t);
    if (tracks.length >= limit) break;
  }

  if (tracks.length === 0) {
    return Response.json({ error: "No related songs found." }, { status: 404 });
  }

  return Response.json({
    tracks,
    url: youtubePlaylistUrl(tracks.map((t) => t.videoId)),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/search" && request.method === "GET") {
        return await handleSearch(request);
      }
      if (url.pathname === "/api/playlist" && request.method === "POST") {
        return await handlePlaylist(request);
      }
    } catch (err) {
      console.error(err);
      return Response.json({ error: "Upstream error." }, { status: 502 });
    }
    return env.ASSETS.fetch(request);
  },
};
