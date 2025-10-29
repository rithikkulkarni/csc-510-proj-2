# Installation Guide

This document explains how to set up and run the project locally.

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or newer recommended)  
  [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node) or **yarn** package manager
- **Git** (for cloning the repository)

To check your versions:
```bash
node -v
npm -v
git --version
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/rithikkulkarni/csc-510-proj-2.git
cd csc-510-proj-2
```

### 2. Install dependencies

Using **npm**:
```bash
npm install
```

Or using **yarn**:
```bash
yarn install
```

---

## Configuration

1. Create a `.env.local` file in the root directory:
   ```bash
   touch .env.local
   ```
2. Add your environment variables (example):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://XXX.supabase.co/
   NEXT_PUBLIC_SUPABASE_ANON_KEY=XXX
   SUPABASE_SERVICE_ROLE_KEY=XXX
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=XXX
   ```

*(Do not commit `.env.local` to version control.)*

---

## Running the App

### Development Mode
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

### Production Build
To create an optimized production build:
```bash
npm run build
npm start
```

---

## Running Tests
```bash
npm run test
```

### With Coverage Report (coveralls)
```bash
npm run test:coverage
```

---

## Common Issues

| Problem | Solution |
|----------|-----------|
| **Port 3000 already in use** | Run `npm run dev -- -p 4000` to use a different port |
| **Dependencies not installing** | Delete `node_modules` and `package-lock.json`, then reinstall: `rm -rf node_modules package-lock.json && npm install` |
| **Env vars not loading** | Ensure `.env.local` exists and is not misnamed (case-sensitive) |

---

## Project Structure (Example)

```
.
├── src/
|   ├── app/                # Next.js pages (.tsx, .test.tsx)
|   ├── components/         # UI components
|   └── lib/                # .ts files for external connectivity
├── sql/                    # SQL configuration + setup files
├── public/                 # Static assets (images, etc.)
├── package.json            # Lists project dependencies, scripts, and metadata
├── package-lock.json       # Auto-generated file locking exact dependency versions
├── next.config.ts          # Next.js configuration file (TypeScript version)
├── vitest.config.ts        # Configuration for Vitest (unit testing framework)
├── vitest.setup.ts         # Global setup file for test environment initialization
├── postcss.config.mjs      # Config for PostCSS (Tailwind)
└── README.md               # Main documentation and usage guide for the project
```

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
