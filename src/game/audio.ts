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

/* ------------------------------------------------------------------ music */

/*
 * A small, bouncy loop in C major: a plucked marimba-like tune over an
 * oom-pah bass, the way most casual puzzle games sound. Two eight-bar phrases
 * play A A B A (about 80 seconds) before the loop comes round. Everything is
 * plucked, so nothing holds a note long enough to hum.
 */

const BPM = 100;
const EIGHTH = 60 / BPM / 2;
const MUSIC_VOLUME = 0.05;

/** Bass note and chord tones, per half bar. */
const CHORDS: Record<string, { bass: string; tones: string[] }> = {
  C: { bass: 'C3', tones: ['C4', 'E4', 'G4'] },
  G: { bass: 'G2', tones: ['B3', 'D4', 'G4'] },
  Am: { bass: 'A2', tones: ['A3', 'C4', 'E4'] },
  F: { bass: 'F2', tones: ['A3', 'C4', 'F4'] },
};

interface Bar {
  /** Chord for the first and second half of the bar. */
  chords: [string, string];
  /** Eight eighth notes; '-' is a rest. */
  tune: string;
}

const PHRASE_A: Bar[] = [
  { chords: ['C', 'C'], tune: 'E5 - G5 - A5 G5 E5 -' },
  { chords: ['G', 'G'], tune: 'D5 - E5 - G5 - D5 -' },
  { chords: ['Am', 'Am'], tune: 'C5 - E5 - A5 - G5 E5' },
  { chords: ['F', 'F'], tune: 'A4 - C5 - D5 - C5 -' },
  { chords: ['C', 'C'], tune: 'E5 - G5 - C6 - A5 G5' },
  { chords: ['G', 'G'], tune: 'G5 - E5 - D5 - B4 -' },
  { chords: ['F', 'G'], tune: 'A4 C5 F5 - D5 - G5 -' },
  { chords: ['C', 'C'], tune: 'C5 - - - - - - -' },
];

const PHRASE_B: Bar[] = [
  { chords: ['Am', 'Am'], tune: 'A4 - C5 - E5 - C5 -' },
  { chords: ['F', 'F'], tune: 'A4 - C5 - F5 - E5 -' },
  { chords: ['C', 'C'], tune: 'G4 - C5 - E5 - G5 -' },
  { chords: ['G', 'G'], tune: 'D5 - - - B4 - D5 -' },
  { chords: ['Am', 'Am'], tune: 'E5 - A5 - G5 E5 C5 -' },
  { chords: ['F', 'F'], tune: 'F5 - E5 - C5 - A4 -' },
  { chords: ['G', 'G'], tune: 'B4 - D5 - G5 - D5 -' },
  { chords: ['G', 'G'], tune: 'D5 - - - - - - -' },
];

const SONG: Bar[] = [...PHRASE_A, ...PHRASE_A, ...PHRASE_B, ...PHRASE_A];

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFrequency(name: string): number {
  const midi = 12 * (Number(name.slice(1)) + 1) + NOTE_OFFSETS[name[0]];
  return 440 * 2 ** ((midi - 69) / 12);
}

let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;
let songStep = 0;

/** One plucked note: a quick attack and a soft decay, with a faint bell on top. */
function pluck(ctx: AudioContext, frequency: number, at: number, length: number, volume: number, bell: boolean): void {
  if (!musicGain) return;
  const voices: Array<[number, OscillatorType, number]> = [[frequency, 'triangle', volume]];
  if (bell) voices.push([frequency * 4, 'sine', volume * 0.12]);
  for (const [f, type, v] of voices) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(v, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + (type === 'sine' ? length * 0.4 : length));
    osc.connect(gain).connect(musicGain);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

function playStep(ctx: AudioContext, step: number, at: number): void {
  const bar = SONG[Math.floor(step / 8)];
  const i = step % 8;
  const chord = CHORDS[bar.chords[i < 4 ? 0 : 1]];

  const note = bar.tune.split(' ')[i];
  if (note && note !== '-') pluck(ctx, noteFrequency(note), at, 0.45, 0.9, true);

  // Oom on the beat, pah on the off-beat.
  if (i === 0 || i === 4) pluck(ctx, noteFrequency(chord.bass), at, 0.35, 0.8, false);
  if (i === 2 || i === 6) for (const tone of chord.tones) pluck(ctx, noteFrequency(tone), at, 0.2, 0.22, false);
}

function scheduleMusic(): void {
  const ctx = context;
  if (!ctx || !musicOn) return;
  // Never try to catch up on notes missed while the app was away.
  if (nextNoteTime < ctx.currentTime) nextNoteTime = ctx.currentTime + 0.05;
  while (nextNoteTime < ctx.currentTime + 0.3) {
    playStep(ctx, songStep, nextNoteTime);
    nextNoteTime += EIGHTH;
    songStep = (songStep + 1) % (SONG.length * 8);
  }
}

/**
 * The only place music ever starts or stops. Called from the settings toggle
 * and from nothing else. The scheduler below only runs while it is on.
 */
export function setMusicEnabled(enabled: boolean): void {
  musicOn = enabled;

  if (!enabled) {
    if (musicTimer !== null) clearInterval(musicTimer);
    musicTimer = null;
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

  if (musicTimer !== null) return;
  const ctx = ensureContext();
  if (!ctx) return;

  musicGain = ctx.createGain();
  musicGain.gain.value = MUSIC_VOLUME;
  musicGain.connect(ctx.destination);
  songStep = 0;
  nextNoteTime = ctx.currentTime + 0.1;
  scheduleMusic();
  musicTimer = setInterval(scheduleMusic, 100);
}

// Silence everything while the app is in the background, and pick the tune
// back up where it was when the player returns.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.visibilityState === 'hidden') void context.suspend();
    else void context.resume();
  });
}

export function isMusicEnabled(): boolean {
  return musicOn;
}

/** Called on the first user gesture, since browsers block audio before one. */
export function unlockAudio(): void {
  ensureContext();
}
