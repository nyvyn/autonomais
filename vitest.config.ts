// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // <-- Ensure this is true
    environment: "node",
    // ... other configurations
  },
});
