/**
 * Drag handling.
 *
 * "Blocks are jerky", "blocks get stuck", and "the block didn't move when I
 * told it to" are among the most repeated complaints about this genre, so the
 * controller is built to be predictable above all: the block follows the
 * finger continuously, one gesture is always exactly one move, and a gesture
 * that changes nothing is discarded rather than counted.
 *
 * Flicks: a block released at speed, whose lane runs clear to a gate of its
 * own colour in that direction, finishes the slide out by itself. Anywhere
 * else a release leaves the block where the finger put it. A flick never
 * makes a move the player could not have dragged, and taking a block off the
 * board only ever frees space, so no level can become unsolvable through it.
 *
 * Until the block has moved a cell, the axis follows whichever way the finger
 * has gone furthest, so a fast swipe that starts slightly off line is not
 * locked onto the wrong axis by its first few pixels.
 */

import type { Dir } from '../engine/types.ts';
import type { Session } from './session.ts';
import type { Viewport } from './render.ts';

/** Pixels of travel before a drag commits to an axis. */
const AXIS_LOCK_PX = 5;
/**
 * Release speed, in CSS px per ms, that counts as a flick (about 450 px/s).
 * Measured on the owner's phone over 58 gestures: deliberate drags released
 * at 0.24 or less, flicks at 0.57 to 2.13, so this sits in the gap.
 */
const FLICK_SPEED = 0.45;
/**
 * Travel a flick needs before it counts. In the same session two short
 * nudges of about 15 px released at 0.33 and 0.44, just under the speed.
 */
const FLICK_MIN_TRAVEL_PX = 20;
/** How far back the release speed is measured. */
const FLICK_WINDOW_MS = 90;
/** Duration of the flick's slide out, per cell and at most. */
const FLICK_MS_PER_CELL = 32;
const FLICK_MAX_MS = 170;
/** How far a block may visually lead the grid while a drag is in flight. */
const LEAD_FRACTION = 0.42;
/** How much of that lead survives when the block is up against something. */
const RUBBER_BAND = 0.22;

export interface DragVisualState {
  blockId: number;
  offsetX: number;
  offsetY: number;
}

export interface InputCallbacks {
  onChange(): void;
  /** Fires while the block is still on the board, so effects can use its position. */
  onBeforeExit(blockId: number): void;
  onBlockExited(): void;
  onBlocked(): void;
  onPickUp(): void;
  /** The game's own reduce-motion setting: a flick then lands at once. */
  reduceMotion(): boolean;
}

export class DragController {
  private pointerId: number | null = null;
  private blockId: number | null = null;
  private axis: 'x' | 'y' | null = null;
  private startClientX = 0;
  private startClientY = 0;
  private startCellX = 0;
  private startCellY = 0;
  /** Whether the block has moved a cell in this gesture; the axis is fixed from then on. */
  private stepped = false;
  /** Recent pointer positions, for the release speed. */
  private samples: { t: number; x: number; y: number }[] = [];
  /** The frame request of a flick in progress. */
  private flickFrame = 0;
  visual: DragVisualState | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getSession: () => Session,
    private readonly getViewport: () => Viewport,
    private readonly callbacks: InputCallbacks,
  ) {}

  attach(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  detach(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }

  cancel(): void {
    if (this.flickFrame) cancelAnimationFrame(this.flickFrame);
    this.flickFrame = 0;
    this.pointerId = null;
    this.blockId = null;
    this.axis = null;
    this.stepped = false;
    this.samples = [];
    this.visual = null;
  }

  private sample(event: PointerEvent): void {
    this.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    if (this.samples.length > 12) this.samples.shift();
  }

  /** Speed along the locked axis at release, in px per ms; signed. */
  private releaseSpeed(): number {
    if (this.axis === null || this.samples.length < 2) return 0;
    const last = this.samples[this.samples.length - 1];
    // The oldest sample inside the window; if that leaves too little time to
    // measure (a finger resting, then one burst of travel), reach back one more.
    let i = this.samples.findIndex((s) => s.t >= last.t - FLICK_WINDOW_MS);
    if (i > 0 && last.t - this.samples[i].t < 8) i--;
    const first = this.samples[Math.max(0, i)];
    const dt = Math.max(1, last.t - first.t);
    const along = this.axis === 'x' ? last.x - first.x : last.y - first.y;
    return along / dt;
  }

  private toCell(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const vp = this.getViewport();
    return {
      x: Math.floor((event.clientX - rect.left - vp.originX) / vp.cell),
      y: Math.floor((event.clientY - rect.top - vp.originY) / vp.cell),
    };
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.pointerId !== null || this.flickFrame) return;
    const session = this.getSession();
    if (session.isComplete()) return;

    const cell = this.toCell(event);
    const blockId = session.blockAt(cell);
    if (blockId === null) return;

    this.pointerId = event.pointerId;
    this.blockId = blockId;
    this.axis = null;
    this.stepped = false;
    this.samples = [];
    this.sample(event);
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;

    const block = session.level.blocks.find((b) => b.id === blockId)!;
    this.startCellX = block.pos.x;
    this.startCellY = block.pos.y;
    this.visual = { blockId, offsetX: 0, offsetY: 0 };

    // Capture so the drag survives the finger leaving the canvas.
    this.canvas.setPointerCapture(event.pointerId);
    this.callbacks.onPickUp();
    this.callbacks.onChange();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.blockId === null) return;
    event.preventDefault();
    if (this.flickFrame) return;
    this.sample(event);

    const session = this.getSession();
    const vp = this.getViewport();
    const dx = event.clientX - this.startClientX;
    const dy = event.clientY - this.startClientY;

    if (this.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      session.beginGesture();
    } else if (!this.stepped) {
      // Nothing has moved yet, so following the finger costs nothing.
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    const along = this.axis === 'x' ? dx : dy;
    const startCell = this.axis === 'x' ? this.startCellX : this.startCellY;
    const travelled = along / vp.cell;
    const wanted = Math.round(travelled);

    const block = session.level.blocks.find((b) => b.id === this.blockId);
    if (!block || block.exited) return;

    let current = (this.axis === 'x' ? block.pos.x : block.pos.y) - startCell;
    let jammed = false;

    // Advance one cell at a time so every intermediate position is a legal
    // board state; nothing can ever end up between cells.
    while (current !== wanted) {
      const forward = wanted > current;
      const dir: Dir = this.axis === 'x' ? (forward ? 'right' : 'left') : forward ? 'down' : 'up';
      // Only when this very step takes it off the board - reach.exits alone
      // is true from several cells away.
      const reach = session.reachIn(this.blockId, dir);
      if (reach.exits && reach.distance === 1) this.callbacks.onBeforeExit(this.blockId);
      if (!session.step(this.blockId, dir, 1)) {
        jammed = true;
        this.callbacks.onBlocked();
        break;
      }
      current += forward ? 1 : -1;
      this.stepped = true;

      const moved = session.level.blocks.find((b) => b.id === this.blockId);
      if (!moved || moved.exited) {
        this.finishGesture();
        this.callbacks.onBlockExited();
        this.callbacks.onChange();
        return;
      }
    }

    const lead = (travelled - current) * vp.cell;
    const limit = vp.cell * LEAD_FRACTION;
    const clamped = Math.max(-limit, Math.min(limit, lead));
    const offset = jammed ? clamped * RUBBER_BAND : clamped;

    this.visual = {
      blockId: this.blockId,
      offsetX: this.axis === 'x' ? offset : 0,
      offsetY: this.axis === 'y' ? offset : 0,
    };
    this.callbacks.onChange();
  };

  private finishGesture(): void {
    if (this.axis !== null) this.getSession().endGesture();
    if (this.pointerId !== null && this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }
    this.cancel();
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.flickFrame) return;
    if (event.type === 'pointerup') {
      this.sample(event);
      if (this.tryFlick()) return;
    }
    this.finishGesture();
    this.callbacks.onChange();
  };

  /**
   * Starts a flick if the release was fast and the lane ahead runs clear to
   * a matching gate. Returns false, changing nothing, otherwise.
   */
  private tryFlick(): boolean {
    const blockId = this.blockId;
    const axis = this.axis;
    if (blockId === null || axis === null) return false;

    const speed = this.releaseSpeed();
    if (Math.abs(speed) < FLICK_SPEED) return false;
    const last = this.samples[this.samples.length - 1];
    const travel = axis === 'x' ? last.x - this.startClientX : last.y - this.startClientY;
    if (Math.abs(travel) < FLICK_MIN_TRAVEL_PX) return false;

    const dir: Dir = axis === 'x' ? (speed > 0 ? 'right' : 'left') : speed > 0 ? 'down' : 'up';
    const session = this.getSession();
    const reach = session.reachIn(blockId, dir);
    if (!reach.exits) return false;

    // The pointer is done; release it now so the next touch is not lost.
    if (this.pointerId !== null && this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }
    this.pointerId = null;

    const sign = dir === 'right' || dir === 'down' ? 1 : -1;
    const cell = this.getViewport().cell;
    const from = this.visual ? (axis === 'x' ? this.visual.offsetX : this.visual.offsetY) : 0;
    const to = sign * reach.distance * cell;
    const duration = Math.min(FLICK_MAX_MS, reach.distance * FLICK_MS_PER_CELL);
    const land = (): void => {
      this.flickFrame = 0;
      // Up to the gate first, so the exit burst starts where a dragged exit's would.
      if (reach.distance > 1) session.step(blockId, dir, reach.distance - 1);
      this.callbacks.onBeforeExit(blockId);
      const exited = session.step(blockId, dir, 1);
      this.finishGesture();
      if (exited) this.callbacks.onBlockExited();
      this.callbacks.onChange();
    };

    if (this.callbacks.reduceMotion() || duration <= 0) {
      land();
      return true;
    }

    let startedAt = 0;
    const frame = (now: number): void => {
      if (!startedAt) startedAt = now;
      const t = Math.min(1, Math.max(0, (now - startedAt) / duration));
      // Ease out: quick off the finger, settling into the gate.
      const eased = 1 - (1 - t) * (1 - t);
      const offset = from + (to - from) * eased;
      this.visual = {
        blockId,
        offsetX: axis === 'x' ? offset : 0,
        offsetY: axis === 'y' ? offset : 0,
      };
      this.callbacks.onChange();
      if (t < 1) this.flickFrame = requestAnimationFrame(frame);
      else land();
    };
    this.flickFrame = requestAnimationFrame(frame);
    return true;
  }
}
