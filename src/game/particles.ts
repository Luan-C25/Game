/**
 * A small particle system for the moments worth celebrating: a block leaving
 * the board, and a level being finished. Deliberately tiny - a fixed pool, no
 * allocation per frame once warm, and it goes completely quiet when the
 * "reduce motion" setting is on.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colour: string;
  spin: number;
  angle: number;
  /** Confetti draws as a rotating rectangle; sparks draw as circles. */
  confetti: boolean;
}

const GRAVITY = 900;
const MAX_PARTICLES = 260;

export class Particles {
  private items: Particle[] = [];

  get count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  /** A burst of sparks thrown outwards, biased along the exit direction. */
  burst(x: number, y: number, colour: string, dirX: number, dirY: number): void {
    const count = Math.min(16, MAX_PARTICLES - this.items.length);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 90 + Math.random() * 170;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * speed + dirX * 240,
        vy: Math.sin(angle) * speed + dirY * 240,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        size: 3 + Math.random() * 4,
        colour,
        spin: 0,
        angle: 0,
        confetti: false,
      });
    }
  }

  /** Confetti rained across the top of the screen on a win. */
  celebrate(width: number, colours: string[]): void {
    const count = Math.min(90, MAX_PARTICLES - this.items.length);
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: Math.random() * width,
        y: -20 - Math.random() * 220,
        vx: (Math.random() - 0.5) * 130,
        vy: 120 + Math.random() * 220,
        life: 0,
        maxLife: 1.7 + Math.random() * 1.1,
        size: 5 + Math.random() * 6,
        colour: colours[i % colours.length],
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI,
        confetti: true,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Swap-and-pop: order does not matter and this avoids a reshuffle.
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
        continue;
      }
      p.vy += GRAVITY * dt * (p.confetti ? 0.28 : 1);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (!p.confetti) {
        p.vx *= 1 - 2.4 * dt;
        p.vy *= 1 - 2.4 * dt;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const fade = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = p.colour;

      if (p.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
