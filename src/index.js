import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "../public");
const INITIAL_PORT = Number(process.env.PORT) || 3000;

const app = express();

if (process.env.NODE_ENV !== "production" && process.argv.includes("--watch")) {
  const tailwindProcess = spawn(
    "npx",
    ["tailwindcss", "-i", "./src/input.css", "-o", "./public/output.css", "--watch"],
    { stdio: "inherit", shell: true }
  );

  process.on("exit", () => tailwindProcess.kill());
  process.on("SIGINT", () => {
    tailwindProcess.kill();
    process.exit();
  });
}

app.use(express.static(PUBLIC_DIR));

app.get("/legal", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "legal.html"));
});

app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 CareVity AI Express Server running at:`);
    console.log(`   ➜ Local:   http://localhost:${port}`);
    console.log(`   ➜ Network: http://127.0.0.1:${port}\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`ℹ️  Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer(INITIAL_PORT);
