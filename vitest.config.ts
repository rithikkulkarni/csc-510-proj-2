import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    globals: true,                     // Allows using globals like 'test', 'expect'
    setupFiles: ["./vitest.setup.ts"], // Optional setup file
    environment: "jsdom",              // Use jsdom for React tests; works with fetch for Supabase


    // Optional coverage 
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      all: true,
      exclude: [
        "node_modules/",
        ".next/",
        "out/",
        "coverage/",
        "**/*.d.ts",
        "**/vitest.setup.ts",
        "**/vitest.config.ts",
      ],
    },
  },
});
