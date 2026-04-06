# Blindspot

A blind dating app for Northeastern University students. Profiles are hidden behind a blur until you and a match exchange enough messages — then the reveal happens.

## Features

- **NU-only auth** — sign up requires a `@northeastern.edu` email
- **Blind matching** — photos stay blurred until you hit 5 messages or confirm a date
- **Smart discover** — cards ranked by shared interests (Jaccard similarity), filtered by gender/sexuality compatibility
- **Realtime chat** — messages, match updates, and reveal events all stream live
- **Date proposals** — after 24 hours of chatting, either person can propose a date; accepting triggers the photo reveal
- **Coffee chat invites** — suggest a meetup at a campus spot (Kigo, Tatte, Punchy's, Stetson West)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend/DB**: Supabase (Postgres + Auth + Realtime)
- **Auth**: Supabase email/password

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the schema against your Supabase project via the SQL editor:

```bash
# paste the contents of supabase/schema.sql into the Supabase SQL editor and run it
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/         # Public routes: login, onboarding
  (app)/          # Protected routes: discover, matches, chat, profile
components/       # SwipeCard, Avatar, ProgressBar, CoffeeChatModal, etc.
hooks/            # useMatches, useMessages, useProfile
lib/              # Supabase clients, auth helpers, matching logic
supabase/
  schema.sql      # Full DB schema, RLS policies, and triggers
```

## How the Reveal Works

1. Match is created when two users both swipe right (handled by a Postgres trigger)
2. Photos are blurred on all cards and in chat
3. A progress bar tracks messages toward the 5-message threshold
4. At 5 messages, a DB trigger sets `revealed = true` and a countdown animation plays
5. Accepting a date proposal also triggers an immediate reveal

## Known Limitations

- No photo upload UI yet — `photo_url` must be set manually
- Coffee chat accept/decline flow is not built (send-only)
- No push notifications (web only)
