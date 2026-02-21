import { build } from "esbuild";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..", "src");

// Plugin: resolve @/ → ../src/ with TypeScript extension handling
const aliasPlugin = {
  name: "tsconfig-paths",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const rel = args.path.replace("@/", "");
      const base = resolve(srcRoot, rel);

      // Try .ts, .tsx, /index.ts, /index.tsx, then bare
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
        const candidate = base + ext;
        if (existsSync(candidate)) {
          return { path: candidate };
        }
      }

      return { path: base };
    });
  },
};

await build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: resolve(__dirname, "dist/index.mjs"),
  external: ["@supabase/supabase-js"],
  plugins: [aliasPlugin],
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});

console.log("✓ Built dist/index.mjs");
