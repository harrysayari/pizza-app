// Browser speech recognition, only where it exists. Every call is wrapped and degrades quietly.

interface RecognitionResult {
  0: { transcript: string };
  length: number;
  isFinal: boolean;
}
interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  try {
    const w = window as unknown as Record<string, unknown>;
    const c = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    return typeof c === 'function' ? (c as RecognitionCtor) : null;
  } catch {
    return null;
  }
}

export function isAvailable(): boolean {
  return ctor() !== null;
}

export interface ListenOptions {
  /** Everything heard so far, as one string. Called for interim and final results. */
  onText: (text: string) => void;
  /** Called once when listening has stopped, for any reason. */
  onEnd: () => void;
}

export interface Listener {
  stop(): void;
}

/** Start listening. Call only from a tap. Returns null if it could not start. */
export function listen(options: ListenOptions): Listener | null {
  const Ctor = ctor();
  if (!Ctor) return null;
  let ended = false;
  const end = (): void => {
    if (ended) return;
    ended = true;
    try {
      options.onEnd();
    } catch {
      /* ignore */
    }
  };
  try {
    const rec = new Ctor();
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      try {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i]![0].transcript + ' ';
        options.onText(text.trim());
      } catch {
        /* ignore */
      }
    };
    rec.onend = end;
    rec.onerror = end;
    rec.start();
    return {
      stop(): void {
        try {
          rec.stop();
        } catch {
          end();
        }
      },
    };
  } catch {
    return null;
  }
}
