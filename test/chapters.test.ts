import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { CHAPTERS, CHAPTER_SIZE, chapterOf } from '../src/game/chapters.ts';
import { chapterNodesSvg, type NodeInfo } from '../src/game/map-view.ts';

const levelCount = JSON.parse(readFileSync('src/game/levels.json', 'utf8')).levels.length;

describe('chapter maps', () => {
  it('cover every shipped level, one tile each', () => {
    assert.equal(CHAPTERS.length * CHAPTER_SIZE, levelCount);
    for (const chapter of CHAPTERS) assert.equal(chapter.nodes.length, CHAPTER_SIZE);
  });

  it('put each level in its own chapter', () => {
    assert.equal(chapterOf(1).n, 1);
    assert.equal(chapterOf(20).n, 1);
    assert.equal(chapterOf(21).n, 2);
    assert.equal(chapterOf(200).n, 10);
  });

  it('have their art in public/maps', () => {
    for (const chapter of CHAPTERS) {
      assert.ok(existsSync(`public/maps/chapter-${chapter.n}-map.svg`), `map ${chapter.n}`);
      assert.ok(existsSync(`public/maps/chapter-${chapter.n}-background.svg`), `background ${chapter.n}`);
    }
  });

  it('keep every tile on its map', () => {
    for (const chapter of CHAPTERS) {
      for (const [x, y] of chapter.nodes) {
        assert.ok(x > 0 && x < chapter.width && y > 0 && y < chapter.height, `chapter ${chapter.n} at ${x},${y}`);
      }
    }
  });

  it('draw stars on cleared tiles and one pin on the next level', () => {
    const chapter = CHAPTERS[1];
    const nodes: NodeInfo[] = chapter.nodes.map((_, i) => ({
      level: 21 + i,
      state: i < 3 ? 'done' : i === 3 ? 'now' : 'locked',
      stars: 2,
    }));
    const svg = chapterNodesSvg(chapter, nodes);
    assert.equal(svg.match(/<text /g)?.length, CHAPTER_SIZE);
    assert.equal(svg.match(/class="pin"/g)?.length, 1);
    assert.equal(svg.match(/fill="#ffd23f"/g)?.length, 6);
    assert.ok(svg.includes('>24</text>'));
  });
});
