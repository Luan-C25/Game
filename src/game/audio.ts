/**
 * Sound.
 *
 * Everything is synthesised, so the build ships no audio files. Music and
 * effects are each controlled by exactly one switch and there is no timer,
 * retry, or resume path that can start audio on its own - a reported bug in
 * the game this answers is music that restarts a minute in and then ignores
 * the setting.
 */

let context: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicNodes: OscillatorNode[] = [];
let soundOn = true;
let musicOn = false;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function blip(frequency: number, durationMs: number, type: OscillatorType, volume: number): void {
  if (!soundOn) return;
  const ctx = ensureContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;

  const now = ctx.currentTime;
  const seconds = durationMs / 1000;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

export const sfx = {
  pick: () => blip(420, 70, 'sine', 0.07),
  slide: () => blip(300, 55, 'triangle', 0.05),
  blocked: () => blip(150, 90, 'sawtooth', 0.03),
  exit: () => {
    blip(620, 110, 'sine', 0.09);
    setTimeout(() => blip(880, 130, 'sine', 0.07), 60);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 200, 'sine', 0.08), i * 90));
  },
  tap: () => blip(500, 40, 'sine', 0.05),
};

export function setSoundEnabled(enabled: boolean): void {
  soundOn = enabled;
}

/**
 * The only place music ever starts or stops. Called from the settings toggle
 * and from nothing else.
 */
export function setMusicEnabled(enabled: boolean): void {
  musicOn = enabled;

  if (!enabled) {
    for (const node of musicNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    musicNodes = [];
    if (musicGain) {
      try {
        musicGain.disconnect();
      } catch {
        /* already detached */
      }
      musicGain = null;
    }
    return;
  }

  if (musicNodes.length > 0) return;
  const ctx = ensureContext();
  if (!ctx) return;

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.018;
  musicGain.connect(ctx.destination);

  // A quiet, slowly beating chord. No melody to get stuck in anyone's head.
  for (const frequency of [130.81, 196.0, 261.63]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(musicGain);
    osc.start();
    musicNodes.push(osc);
  }
}

export function isMusicEnabled(): boolean {
  return musicOn;
}

/** Called on the first user gesture, since browsers block audio before one. */
export function unlockAudio(): void {
  ensureContext();
}
