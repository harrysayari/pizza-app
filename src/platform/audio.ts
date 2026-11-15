// Timer chime made with the Web Audio API (no audio files). Nothing is created or played until
// the first user tap calls unlock(), because browsers block sound before then.

export interface Audio {
  /** Call from a user tap. Creates and resumes the audio context the first time. */
  unlock(): void;
  /** Play the two-note chime. Does nothing before unlock() or while muted. */
  chime(): void;
  setMuted(muted: boolean): void;
}

type ContextCtor = new () => AudioContext;

const NOTES: readonly { hz: number; at: number }[] = [
  { hz: 659.25, at: 0 },
  { hz: 880, at: 0.22 },
];

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let muted = false;

  return {
    unlock() {
      try {
        if (ctx === null) {
          const w = window as unknown as { AudioContext?: ContextCtor; webkitAudioContext?: ContextCtor };
          const Ctor = w.AudioContext ?? w.webkitAudioContext;
          if (!Ctor) return;
          ctx = new Ctor();
        }
        if (ctx.state === 'suspended') void ctx.resume()?.catch?.(() => {});
      } catch {
        // No sound; the visual alert still works.
      }
    },
    chime() {
      if (muted || ctx === null) return;
      try {
        const c = ctx;
        if (c.state === 'suspended') void c.resume()?.catch?.(() => {});
        for (const note of NOTES) {
          const osc = c.createOscillator();
          const gain = c.createGain();
          const t = c.currentTime + note.at;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.hz, t);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + 0.65);
        }
      } catch {
        // Ignore: sound is optional.
      }
    },
    setMuted(value) {
      muted = value;
    },
  };
}
