import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
const root = new URL("..", import.meta.url).pathname;
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}
test("every module and stylesheet is precached and every relative import exists", () => {
  const source = readFileSync(root + "/service-worker.js", "utf8");
  const list = vm.runInNewContext(source.match(/const CORE = (\[[\s\S]*?\]);/)[1]);
  for (const asset of list)
    assert.ok(existsSync(path.join(root, asset)), asset);
  for (const file of [...files(root + "/js"), ...files(root + "/css")]) {
    assert.ok(
      list.includes("./" + path.relative(root, file)),
      `Not precached: ${file}`,
    );
    if (file.endsWith(".js"))
      for (const match of readFileSync(file, "utf8").matchAll(
        /from\s+["']([^"']+)["']/g,
      ))
        assert.ok(
          existsSync(path.resolve(path.dirname(file), match[1])),
          `${file}: ${match[1]}`,
        );
  }
});
test("service worker caches all assets on install and serves cached modules offline", async () => {
  const handlers = {},
    saved = new Map();
  let installPromise, responsePromise;
  const fakeCache = {
    addAll: async (requests) =>
      requests.forEach((r) =>
        saved.set(r.url, new Response("cached " + r.url)),
      ),
    put: async (req, response) => saved.set(req.url, response),
  };
  const context = {
    self: {
      location: { origin: "https://ikra.test" },
      addEventListener: (name, fn) => (handlers[name] = fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => fakeCache,
      keys: async () => ["ikra-v1.1.1", "other-app"],
      delete: async () => true,
      match: async (request) =>
        saved.get(
          typeof request === "string"
            ? new URL(request, "https://ikra.test/ikra/").href
            : request.url,
        ),
    },
    Request: class extends Request {
      constructor(url, options) {
        super(new URL(url, "https://ikra.test/ikra/"), options);
      }
    },
    Response,
    URL,
    fetch: async () => {
      throw Error("offline");
    },
  };
  vm.runInNewContext(
    readFileSync(root + "/service-worker.js", "utf8"),
    context,
  );
  handlers.install({ waitUntil: (p) => (installPromise = p) });
  await installPromise;
  const url = "https://ikra.test/ikra/js/services/focus-timer.js";
  handlers.fetch({
    request: new Request(url),
    respondWith: (p) => (responsePromise = p),
  });
  assert.equal(await (await responsePromise).text(), "cached " + url);
});
