
# <h1 align="center">AnyFetch — Universal High-Quality Media Downloader</h1>

<p align="center">
  A fast, modern and security-focused universal media downloader.
  <br />
  Download publicly accessible media from supported platforms at the highest permitted quality.
</p>

---

## Overview

**AnyFetch** is a modern web application for inspecting and downloading publicly accessible media from multiple platforms through a simple, unified interface.

Paste a media URL, inspect available content, choose your preferred format or quality, and download.

Supported sources include YouTube, Reddit, Instagram, X/Twitter, Pinterest, TikTok, Threads, Facebook, and direct media URLs.

---

## Features

### Multi-Platform Media Extraction

- **YouTube:** Video downloads up to 4K and MP3 extraction.
- **Reddit:** Videos with merged audio and multi-image carousels.
- **Instagram:** Posts, reels, and uncropped multi-slide carousels.
- **X / Twitter:** Supported video and image extraction.
- **Pinterest:** Supported media downloads.
- **TikTok:** Supported video extraction.
- **Threads:** Supported post media extraction.
- **Facebook:** Supported video extraction.
- **Direct Media URLs:** Direct image and video file downloads.

### Download Experience

- **Byte-Accurate Progress:** Real-time byte tracking with live stream updates.
- **Liquid Progress Animation:** Smooth progress visualization during downloads.
- **Universal Carousels:** Inspect individual slides and download them separately.
- **ZIP Downloads:** Package multiple carousel items into a single ZIP archive.
- **Quality Selection:** Choose from available media formats and resolutions.

### Security & Architecture

- **SSRF Protection:** Private IP, loopback, and link-local address blocking with DNS rebinding prevention.
- **Secure Headers:** Sanitized RFC 5987/6266 content-disposition filenames.
- **MIME Validation:** Whitelist-based MIME type enforcement.
- **Rate Limiting:** Memory-backed sliding-window rate limiting.
- **Zero Retention:** Media streams directly through proxy pipes without storing copies on server disks.
- **Browser-Based History:** Download history is stored exclusively in browser `localStorage`.

---

## Tech Stack

- Next.js
- React
- TypeScript
- Node.js
- Web Streams API

---

## Prerequisites

Before running AnyFetch locally, make sure you have:

- **Node.js:** v18.17+ or v20+ (v22 recommended).
- **Package Manager:** npm, yarn, or pnpm.

### Optional System Dependencies

Some extraction and media-processing features may require additional system binaries.

| Dependency | Purpose |
|---|---|
| Python / Python3 | YouTube stream multiplexing and Facebook video extraction |
| yt-dlp | Media extraction |
| FFmpeg | On-the-fly audio/video merging |

Install yt-dlp:

```bash
pip install yt-dlp
```

**Note:** AnyFetch looks for `python` and `ffmpeg` in your system `PATH` by default. Custom executable paths can also be configured using environment variables.

---

## Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

### Environment Variables

All environment variables are optional.

| Variable | Required | Description |
|---|---|---|
| `PYTHON_PATH` | No | Absolute path to Python executable if not available in system PATH. |
| `FFMPEG_PATH` | No | Absolute path to FFmpeg executable if not available in system PATH. |
| `REDDIT_CLIENT_ID` | No | Reddit Script App Client ID for higher API rate limits. |
| `REDDIT_CLIENT_SECRET` | No | Reddit Script App Client Secret. |
| `REDDIT_USER_AGENT` | No | Custom User-Agent header for Reddit API requests. |
| `RAPIDAPI_KEY` | No | API key for optional commercial Instagram extraction provider. |
| `INSTAGRAM_ACCESS_TOKEN` | No | Meta Graph API access token for official Instagram oEmbed. |
| `INSTAGRAM_API_URL` | No | Custom proxy endpoint for Instagram payload resolution. |
| `INSTAGRAM_API_KEY` | No | Authorization value for the custom Instagram proxy. |

### Where to Obtain Credentials

- [Reddit App Preferences](https://www.reddit.com/prefs/apps)
- [RapidAPI Hub](https://rapidapi.com/)
- [Meta for Developers](https://developers.facebook.com/)

**Note:** The application includes unauthenticated public fallbacks. Environment variables are optional and can be configured for higher-throughput or authenticated deployments.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/amhirdaykapil/anyfetch.git
```

### 2. Navigate to the Project Directory

```bash
cd anyfetch
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create your `.env.local` file using `.env.example` as a reference.

Add the credentials and optional configuration values required for your setup.

### 5. Start the Development Server

```bash
npm run dev
```

Open your browser and visit:

[http://localhost:3000](http://localhost:3000)

### 6. Build for Production

```bash
npm run build
npm run start
```

---

## Security & Compliance

AnyFetch includes several security measures designed to protect its server-side media extraction and streaming functionality.

### SSRF Protection

- Deep URL parsing and validation.
- DNS resolution validation.
- Blocking loopback addresses such as `127.0.0.1` and `::1`.
- Blocking private IP ranges:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- Blocking cloud metadata addresses such as `169.254.169.254`.
- Blocking `metadata.google.internal` and multicast addresses.
- DNS rebinding prevention.

### Content-Disposition Sanitization

Filenames are sanitized to prevent:

- Directory traversal sequences such as `../`.
- Control characters.
- Non-printable characters.
- Unsafe filename values.

RFC 5987/6266-compatible filename handling is used.

### MIME Type Validation

Strict MIME type whitelist enforcement helps prevent executable binaries and HTML scripts from being relayed through the download proxy.

### Zero-Storage Architecture

Media responses are streamed through Node.js and Web Streams without persisting downloaded media chunks to server disk storage.

Download history is maintained exclusively in the user's browser using `localStorage`.

---

## Contributing

Contributions, bug reports, feature requests, and suggestions are welcome!

1. Fork the repository.
2. Create a new feature branch.
3. Make your changes.
4. Test your implementation.
5. Submit a Pull Request.

---

## License & Usage

AnyFetch is intended for personal, educational, research, fair-use, and authorized content-creator archival purposes.

Users are responsible for ensuring that their downloads comply with applicable copyright laws and the terms of service of the respective platforms.

Please review the [Terms of Service](/terms) before using the application.

AnyFetch is an independent project and is not affiliated with or officially endorsed by the platforms mentioned above.

---

#<p align="center">  Made with passion by <a href="https://github.com/amhirdaykapil">Hirday Kapil</a></p>
