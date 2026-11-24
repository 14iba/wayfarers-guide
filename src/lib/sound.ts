// Every sound is made in the browser with the Web Audio API, so no audio files are needed.

let ctx: AudioContext | null = null;
let ambience: { stop: () => void } | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** A coin clink, played on save. */
export function clink() {
  tone(2093, 0, 0.18, "triangle", 0.12);
  tone(2637, 0.06, 0.25, "triangle", 0.09);
}

/** A little victory fanfare, played on level-up. */
export function fanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, i * 0.12, 0.35, "square", 0.06));
  tone(1046.5, 0.5, 0.8, "triangle", 0.1);
}

/** Rolling dice rattle. */
export function rattle() {
  for (let i = 0; i < 9; i++) tone(180 + Math.random() * 260, i * 0.07, 0.05, "square", 0.04);
}

export function pop() {
  tone(660, 0, 0.08, "sine", 0.12);
  tone(990, 0.04, 0.1, "sine", 0.08);
}

/** Soft tavern ambience: a warm low hum with a gentle crackling hearth. */
export function startAmbience() {
  const a = audio();
  if (!a || ambience) return;
  const len = a.sampleRate * 4;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown noise
    data[i] = last * 3.2 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 0.9 : 0); // crackles
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const g = a.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.05, a.currentTime + 2);
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
  ambience = {
    stop: () => {
      try {
        g.gain.linearRampToValueAtTime(0, a.currentTime + 0.6);
        src.stop(a.currentTime + 0.7);
      } catch {
        /* already stopped */
      }
    },
  };
}

export function stopAmbience() {
  ambience?.stop();
  ambience = null;
}
