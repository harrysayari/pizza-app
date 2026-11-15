// US5 slot: optional typed or spoken request, shown above the chips. What is understood sets only
// those choices; the chips stay the source of truth, so a tag is shown only while it still matches.

import { labelFor, parseRequest, type ParsedRequest } from '../../domain/request';
import { localDateOf, systemClock } from '../../platform/clock';
import * as speech from '../../platform/speech';
import { currentChoices, offeredDays, setRequest, type Choices } from '../../state/actions/plan';
import { update } from '../../state/store';
import { renderTextField } from '../components/text-field';

type Status = 'idle' | 'listening' | 'understood' | 'partial' | 'none';

const STATUS_TEXT: Record<Status, string> = {
  idle: '',
  listening: 'Listening… tap the mic to stop.',
  understood: 'Got it. Check the choices below, then tap Make my plan.',
  partial: 'Got part of it. Choose the rest below.',
  none: 'Try: 4 pizzas, 14 inch, Saturday dinner',
};

// The screen is rebuilt on every state change, so what the field shows lives here.
let text = '';
let heard: ParsedRequest | null = null;
let status: Status = 'idle';
let listener: speech.Listener | null = null;

function rerender(): void {
  update({});
}

function apply(input: string): void {
  let parsed: ParsedRequest;
  try {
    parsed = parseRequest(input, localDateOf(systemClock.now()));
  } catch {
    parsed = { understood: [] };
  }
  const patch: Partial<Choices> = {};
  if (parsed.size !== undefined) patch.size = parsed.size;
  if (parsed.pizzas !== undefined) patch.pizzas = parsed.pizzas;
  if (parsed.day !== undefined) patch.day = parsed.day;
  if (parsed.time !== undefined) patch.time = parsed.time;

  if (parsed.understood.length === 0) {
    heard = null;
    status = 'none';
    rerender();
    return;
  }
  heard = parsed;
  status = parsed.understood.length === 4 ? 'understood' : 'partial';
  setRequest(patch); // re-renders
}

/** Tags for the heard fields that still match the chips. */
function visibleTags(): string[] {
  if (!heard) return [];
  const now = systemClock.now();
  const c = currentChoices(undefined, now);
  const tags: string[] = [];
  if (heard.pizzas !== undefined && heard.pizzas === c.pizzas) tags.push(labelFor('pizzas', heard.pizzas));
  if (heard.size !== undefined && heard.size === c.size) tags.push(labelFor('size', heard.size));
  if (heard.day !== undefined && heard.day === c.day) {
    const offered = offeredDays(now).find((d) => d.value === c.day);
    if (offered) tags.push(offered.label);
  }
  if (heard.time !== undefined && heard.time === c.time) tags.push(labelFor('time', heard.time));
  return tags;
}

function toggleMic(): void {
  if (listener) {
    listener.stop();
    return;
  }
  const started = speech.listen({
    onText(heardText) {
      text = heardText;
      const input = document.querySelector<HTMLInputElement>('input.field-input');
      if (input) input.value = text;
    },
    onEnd() {
      listener = null;
      if (text.trim() === '') {
        status = 'idle';
        rerender();
      } else {
        apply(text);
      }
    },
  });
  if (started) {
    // onEnd may already have run for a recognizer that failed at once.
    listener = started;
    status = 'listening';
    rerender();
  }
}

export function renderSentence(): string | Node {
  return renderTextField({
    value: text,
    micAvailable: speech.isAvailable(),
    listening: listener !== null,
    status: STATUS_TEXT[listener !== null ? 'listening' : status],
    tags: visibleTags(),
    onInput: (value) => {
      text = value;
    },
    onSubmit: (value) => {
      text = value;
      apply(value);
    },
    onMic: toggleMic,
  });
}
