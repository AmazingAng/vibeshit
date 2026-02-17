# 💩 Vibe Shit

**Product Hunt for Vibe Coding** — discover and share the best vibe coding projects.

[vibeshit.org](https://vibeshit.org)

## Stack

- **Framework**: Next.js 15 (App Router) + OpenNext Cloudflare adapter
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Auth**: Auth.js v5 (GitHub OAuth)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Deploy**: Cloudflare Pages (Workers)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL to `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.dev.vars`

### 3. Configure environment

Edit `.dev.vars`:

```
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### 4. Run development server

```bash
npm run dev
```

### 5. Initialize database

Visit `http://localhost:3000/api/migrate` to create the database tables.

### 6. Open

Visit [http://localhost:3000](http://localhost:3000)

## Deploy to Cloudflare

### 1. Create D1 database

```bash
npx wrangler d1 create vibeshit-db
```

Update the `database_id` in `wrangler.jsonc` with the returned ID.

### 2. Run migration on production D1

```bash
npx wrangler d1 execute vibeshit-db --remote --file=./drizzle/0000_skinny_young_avengers.sql
```

### 3. Set secrets

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put AUTH_TRUST_HOST
```

### 4. Deploy

```bash
npm run deploy
```

## License

MIT
