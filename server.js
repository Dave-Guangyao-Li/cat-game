import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 5188);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function safeResolve(urlPath) {
  const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(__dirname, normalized);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestedPath = req.url === "/" ? "/index.html" : req.url || "/index.html";
    const filePath = safeResolve(requestedPath.split("?")[0]);
    const ext = path.extname(filePath).toLowerCase();
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Cat game server: http://localhost:${PORT}`);
});
