import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const frontendHtml = [
  "public/MainPage.html",
  "public/AllItem.html",
  "public/foodbank_login.html",
  "public/foodbank_admin.html",
  "Nourish-Map/map.html"
];

test("frontend HTML references existing local assets", async () => {
  for (const relativeHtmlPath of frontendHtml) {
    const htmlPath = path.join(repositoryRoot, relativeHtmlPath);
    const html = await readFile(htmlPath, "utf8");
    const referencePattern = /(?:href|src)="([^"]+)"/g;

    for (const [, reference] of html.matchAll(referencePattern)) {
      if (
        reference.startsWith("http") ||
        reference.startsWith("#") ||
        reference.startsWith("data:")
      ) {
        continue;
      }

      const target = path.resolve(path.dirname(htmlPath), reference.split(/[?#]/)[0]);
      await assert.doesNotReject(
        access(target),
        `${relativeHtmlPath} references missing file ${reference}`
      );
    }
  }
});

test("frontend uses the same-origin backend API contract", async () => {
  const api = await readFile(
    path.join(repositoryRoot, "public/javascript/api.js"),
    "utf8"
  );
  const scripts = await Promise.all(
    [
      "public/javascript/Allitem.js",
      "public/javascript/foodbank_login.js",
      "public/javascript/foodbank_admin.js",
      "Nourish-Map/map-app.js"
    ].map((file) => readFile(path.join(repositoryRoot, file), "utf8"))
  );

  assert.match(api, /const API_BASE = "\/api\/v1";/);
  assert.match(api, /Authorization = `Bearer \$\{session\.accessToken\}`;/);
  assert.doesNotMatch(scripts.join("\n"), /data\.json/);
  assert.doesNotMatch(scripts.join("\n"), /SUPABASE_(?:ANON|SERVICE_ROLE)_KEY/);
});

test("Railway frontend serves static files and proxies API traffic", async () => {
  const [caddyfile, railwayConfig, dockerfile] = await Promise.all([
    readFile(path.join(repositoryRoot, "Caddyfile"), "utf8"),
    readFile(path.join(repositoryRoot, "railway.frontend.json"), "utf8"),
    readFile(path.join(repositoryRoot, "Dockerfile.frontend"), "utf8")
  ]);
  const config = JSON.parse(railwayConfig);

  assert.match(caddyfile, /handle \/api\/\*/);
  assert.match(caddyfile, /reverse_proxy \{\$BACKEND_URL:/);
  assert.equal(config.build.builder, "DOCKERFILE");
  assert.equal(config.build.dockerfilePath, "Dockerfile.frontend");
  assert.match(dockerfile, /FROM caddy:/);
});

