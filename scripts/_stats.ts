import { readFileSync } from 'node:fs';
import { measureDifficulty } from '../src/engine/generator.ts';
for (const f of ['levels.json', 'levels-hot.json', 'levels-white.json']) {
  const ls = JSON.parse(readFileSync('src/game/' + f, 'utf8')).levels;
  const out: string[] = [];
  for (let a = 0; a < 200; a += 25) {
    const ds = ls.slice(a, a + 25).map(measureDifficulty);
    const blocks = ls.slice(a, a + 25).map((l: any) => l.blocks.filter((b: any) => b.kind === 'block').length);
    out.push(`${a + 1}: d${(ds.reduce((s: number, d: any) => s + d.depth, 0) / 25).toFixed(1)} b${(blocks.reduce((s: number, x: number) => s + x, 0) / 25).toFixed(1)}`);
  }
  console.log(f, out.join(' | '));
}
