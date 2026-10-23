/**
 * One attempt at one level.
 *
 * Winning is decided by the board alone - `isSolved` is true exactly when
 * every playable block has left through a gate - so the game can never
 * disagree with what the player can see, in either direction. There is no
 * timer, no life, and no fail state: a level ends when it is solved or when
 * the player chooses to leave.
 */

import { applyMove, encodeState, isSolved, maxSlide, remainingBlocks } from '../engine/board.ts';
import { solve } from '../engine/solver.ts';
import { cloneLevel, type Cell, type Dir, type Level, type Move, blockCells } from '../engine/types.ts';

interface Snapshot {
  positions: Array<{ id: number; x: number; y: number; exited: boolean }>;
  moves: number;
}

export type HintOutcome =
  | { kind: 'move'; move: Move }
  | { kind: 'already-solved' }
  /** The live search ran out of budget; the player is offered a rewind. */
  | { kind: 'unavailable' };

export class Session {
  readonly source: Level;
  level: Level;
  moves = 0;
  private history: Snapshot[] = [];

  constructor(source: Level) {
    this.source = cloneLevel(source);
    this.level = cloneLevel(source);
  }

  private snapshot(): Snapshot {
    return {
      moves: this.moves,
      positions: this.level.blocks.map((b) => ({
        id: b.id,
        x: b.pos.x,
        y: b.pos.y,
        exited: b.exited,
      })),
    };
  }

  private restore(snapshot: Snapshot): void {
    for (const saved of snapshot.positions) {
      const block = this.level.blocks.find((b) => b.id === saved.id);
      if (!block) continue;
      block.pos = { x: saved.x, y: saved.y };
      block.exited = saved.exited;
    }
    this.moves = snapshot.moves;
  }

  /** The playable block under a grid cell, if any. */
  blockAt(cell: Cell): number | null {
    for (const block of this.level.blocks) {
      if (block.exited || block.kind === 'crate') continue;
      if (blockCells(block).some((c) => c.x === cell.x && c.y === cell.y)) return block.id;
    }
    return null;
  }

  reachIn(blockId: number, dir: Dir): { distance: number; exits: boolean } {
    const block = this.level.blocks.find((b) => b.id === blockId);
    if (!block) return { distance: 0, exits: false };
    return maxSlide(this.level, block, dir);
  }

  /** Records the position a drag started from, so one gesture is one move. */
  beginGesture(): void {
    this.history.push(this.snapshot());
  }

  /**
   * Steps a block during a drag. Returns whether the board actually changed,
   * so the caller can keep the visual offset honest when a block is jammed.
   */
  step(blockId: number, dir: Dir, distance = 1): boolean {
    return applyMove(this.level, { blockId, dir, distance }).ok;
  }

  /**
   * Closes a drag. A gesture that moved nothing is discarded rather than
   * counted, so an accidental tap never costs the player a move.
   */
  endGesture(): boolean {
    const previous = this.history[this.history.length - 1];
    if (!previous) return false;

    const unchanged = previous.positions.every((saved) => {
      const block = this.level.blocks.find((b) => b.id === saved.id);
      return block && block.pos.x === saved.x && block.pos.y === saved.y && block.exited === saved.exited;
    });

    if (unchanged) {
      this.history.pop();
      return false;
    }

    this.moves++;
    return true;
  }

  /** Free and unlimited, by design. */
  undo(): boolean {
    const snapshot = this.history.pop();
    if (!snapshot) return false;
    this.restore(snapshot);
    return true;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  restart(): void {
    this.level = cloneLevel(this.source);
    this.moves = 0;
    this.history = [];
  }

  isComplete(): boolean {
    return isSolved(this.level);
  }

  remaining(): number {
    return remainingBlocks(this.level);
  }

  get par(): number {
    return this.source.minMoves;
  }

  /**
   * Three stars for matching par, two for getting close, one for finishing.
   * Finishing always earns something; the rating never blocks progress.
   */
  stars(): number {
    if (this.moves <= this.par) return 3;
    if (this.moves <= this.par + Math.max(2, Math.ceil(this.par * 0.4))) return 2;
    return 1;
  }

  /**
   * Next move on a shortest path. Tries the solution shipped with the level
   * first - instant while the player is on the intended line - and falls back
   * to a live search when they have gone their own way.
   */
  hint(): HintOutcome {
    if (this.isComplete()) return { kind: 'already-solved' };

    const shipped = this.source.solution;
    if (shipped && shipped.length > 0) {
      const replay = cloneLevel(this.source);
      const current = encodeState(this.level);
      for (let i = 0; i < shipped.length; i++) {
        if (encodeState(replay) === current) return { kind: 'move', move: shipped[i] };
        if (!applyMove(replay, shipped[i]).ok) break;
      }
    }

    const result = solve(this.level, { maxStates: 80_000 });
    if (result.solved && result.solution.length > 0) return { kind: 'move', move: result.solution[0] };
    return { kind: 'unavailable' };
  }
}
