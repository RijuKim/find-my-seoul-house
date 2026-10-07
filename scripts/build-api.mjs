import { build } from "esbuild";
import { rmSync, mkdirSync } from "node:fs";
import path from "node:path";

// Vercel 서버리스 함수용 진입점을 자립형(sel-contained) ESM으로 번들한다.
// Vercel의 기본 api/ 번들러가 `server/*` 상대 import를 해석하지 못하는 문제를 피한다.
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_FILE = path.join(ROOT, "api", "trpc", "[...trpc].js");

rmSync(path.join(ROOT, "api"), { recursive: true, force: true });
mkdirSync(path.dirname(OUT_FILE), { recursive: true });

await build({
  entryPoints: [path.join(ROOT, "api-src", "trpc.ts")],
  outfile: OUT_FILE,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: {
    js: 'import { createRequire as __cr } from "module"; const require = __cr(import.meta.url);',
  },
});

console.log(`[build-api] bundled → ${path.relative(ROOT, OUT_FILE)}`);
