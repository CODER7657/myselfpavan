"use client";

/**
 * Event cues.
 *
 * Synthesised rather than loaded: five short tones cost nothing to ship, and a
 * portfolio that downloads audio files to say "achievement" has its priorities
 * wrong. Everything here is a triangle wave through a fast envelope and a
 * gentle low-pass — closer to a struck glass than an arcade blip.
 *
 * Three rules the design follows:
 *   - Quiet. The loudest cue peaks at 0.06 gain.
 *   - Short. Nothing rings longer than 500ms.
 *   - Silent until invited. Browsers block audio before a gesture anyway, so
 *     the context is only created once the visitor has interacted.
 */

type Cue = "recruit" | "mission" | "achievement" | "level" | "flip" | "error";

/** Intervals, not melodies. A cue should register without demanding attention. */
const CUES: Record<Cue, { notes: number[]; gain: number; dur: number; type: OscillatorType }> = {
  // A rising fourth — something joined the roster.
  recruit: { notes: [523.25, 698.46], gain: 0.05, dur: 0.16, type: "triangle" },
  // A settled major third, landing down: work finished.
  mission: { notes: [659.25, 523.25, 783.99], gain: 0.055, dur: 0.2, type: "triangle" },
  // Brighter, an octave apart — the only cue that should feel like a reward.
  achievement: { notes: [783.99, 1046.5], gain: 0.06, dur: 0.22, type: "sine" },
  // Three steps up. Rare enough to be a little more expansive.
  level: { notes: [523.25, 659.25, 783.99, 1046.5], gain: 0.055, dur: 0.15, type: "sine" },
  // Barely there. A card turning is not an event, just a texture.
  flip: { notes: [880], gain: 0.022, dur: 0.07, type: "sine" },
  // Down a semitone. Wrong, without being shrill about it.
  error: { notes: [329.63, 311.13], gain: 0.045, dur: 0.14, type: "triangle" },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;

    // One shared low-pass takes the edge off every cue at once.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    tone.Q.value = 0.6;

    master.connect(tone);
    tone.connect(ctx.destination);
  }

  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/**
 * Arms the audio context on the first real gesture.
 *
 * Autoplay policy means a cue fired before any interaction is silently
 * dropped, so there is no point creating the context earlier.
 */
export function armSound(): void {
  if (unlocked || typeof window === "undefined") return;

  const arm = () => {
    unlocked = true;
    ensure();
    window.removeEventListener("pointerdown", arm);
    window.removeEventListener("keydown", arm);
  };

  window.addEventListener("pointerdown", arm, { once: true, passive: true });
  window.addEventListener("keydown", arm, { once: true });
}

/** Plays one cue. A no-op before the first gesture, or when muted. */
export function play(cue: Cue, muted = false): void {
  if (muted || !unlocked) return;

  const audio = ensure();
  if (!audio || !master) return;

  const spec = CUES[cue];
  const now = audio.currentTime;

  spec.notes.forEach((freq, i) => {
    const at = now + i * spec.dur * 0.62;

    const osc = audio.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(freq, at);

    const env = audio.createGain();
    // A 12ms attack is enough to avoid a click without sounding soft.
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(spec.gain, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + spec.dur);

    osc.connect(env);
    env.connect(master!);

    osc.start(at);
    osc.stop(at + spec.dur + 0.02);
  });
}

export type { Cue };
