/**
 * Drag handling.
 *
 * "Blocks are jerky", "blocks get stuck", and "the block didn't move when I
 * told it to" are among the most repeated complaints about this genre, so the
 * controller is built to be predictable above all: the block follows the
 * finger continuously, one gesture is always exactly one move, and a gesture
 * that changes nothing is discarded rather than counted.
 */

import type { Dir } from '../engine/types.ts';
import type { Session } from './session.ts';
import type { Viewport } from './render.ts';

/** Pixels of travel before a drag commits to an axis. */
const AXIS_LOCK_PX = 5;
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
  onBlockExited(): void;
  onBlocked(): void;
  onPickUp(): void;
}

export class DragController {
  private pointerId: number | null = null;
  private blockId: number | null = null;
  private axis: 'x' | 'y' | null = null;
  private startClientX = 0;
  private startClientY = 0;
  private startCellX = 0;
  private startCellY = 0;
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
    this.pointerId = null;
    this.blockId = null;
    this.axis = null;
    this.visual = null;
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
    if (this.pointerId !== null) return;
    const session = this.getSession();
    if (session.isComplete()) return;

    const cell = this.toCell(event);
    const blockId = session.blockAt(cell);
    if (blockId === null) return;

    this.pointerId = event.pointerId;
    this.blockId = blockId;
    this.axis = null;
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

    const session = this.getSession();
    const vp = this.getViewport();
    const dx = event.clientX - this.startClientX;
    const dy = event.clientY - this.startClientY;

    if (this.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
      this.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      session.beginGesture();
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
      if (!session.step(this.blockId, dir, 1)) {
        jammed = true;
        this.callbacks.onBlocked();
        break;
      }
      current += forward ? 1 : -1;

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
    if (event.pointerId !== this.pointerId) return;
    this.finishGesture();
    this.callbacks.onChange();
  };
}
