# Personal Website

A full-stack personal website and experimental platform built with Next.js. It combines a public portfolio with authenticated social features, hardware monitoring, and integrations running on a Raspberry Pi.

This repository is a sanitized public showcase. Production credentials, private data, uploaded content, and personal-only features are intentionally excluded.

## Features

- Public About, CV, and Projects pages
- Email and password authentication
- Email verification and password reset
- Passkey authentication
- User profiles and account settings
- Temporary photo wall with privacy controls
- Friend requests and friend-only content
- Persistent AI chat conversations
- Push notifications
- Raspberry Pi system statistics
- GPIO control interface
- Responsive mobile and desktop layouts
- Light, dark, and system themes

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Better Auth
- PostgreSQL
- Resend
- Groq
- PM2
- Cloudflare Tunnel
- Raspberry Pi
- Python GPIO service

## Architecture

The application uses Next.js for its frontend and server-side API routes. Better Auth provides authentication and account management, while PostgreSQL stores application and authentication data.

The production version is self-hosted on a Raspberry Pi. PM2 manages the application process, and Cloudflare Tunnel provides external access without exposing the application server directly.

GPIO operations are handled by a separate local Python service protected by a service token. The browser never communicates with the GPIO service directly.

## Local setup

### Requirements

- Node.js 24
- PostgreSQL
- npm

Use the Node.js version specified in `.nvmrc`:

```bash
nvm use
```

If that version is not installed:

```bash
nvm install
nvm use
```

Install the dependencies:

```bash
npm ci
```

Create your private local configuration from the example:

```bash
cp .env.example .env.local
```

Replace the placeholders in `.env.local` with your own development values.

Never commit `.env.local` or any other file containing credentials.

Run the required Better Auth database migrations:

```bash
npx auth@latest migrate --yes
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

The required environment variable names are documented in `.env.example`.

The example file contains placeholders only. Depending on which features you use, you will need configuration for:

- PostgreSQL
- Better Auth
- Resend
- Groq
- The local GPIO service

Generate your own secrets and credentials. Do not reuse the placeholder values from `.env.example`.

## Verification

Run the linter:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

A valid PostgreSQL configuration may be required for authentication-related checks to complete without database warnings.

## Privacy and security

This public repository does not contain:

- Production environment variables
- API keys or authentication secrets
- Database contents or password hashes
- User uploads
- Private photographs
- Personal-only pages or their associated data
- Cloudflare Tunnel credentials
- Raspberry Pi SSH credentials

Protected functionality is authorized on the server. Hiding a navigation item is not treated as an access-control mechanism.

Passwords are handled by the authentication system and are not stored directly by the application.

GPIO requests are sent through protected server-side routes. The GPIO service token is never intentionally exposed to the browser.

## Hardware project

The Projects page includes a Bluetooth-controlled miniature robotic arm built using:

- Bambu Lab A1 mini
- 3D-printed mechanical parts
- ESP32 microcontroller
- Mini servo motors
- Dedicated parallel 5 V servo power supply
- PlayStation 5 DualSense controller connected over Bluetooth

The ESP32 receives commands from the controller and controls the servo motors. The servos use a separate 5 V power supply rather than drawing their operating current directly from the ESP32.

## Deployment

The private production version is deployed to a Raspberry Pi and managed with PM2.

Cloudflare Tunnel provides external access while the Next.js application listens locally on the Raspberry Pi. Deployment-specific scripts and configuration may require adaptation for another environment.

This public repository is primarily provided as a portfolio and learning project. It is not intended to contain the complete private production configuration.

## Project status

This website is an ongoing personal project. I plan to continue expanding it with features that are useful to me and potentially helpful to other people.

## License

No license has currently been granted.

Unless a license is added, the source code remains subject to standard copyright restrictions.