import "dotenv/config";
import { createServer as createViteServer } from "vite";
import express from "express";

// Minimal server — only serves the Vite React frontend.
// All /api/* routes are handled by the Python FastAPI backend (port 8000).
// Vite's proxy config forwards /api/* there automatically.
async function startServer() {
  const app = express();
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("path");
    const distPath = path.default.join(process.cwd(), "dist");
    const { default: serveStatic } = await import("serve-static");
    app.use(serveStatic(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.default.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Vite frontend → http://localhost:${PORT}`);
    console.log(`   API backend   → http://localhost:8000  (Python FastAPI)`);
  });
}

startServer();
