<!-- Title and Logo -->
<div style="text-align: left; line-height: 1.2;">
  <div style="display: flex; align-items: center; font-size: 2em;">
    <img src="./public/logo.png" alt="Food Finder Logo" width="60" height="60" style="margin-right: 10px;">
    Food Finder
  </div>
  <div style="font-size: 0.8em; color: gray;">
    <em>Decisions are hard. Eating together shouldn't be.</em>
  </div>
</div>

Project 2 repository for CSC 510 - Fall 2025

[WATCH THE DEMO VIDEO!](./FoodFinderDemo.mp4)

## Group Members (G10)

- Rithik Kulkarni (rrkulka3)
- Shiva Gadireddy (sgadire)
- Ananya Rao (arrao3)
- Natasha Wolsborn (njwolsbo)

How to get this running:

## Developer Handbook

> This section is designed to explain linting, formatting, testing, and coverage for this project using ESLint, Prettier, and Vitest/React Testing Library.

---

### Prerequisites (Quick Start)

```bash
git clone https://github.com/rithikkulkarni/csc-510-proj-2.git
npm install
npm run dev
```

---

### Code Quality: ESLint & Prettier

This project uses **ESLint** to enforce code quality rules and **Prettier** to keep formatting consistent. Prettier is integrated via ESLint so you get one place to see issues.

#### Install/verify dependencies

If any are missing, install:

```bash
npm i -D eslint prettier eslint-config-next eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

#### Recommended config files for ESLint & Prettier

**`eslint.config.mjs`**

```js
import next from 'eslint-config-next';
import eslintConfigPrettier from 'eslint-config-prettier'; // disables rules that conflict with Prettier
import prettier from 'eslint-plugin-prettier'; // surfaces Prettier issues via ESLint

const config = [
  // Next.js recommended rules (already flat): spread them in
  ...next,

  // Turn off ESLint rules that conflict with Prettier
  eslintConfigPrettier,

  // Project-level settings
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'coverage/**', 'dist/**'],

    plugins: { prettier },

    rules: {
      // Make Prettier formatting issues show as ESLint errors
      'prettier/prettier': 'error',

      // Your prefs
      'react/no-unescaped-entities': 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
];

export default config;
```

**`.prettierrc.json`**

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

#### How to lint your code

```bash
# Run Lint checker (this has prettier integrated into its checks, even though Prettier has its own workflow as well called 'format')
npm run lint
# Auto-fix style errors that Lint/Prettier can fix
npx eslint . --fix
```

**Suggested `package.json` scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

---

### Testing (Vitest & React Testing Library)

This project uses **Vitest** for unit and integration testing, alongside **React Testing library** for component rendering and DOM assertions.

#### Install/verify test dependencies

```bash
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

#### Suggested Vitest Config Files

**`vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  test: {
    globals: true, // Allows using globals like 'test', 'expect'
    setupFiles: ['./vitest.setup.ts'], // Optional setup file
    environment: 'jsdom', // Use jsdom for React tests; works with fetch for Supabase

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'coverage/',
        '**/*.d.ts',
        '**/vitest.setup.ts',
        '**/vitest.config.ts',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**`vitest.setup.ts`**

```ts
// vitest.setup.ts
// This file runs before every test file — define global mocks & utilities here.

import '@testing-library/jest-dom';
import fetch from 'node-fetch';
import { vi } from 'vitest';

// Only needed if Node < 18
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

// Mock next/font/google to return dummy functions
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
}));
```

#### Example test

**`src/__tests__/Home.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import Home from '@/pages/index';

test('renders a heading', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
});
```

#### Test scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

Run tests:

```bash
npm test
npm run test:watch
```

---

### Coverage & Quality Gates

Generate coverage locally:

```bash
npm run test:coverage
```

#### Coveralls Integration (GitHub Badge)

1. Create a **Coveralls** repo and get the `COVERALLS_REPO_TOKEN`.
2. Add it as a secret in your GitHub repo: **Settings → Secrets and variables → Actions**.
3. Add a CI job to upload coverage.

**`.github/workflows/coverage.yml`**

```yaml
name: coverage
on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-and-coverage:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload to Coveralls
        uses: coverallsapp/github-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          path-to-lcov: ./coverage/lcov.info
          # If PRIVATE repo, also set:
          # coveralls-endpoint: https://coveralls.io
          # repo-token: ${{ secrets.COVERALLS_REPO_TOKEN }}

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  NEXT_PUBLIC_GOOGLE_PLACES_API_KEY: ${{ secrets.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY }}
```

### Coveralls Integration: ESLint

**`.github/workflows/coverage.yml`**

```yaml
name: lint
on:
  push:
    branches: [main]
  pull_request:

jobs:
  eslint:
    name: Run ESLint
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: npm ci

      - name: Run ESLint
        run: npm run lint

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  NEXT_PUBLIC_GOOGLE_PLACES_API_KEY: ${{ secrets.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY }}
```
## Supabase Database & Sample Data

This project uses **Supabase** as its backend database.

### Database Schema

The database contains four main tables:

| Table         | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `sessions`    | Represents a voting session (`solo` or `group`).                           |
| `users`       | Users participating in a session, linked via `session_id`.                 |
| `restaurants` | Restaurants available for voting, linked via `session_id`.                 |
| `votes`       | Records user votes for restaurants, linked to `users`, `restaurants`, `sessions`. |

**Schema Notes:**

- Session codes are exactly 4 uppercase letters (e.g., `GRP1`, `SOL1`).  
- Primary keys are sequential integers.  
- Foreign keys enforce relationships:
  - `users.session_id` → `sessions.id`  
  - `restaurants.session_id` → `sessions.id`  
  - `votes.session_id` → `sessions.id`  
  - `votes.user_id` → `users.id`  
  - `votes.restaurant_id` → `restaurants.id`  
- Validation constraints:
  - Positive radius and expiry hours  
  - Valid mode (`solo` or `group`)  
  - Price range 0–3 (if provided)  

---

### Sample Data

A separate file `sample_data.sql` contains fully connected sample data:

- Two sessions:
  - `GRP1` → group session (multiple users and votes)
  - `SOL1` → solo session (single user and vote)
- Users:
  - Alice and Bob in the group session  
  - Charlie in the solo session
- Restaurants:
  - Original names preserved  
  - Correctly assigned to sessions
- Votes:
  - Linked to users and restaurants  
  - Includes vote timestamps

**Usage:**

1. Run the **create_tables.sql SQL script** first.  
2. Load **sample data** using `sample_data.sql`.  
3. Verify that sessions, users, restaurants, and votes are correctly linked.  

> **Purpose:** The sample data demonstrates relationships and provides a realistic dataset for testing and onboarding.

---

### Supabase Integration

Install Supabase client:

```bash
npm i @supabase/supabase-js
```

### Environment Variables

Create **`.env.local`** (make sure you never commit secrets):

```bash
# Public (safe to expose to the browser, still keep in env files)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only (NEVER expose to the client. Optional and used for admin/server actions)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> The `SERVICE_ROLE_KEY` bypasses RLS and must only be used server-side in API routes or server actions.

### Client helper

**`src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Google Places API Integration

We fetch Google Places data on the server (Next.js API route) so clients never see your key directly

### Enable API & key

1. In Google Cloud Console, enable **Places API** (and **Maps Geocoding API** if you need geocodes).
2. Create an API key and restrict it to the **Places API** (API restriction). For server-side (Vercel), you usually cannot IP-restrict—use **API restrictions** + separate keys per environment.

**`.env.local`**

```bash
GOOGLE_MAPS_API_KEY=your-places-api-key
```

[![Coverage Status](https://coveralls.io/repos/github/rithikkulkarni/csc-510-proj-2/badge.svg?branch=main)](https://coveralls.io/github/rithikkulkarni/csc-510-proj-2?branch=main)
[![Lint](https://github.com/rithikkulkarni/csc-510-proj-2/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/rithikkulkarni/csc-510-proj-2/actions/workflows/lint.yml)
[![DOI](https://zenodo.org/badge/1073022543.svg)](https://zenodo.org/badge/latestdoi/1073022543)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
