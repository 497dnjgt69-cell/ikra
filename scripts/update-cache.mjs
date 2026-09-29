import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? files(path.posix.join(dir, e.name))
        : path.posix.join(dir, e.name),
    ),
  );
  return results.flat();
}
const assets = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  ...(await files("css"))
    .filter((f) => f.endsWith(".css"))
    .sort()
    .map((f) => "./" + f),
  ...(await files("js"))
    .filter((f) => f.endsWith(".js"))
    .sort()
    .map((f) => "./" + f),
];
const source = await readFile("service-worker.js", "utf8");
await writeFile(
  "service-worker.js",
  source.replace(
    /const CORE = \[[\s\S]*?\];/,
    "const CORE = " + JSON.stringify(assets, null, 2) + ";",
  ),
);
console.log(`Updated offline cache: ${assets.length} assets`);
