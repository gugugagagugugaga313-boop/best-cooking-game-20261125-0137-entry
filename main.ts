// Dapur Purnama hand-in (Node 22, standard library only).
//
// The entry is the static game under game/ plus the screenshots under
// screenshots/. This program hands both in: it copies them into the
// grader's output directory and writes dossier.json there, using the
// kit's own dossier builder, so the judge reads exactly what was
// submitted. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output, e.g.:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The copy is byte-for-byte, so running it twice writes the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The caps below mirror the gate in the competition rules: at most
// 4 screenshots of 256 KiB, a game of at most 993 files / 48 MiB,
// paths under 1,000 bytes, and a dossier text of at most 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
