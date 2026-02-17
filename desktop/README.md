# Pultify Desktop App

Lightweight Windows wrapper for the Pultify web application (https://pultify.hu).

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd desktop
npm install
```

## Development

```bash
npm start
```

## Build for Windows

```bash
# Build both installer and portable
npm run build

# Build only portable .exe (no install needed)
npm run build:portable

# Build only NSIS installer
npm run build:nsis
```

Output will be in the `dist/` folder:
- `Pultify-Setup-1.0.0.exe` — NSIS installer
- `Pultify-Portable-1.0.0.exe` — Portable executable

## Icons

Place your app icons in the `desktop/` folder:
- `icon.ico` — Windows icon (256x256, multi-size .ico)
- `icon.png` — PNG icon (512x512 recommended)

You can generate an `.ico` from a PNG using tools like https://convertio.co/png-ico/
