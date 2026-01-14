# Authentication

This project uses [BetterAuth](https://www.better-auth.com/) for authentication with email/password credentials.

## Configuration

Authentication is configured in `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
});
```

**Key settings:**
- `disableSignUp: true` - New user registration is disabled
- Uses Drizzle ORM adapter with PostgreSQL

## Database Tables

BetterAuth creates these tables (defined in `src/db/schema.ts`):

| Table | Purpose |
|-------|---------|
| `user` | User accounts |
| `session` | Active sessions |
| `account` | Auth providers (credentials, OAuth) |
| `verification` | Email verification tokens |

## Client Usage

The auth client is in `src/lib/auth-client.ts`:

```typescript
import { authClient } from "@/lib/auth-client";

// Sign in
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
});

// Sign out
await authClient.signOut();

// Get session (React hook)
const { data: session } = authClient.useSession();
```

## Protected Routes

The middleware in `middleware.ts` protects all routes except:
- `/sign-in` - Login page
- `/api/auth/*` - Auth API endpoints
- Static assets (`_next/static`, `_next/image`, `favicon.ico`)

Unauthenticated requests are redirected to `/sign-in`.

## API Endpoints

BetterAuth exposes these endpoints at `/api/auth/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sign-in/email` | POST | Email/password login |
| `/sign-out` | POST | End session |
| `/session` | GET | Get current session |

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<random-32-byte-base64>
BETTER_AUTH_URL=http://localhost:3000

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Creating Users

Since signups are disabled, create users via script:

1. Temporarily set `disableSignUp: false` in `src/lib/auth.ts`
2. Call the signup endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password","name":"Name"}'
   ```
3. Set `disableSignUp: true` again

Or use the existing script:
```bash
node scripts/create-admin.js
```
