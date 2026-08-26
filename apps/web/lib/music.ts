"use client";

/**
 * The background track, looped without a seam.
 *
 * The supplied file is not a loop and could not be played as one. Measured
 * from the decoded waveform in 100 ms windows, it is three separate phrases
 * with silence between them:
 *
 *     0.0  - 0.6    silence
 *     0.6  - 6.9    music
 *     6.9  - 8.1    fades to -87 dB, then hard-restarts
 *     8.1  - 13.7   music
 *     13.7 - 14.7   silence
 *     14.7 - 26.1   music
 *     26.1 - 27.7   fade-out, then 912 ms of silence
 *
 * Played on `loop` that is a second and a half of silence every twenty-six
 * seconds and half a second more twice in between. Playing only the longest
 * phrase avoids the holes and buys an eleven-second loop, which repeats some
 * three hundred and eighty times an hour — not background music, a nagging.
 *
 * So the phrases are stitched: each laid over the last through a short
 * equal-power crossfade, the silences removed rather than played, giving
 * about twenty-two seconds of continuous music that loops properly. Rendered
 * once, offline, on the first play.
 *
 * None of this is specific to this file. The buffer is measured on decode, so
 * a track built for looping is simply found to be one phrase and looped as it
 * stands; anything with too little music to bear repeating is played once and
 * then stopped. Scheduling runs on the AudioContext clock rather than timers,
 * which drift when the main thread is busy.
 */
const SRC = "/audio/calm.mp3";

/* How the measurement is taken, and what counts as silence. */
const WINDOW_S = 0.1;
const FLOOR_DB = -45;
/** Less music than this in total, and the track is played once, not looped. */
const MIN_LOOP_S = 20;
/* Shorter than this is a stray note, not a phrase worth keeping. */
const MIN_PHRASE_S = 2;
/* The overlap where one phrase becomes the next. */
const JOIN_S = 0.35;
const CROSSFADE = 2.0;

interface Plan {
  start: number;
  end: number;
  loop: boolean;
}

let plan: Plan | null = null;

/** Where the audible part of a buffer begins and ends. */
function edge(buf: AudioBuffer, backwards: boolean): number {
  const ch = buf.getChannelData(0);
  const threshold = 0.002;

  if (backwards) {
    for (let i = ch.length - 1; i >= 0; i--) {
      if (Math.abs(ch[i]!) > threshold) return i / buf.sampleRate;
    }
    return buf.duration;
  }

  for (let i = 0; i < ch.length; i++) {
    if (Math.abs(ch[i]!) > threshold) return i / buf.sampleRate;
  }
  return 0;
}

const firstSound = (b: AudioBuffer) => edge(b, false);
const lastSound = (b: AudioBuffer) => edge(b, true);

/** Every stretch of the buffer that stays above the floor, in order. */
function phrasesOf(buf: AudioBuffer): { from: number; to: number }[] {
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const windows = Math.floor(buf.duration / WINDOW_S);
  const floor = Math.pow(10, FLOOR_DB / 20);

  const found: { from: number; to: number }[] = [];
  let from: number | null = null;

  const close = (at: number) => {
    if (from === null) return;
    if (at - from >= MIN_PHRASE_S) found.push({ from, to: at });
    from = null;
  };

  for (let i = 0; i < windows; i++) {
    let sum = 0;
    const lo = (i * WINDOW_S * sr) | 0;
    const hi = Math.min(ch.length, ((i + 1) * WINDOW_S * sr) | 0);
    for (let j = lo; j < hi; j++) sum += ch[j]! * ch[j]!;

    if (Math.sqrt(sum / Math.max(1, hi - lo)) >= floor) {
      if (from === null) from = i * WINDOW_S;
    } else {
      close(i * WINDOW_S);
    }
  }
  close(windows * WINDOW_S);

  return found;
}

/**
 * Joins the phrases into one continuous piece.
 *
 * The supplied file is not a performance with a couple of rests in it; it is
 * three separate phrases with silence between them, and the longest single
 * one is 11.4 s. Looping that is a fragment repeating every nine seconds.
 *
 * Stitched instead: each phrase is laid down overlapping the last by a short
 * equal-power crossfade, so the silences are removed rather than played. The
 * three phrases become about 22 s of unbroken music, which loops properly.
 *
 * Rendered once, offline, on the first play — not per pass.
 */
async function stitch(buf: AudioBuffer, phrases: { from: number; to: number }[]) {
  const sr = buf.sampleRate;
  const join = Math.min(JOIN_S, ...phrases.map((p) => (p.to - p.from) / 3));

  const total = phrases.reduce((sum, p) => sum + (p.to - p.from), 0) - join * (phrases.length - 1);

  const off = new OfflineAudioContext(
    buf.numberOfChannels,
    Math.ceil(total * sr),
    sr
  );

  let at = 0;
  phrases.forEach((phrase, i) => {
    const span = phrase.to - phrase.from;
    const src = off.createBufferSource();
    src.buffer = buf;

    const gain = off.createGain();
    gain.gain.setValueAtTime(i === 0 ? 1 : 0, at);
    /* Every join is crossfaded; the outer edges are left alone, because the
       loop's own crossfade handles those. */
    if (i > 0) gain.gain.setValueCurveAtTime(FADE_IN, at, join);
    if (i < phrases.length - 1) {
      gain.gain.setValueAtTime(1, at + span - join);
      gain.gain.setValueCurveAtTime(FADE_OUT, at + span - join, join);
    }

    src.connect(gain);
    gain.connect(off.destination);
    src.start(at, phrase.from, span);

    at += span - join;
  });

  return off.startRendering();
}
/**
 * Equal-power crossfade curves.
 *
 * The first attempt used exponentialRampToValueAtTime from a 0.0001 floor,
 * which sounds like nothing for most of its length: such a ramp is still only
 * at 6e-4 a fifth of the way through. Rendered offline, the seam dipped to
 * -56 dB against a body of -33 -- an audible hole exactly where the crossfade
 * was meant to be. Sine and cosine sum to constant power, so the pair holds
 * the level flat across the overlap.
 */
const CURVE_STEPS = 128;
const FADE_IN = new Float32Array(CURVE_STEPS);
const FADE_OUT = new Float32Array(CURVE_STEPS);
for (let i = 0; i < CURVE_STEPS; i++) {
  const x = i / (CURVE_STEPS - 1);
  FADE_IN[i] = Math.sin((x * Math.PI) / 2);
  FADE_OUT[i] = Math.cos((x * Math.PI) / 2);
}

/** Background, not foreground. The cues in sound.ts peak at 0.06. */
const VOLUME = 0.16;
/** How far ahead the next pass is queued. */
const LOOKAHEAD_S = 1.0;
const TICK_MS = 250;
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;

let timer: ReturnType<typeof setInterval> | null = null;
let nextStartAt = 0;
let playing = false;
let finished: (() => void) | null = null;
const live = new Set<AudioBufferSourceNode>();

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
  }

  return ctx;
}

/** Fetched once, decoded once, and only when somebody actually asks for it. */
async function load(): Promise<AudioBuffer | null> {
  if (buffer) return buffer;
  if (loading) return loading;

  loading = (async () => {
    const c = context();
    if (!c) return null;

    try {
      const res = await fetch(SRC, { cache: "force-cache" });
      if (!res.ok) return null;
      buffer = await c.decodeAudioData(await res.arrayBuffer());
      return buffer;
    } catch {
      /* No music is a perfectly acceptable outcome. */
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/**
 * Queues one pass, fading it in across the tail of the pass before it.
 *
 * The two curves are sine and cosine, so the overlap holds constant power
 * rather than dipping through the middle of the crossfade.
 */
function schedulePass(at: number): void {
  const c = ctx;
  if (!c || !buffer || !out || !plan) return;

  const span = plan.end - plan.start;
  /* A crossfade longer than a quarter of the region would never reach full
     level, so it is bounded by the region rather than assumed. */
  const fade = plan.loop ? Math.min(CROSSFADE, span / 4) : 0;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const gain = c.createGain();
  if (fade > 0) {
    gain.gain.setValueAtTime(0, at);
    gain.gain.setValueCurveAtTime(FADE_IN, at, fade);
    gain.gain.setValueAtTime(1, at + fade);
    gain.gain.setValueCurveAtTime(FADE_OUT, at + span - fade, fade);
  } else {
    gain.gain.setValueAtTime(1, at);
  }

  src.connect(gain);
  gain.connect(out);
  src.start(at, plan.start, span);
  src.stop(at + span + 0.05);

  live.add(src);
  src.onended = () => {
    live.delete(src);
    try {
      src.disconnect();
      gain.disconnect();
    } catch {
      /* Already torn down. */
    }
    /* A track that cannot be looped ends for real, and says so, so the
       control can go back to reading "play" instead of lying. */
    if (!plan?.loop && playing && live.size === 0) {
      playing = false;
      finished?.();
    }
  };

  /* The next pass starts before this one ends: that overlap is the crossfade. */
  nextStartAt = at + span - fade;
}
function pump(): void {
  const c = ctx;
  if (!c || !playing || !plan?.loop) return;
  if (nextStartAt - c.currentTime < LOOKAHEAD_S) schedulePass(nextStartAt);
}

/** Starts the music. Must be called from a gesture — browsers require it. */
export async function startMusic(onFinished?: () => void): Promise<boolean> {
  const c = context();
  if (!c) return false;

  const buf = await load();
  if (!buf) return false;

  /*
   * Decide once what this file can support, then build it.
   *
   * Phrases joined into one piece if there is enough music to loop; the whole
   * thing played once, trimmed, if there is not. Either way the rest of this
   * module does not need to know which file it is playing.
   */
  if (!plan) {
    const phrases = phrasesOf(buf);
    const music = phrases.reduce((sum, p) => sum + (p.to - p.from), 0);

    if (phrases.length > 1 && music >= MIN_LOOP_S) {
      buffer = await stitch(buf, phrases);
      plan = { start: 0, end: buffer.duration, loop: true };
    } else if (phrases.length === 1 && phrases[0]!.to - phrases[0]!.from >= MIN_LOOP_S) {
      plan = { start: phrases[0]!.from, end: phrases[0]!.to, loop: true };
    } else {
      plan = { start: firstSound(buf), end: lastSound(buf), loop: false };
    }
  }
  finished = onFinished ?? null;

  if (c.state === "suspended") await c.resume().catch(() => undefined);
  if (playing) return true;

  playing = true;
  nextStartAt = c.currentTime + 0.05;
  schedulePass(nextStartAt);

  /* Up from silence over a couple of seconds, so it arrives rather than starts. */
  out!.gain.cancelScheduledValues(c.currentTime);
  out!.gain.setValueAtTime(Math.max(0.0001, out!.gain.value), c.currentTime);
  out!.gain.exponentialRampToValueAtTime(VOLUME, c.currentTime + 2);

  timer ??= setInterval(pump, TICK_MS);
  return true;
}

/** Stops it, fading out first — a hard stop reads as a fault. */
export function stopMusic(): void {
  const c = ctx;
  if (!c || !out) return;

  playing = false;

  const now = c.currentTime;
  out.gain.cancelScheduledValues(now);
  out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  window.setTimeout(() => {
    if (playing) return;
    for (const src of live) {
      try {
        src.stop();
      } catch {
        /* Already stopped. */
      }
    }
    live.clear();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1400);
}

/**
 * Music stops when the tab is hidden.
 *
 * A page playing to nobody, from a tab somebody cannot find, is the single
 * most irritating thing a site can do.
 */
export function watchVisibility(): () => void {
  const onChange = () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend().catch(() => undefined);
    } else if (playing) {
      void ctx.resume().catch(() => undefined);
    }
  };

  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
