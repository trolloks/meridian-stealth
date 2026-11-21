// NIGHTGLASS hand-in program (Node 22, standard library only).
//
// The playable game is the static folder next to this file: game/index.html and
// its ES modules, with three.js vendored and minified under game/vendor. This
// program copies game/ and screenshots/ into the output folder and writes the
// dossier the judge reads, using make.fun's own builder so the bytes match the
// scorer's rebuild exactly.
//
// Local hand-in:   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it first:   node serve.ts   (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });

const gameSource = join(repository, 'game');
if (!existsSync(join(gameSource, 'index.html'))) {
  throw new Error(`NIGHTGLASS: no game/index.html beside ${repository}`);
}
cpSync(gameSource, join(out, 'game'), { recursive: true });

const screenshotSource = join(repository, 'screenshots');
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(screenshotSource)) {
  cpSync(screenshotSource, join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, dossierCaps);
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`NIGHTGLASS handed in: ${join(out, 'game')} + ${join(out, 'dossier.json')}`);
