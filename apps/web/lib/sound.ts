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

type Cue = "recruit" | "mission" | "achievement" | "level" | "flip" | "error" | "tap";

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

  /*
   * Every button, so it has to be nearly nothing: one short sine an octave
   * above the flip cue, at a third of its gain. A cue you notice on the
   * fortieth click is a cue that has to go.
   */
  tap: { notes: [1174.66], gain: 0.016, dur: 0.045, type: "sine" },
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
/**
 * Marks the context as usable. Only legitimate from inside a real gesture,
 * which is the only time a browser will let audio start.
 */
export function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  ensure();
}

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

/* ── the button click ───────────────────────────────────────────── */

/**
 * A recorded click, in place of the synthesised tap.
 *
 * Measured: 1.107 s long, peaking at -4 dB 29 ms in, with the body gone by
 * 0.22 s and the tail inaudible past 0.45 s. Two-thirds of the file is
 * silence, so only the front is played -- otherwise every press holds a
 * source open for a second for no reason.
 *
 * It bypasses the low-pass the other cues share. That filter exists to take
 * the edge off a struck tone; run a click through it and the click is the
 * part it removes.
 */
const CLICK_SRC = "/audio/click.wav";
const CLICK_LENGTH = 0.42;
/** Deliberately forward of the other cues: this one is meant to be felt. */
const CLICK_GAIN = 0.34;

let click: AudioBuffer | null = null;
let clickLoading = false;

function loadClick(audio: AudioContext): void {
  if (click || clickLoading) return;
  clickLoading = true;

  void fetch(CLICK_SRC, { cache: "force-cache" })
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((raw) => audio.decodeAudioData(raw))
    .then((buf) => {
      click = buf;
    })
    .catch(() => {
      /* The synthesised tap stays as the fallback; a missing file is not worth
         a broken page. */
    })
    .finally(() => {
      clickLoading = false;
    });
}

/** The click, or the synthesised tap while the sample is still loading. */
function playClick(muted: boolean): void {
  if (muted || !unlocked) return;

  const audio = ensure();
  if (!audio) return;

  loadClick(audio);

  if (!click) {
    play("tap", muted);
    return;
  }

  const now = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = click;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(CLICK_GAIN, now);
  /* Cut on a ramp rather than mid-waveform, which would add a click of its
     own to the end of the click. */
  gain.gain.setValueAtTime(CLICK_GAIN, now + CLICK_LENGTH - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + CLICK_LENGTH);

  src.connect(gain);
  gain.connect(audio.destination);
  src.start(now, 0, CLICK_LENGTH);
  src.stop(now + CLICK_LENGTH + 0.02);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

/**
 * A cue on every button, from one listener rather than forty call sites.
 *
 * Delegated on the document so it covers anything the page renders later,
 * and fired on pointerdown rather than click: a sound that arrives on release
 * feels like a delay, and the same press is what unlocks the audio context in
 * the first place.
 *
 * Anything that already has its own voice opts out with data-cue="none", so
 * a card flip does not tap and click at once.
 */
export function armTaps(muted: () => boolean): () => void {
  const onDown = (e: PointerEvent) => {
    const el = e.target as Element | null;
    const hit = el?.closest?.(
      'button, [role="button"], a[href], summary, input[type="checkbox"], input[type="radio"]'
    );
    if (!hit) return;
    if (hit.closest('[data-cue="none"]')) return;
    if (hit.getAttribute("aria-disabled") === "true") return;
    if ((hit as HTMLButtonElement).disabled) return;

    /* This handler sits on the document and therefore runs before the window
       listener that arms the context — so without this the very first press
       on the page is silent, which reads as the feature being broken. */
    unlock();
    playClick(muted());
  };

  document.addEventListener("pointerdown", onDown, { passive: true });
  return () => document.removeEventListener("pointerdown", onDown);
}

export type { Cue };
