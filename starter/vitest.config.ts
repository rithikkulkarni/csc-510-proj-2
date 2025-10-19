import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    globals: true,
    coverage: {
      provider: "v8", // or 'istanbul' if you prefer
      reporter: ["text", "lcov", "html"],
      all: true, // include files that don't have tests
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
