# 🐜 Sidequest - UCI Task Marketplace

A peer-to-peer task marketplace exclusively for UCI students and staff. Post tasks, earn money, help your community.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Supabase

## Features

- 🔐 **UCI-Only Auth** - Magic link authentication restricted to @uci.edu emails
- 📋 **Task Feed** - Browse and filter tasks by category, time window, and price
- 💬 **Chat** - Coordinate task details (polling-based, FREE - no Realtime costs!)
- ⭐ **Ratings** - Build trust with a rating system
- 🚫 **User Blocking** - Basic self-protection feature
- 📱 **Mobile-First** - Designed for on-the-go students

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account
- A @uci.edu email (for testing)

### 1. Clone and Install

```bash
git clone <repo-url>
cd sidequest
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Go to **SQL Editor** and run the migration file:
   - Open `supabase/migrations/00001_initial_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor and run

3. Configure Auth:
   - Go to **Authentication** → **Providers** → **Email**
   - Enable "Email" provider
   - Set "Confirm email" to OFF (we use magic links)
   - Go to **URL Configuration**
   - Add to "Redirect URLs": `http://localhost:3000/auth/callback`

4. Get your API keys:
   - Go to **Settings** → **API**
   - Copy `Project URL` and `anon public` key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

1. Push your code to GitHub

2. Import to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo

3. Configure environment variables:
   - Add all variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel domain

4. Update Supabase redirect URLs:
   - Add `https://your-app.vercel.app/auth/callback` to Supabase's Redirect URLs

5. Deploy!

## Project Structure

```
sidequest/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, rules)
│   ├── (main)/            # Main app pages
│   │   ├── page.tsx       # Home (task feed)
│   │   ├── post/          # Post task
│   │   ├── tasks/[id]/    # Task detail + chat
│   │   ├── my-tasks/      # User's tasks
│   │   └── profile/       # User profile
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase clients
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
├── supabase/
│   └── migrations/        # Database migrations
└── middleware.ts          # Auth middleware
```

## Database Schema

See `supabase/migrations/00001_initial_schema.sql` for the complete schema with comments.

### Tables

- **profiles** - User profiles (linked to Supabase Auth)
- **tasks** - Task listings
- **messages** - Chat messages
- **ratings** - User ratings
- **blocks** - User blocks

### Key Design Decisions

1. **UCI-Only by Construction**
   - Only @uci.edu emails can sign up
   - No need for campus filtering in queries
   - Creates trusted, local community

2. **Price in Cents**
   - Avoids floating-point precision issues
   - Standard practice for financial data

3. **Blocking as Minimal Safety Valve**
   - No complex moderation system in MVP
   - Users can protect themselves
   - Extension point for full moderation later

4. **RLS for Security**
   - Row Level Security on all tables
   - Defense in depth (server actions + RLS)
   - See migration file for policy comments

## Extension Points

The codebase is designed for easy extension:

### Realtime Chat (when you're ready to pay $10.25/month)
The MVP uses polling (free!) but you can upgrade to instant messaging:
1. Enable Realtime in Supabase Dashboard (Database → Replication)
2. Uncomment `ALTER PUBLICATION` line in the migration
3. Update `task-detail-client.tsx` to use Supabase channels (see comments in file)

### Payments (Stripe)
```typescript
// In lib/actions/tasks.ts acceptTask():
// [EXTENSION] Stripe payment hold would go here
// const paymentIntent = await stripe.paymentIntents.create({...});
```

### Moderation
```sql
-- Add reports table
-- Add admin dashboard
-- Add content filtering
```

### Multi-Campus
```typescript
// Add campus_domain to profiles
// Filter queries by campus
// Allow cross-campus browsing
```

## Security Notes

1. **Server Actions** - All mutations go through server actions for permission checks
2. **RLS** - Database-level security as defense in depth
3. **Input Validation** - Both client and server-side
4. **UCI Email Gating** - Enforced at auth callback level

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes with descriptive comments
4. Submit a PR

## License

MIT

---

Built with 💙💛 for UCI by the Sidequest team
