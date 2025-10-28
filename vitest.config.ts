// ===== OLD CONFIG (commented out) =====
// import { defineConfig } from "vitest/config";
// import dotenv from "dotenv";
// import path from "path";

// // Load test env variables
// dotenv.config({ path: path.resolve(__dirname, ".env.test") });

// export default defineConfig({
//   test: {
//     environment: "jsdom",
//     setupFiles: ["./vitest.setup.ts"],
//     css: true,
//     globals: true,
//     coverage: {
//       provider: "v8",
//       reporter: ["text", "lcov", "html"],
//       all: true,
//       exclude: [
//         "node_modules/",
//         ".next/",
//         "out/",
//         "coverage/",
//         "**/*.d.ts",
//         "**/vitest.setup.ts",
//         "**/vitest.config.ts"
//       ]
//     }
//   }
// });
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
      include: [
        "src/app/**/*.{test,spec}.{ts,tsx}",
        'src/components/**/*.{test,spec}.{ts,tsx}',
      ],
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

  resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
});
