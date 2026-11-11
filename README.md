# AnyFetch — Universal High-Quality Media Downloader

AnyFetch is a fast, modern web application for inspecting and downloading public media from supported platforms (YouTube, Reddit, Instagram, X/Twitter, Pinterest, TikTok, Threads, Facebook, and direct media URLs) at the highest permitted quality.

---

## Features

- **Multi-Platform Support**: YouTube (up to 4K / MP3 extraction), Reddit (videos with merged audio, carousels), Instagram (posts, reels, uncropped multi-slide carousels), X/Twitter, Pinterest, TikTok, Threads, and direct media files.
- **Byte-Accurate Download Progress**: Live byte tracking and liquid progress animation with real-time stream updates.
- **Universal Multi-Media Carousels**: Individual slide inspection, individual downloads, and one-click ZIP archive packaging.
- **Enterprise-Grade Security**: Strict SSRF filters (RFC 1918 private IP and link-local blocking, DNS rebinding prevention), sanitized RFC 5987/6266 headers, MIME type whitelist enforcement, and memory-backed sliding-window rate limiting.
- **Zero Retention**: Files stream on the fly directly through proxy pipes without storing copies on server disks. Download history lives exclusively in browser `localStorage`.

---

## Prerequisites

- **Node.js**: v18.17+ or v20+ (v22 recommended)
- **npm** / **yarn** / **pnpm**
- **System Binaries (Optional)**:
  - `python` (or `python3`) with `yt-dlp` installed (`pip install yt-dlp`) for YouTube stream multiplexing and Facebook video extraction.
  - `ffmpeg` for on-the-fly audio/video merging.
  *Note: AnyFetch will look for `python` and `ffmpeg` in your system `PATH` by default, or you can configure custom paths via environment variables.*

---

## Environment Configuration

Copy the example environment configuration template:

```bash
cp .env.example .env.local
```

### Supported Environment Variables

| Variable | Required | Description | Where to Obtain |
|---|---|---|---|
| `PYTHON_PATH` | No | Absolute path to Python executable if not in system `PATH`. | Local system installation |
| `FFMPEG_PATH` | No | Absolute path to FFmpeg executable if not in system `PATH`. | Local system installation |
| `REDDIT_CLIENT_ID` | No | Reddit Script App Client ID for higher API rate limits. | [Reddit App Preferences](https://www.reddit.com/prefs/apps) |
| `REDDIT_CLIENT_SECRET` | No | Reddit Script App Client Secret. | [Reddit App Preferences](https://www.reddit.com/prefs/apps) |
| `REDDIT_USER_AGENT` | No | Custom User-Agent header for Reddit API requests. | Self-defined |
| `RAPIDAPI_KEY` | No | RapidAPI key for optional commercial Instagram extraction provider. | [RapidAPI Hub](https://rapidapi.com/) |
| `INSTAGRAM_ACCESS_TOKEN`| No | Meta Graph API access token for official Instagram oEmbed. | [Meta for Developers](https://developers.facebook.com/) |
| `INSTAGRAM_API_URL` | No | Custom proxy endpoint for Instagram payload resolution. | Self-hosted proxy |
| `INSTAGRAM_API_KEY` | No | Authorization header value for custom Instagram proxy. | Self-hosted proxy |

*Note: All platforms work with unauthenticated public fallbacks out of the box. Environment variables are purely optional for high-throughput or authenticated deployments.*

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

---

## Security & Compliance

- **SSRF Defense**: Deep URL parsing and DNS validation reject all loopback (`127.0.0.1`, `::1`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata (`169.254.169.254`, `metadata.google.internal`), and multicast addresses.
- **Content-Disposition Sanitization**: Filenames are strictly sanitized to strip directory traversal sequences (`../`), control codes, and non-printable characters.
- **MIME Whitelisting**: Strict MIME validation ensures executable binaries or HTML scripts cannot be relayed through the download proxy.
- **Zero-Storage Architecture**: Streaming responses pass through direct Node.js/Web streams without persisting chunks to server disk storage.

---

## License

This project is intended for personal, educational, research, fair use, and authorized content-creator archival purposes. Please review the [Terms of Service](/terms) and respect individual platform policies.
