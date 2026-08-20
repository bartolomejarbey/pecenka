import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // `server-only` je jen strážce proti importu na klientu; v testech běžíme
      // v Node, takže ho nahradíme prázdným modulem.
      "server-only": path.resolve(__dirname, "__tests__/pomocnici/prazdno.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    // PGlite naběhne za pár set ms, ale první migrace může trvat déle.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Testy nad databází sdílejí jeden adresář — nesmí běžet paralelně.
    fileParallelism: false,
  },
});
