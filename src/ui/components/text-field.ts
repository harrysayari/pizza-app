// "Say or type it" field with an optional mic, markup from design/reference/components/TextField.

export interface TextFieldProps {
  value: string;
  /** Show the mic button; false where speech recognition is missing. */
  micAvailable: boolean;
  listening: boolean;
  /** Status line text (role=status), or '' for none. */
  status: string;
  /** What was heard, as tag labels. */
  tags: readonly string[];
  onInput: (text: string) => void;
  onSubmit: (text: string) => void;
  onMic: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const KEYBOARD_HINT = 'No mic on this device? Use the microphone on your keyboard to dictate.';
const VENDOR_NOTE = 'Your browser may send the audio to its vendor to recognise it.';

function micIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS(SVG_NS, 'rect');
  for (const [k, v] of [['x', '9'], ['y', '3'], ['width', '6'], ['height', '11'], ['rx', '3']] as const) rect.setAttribute(k, v);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M5 11a7 7 0 0 0 14 0M12 18v3');
  svg.append(rect, path);
  return svg;
}

export function renderTextField(props: TextFieldProps): HTMLElement {
  const field = document.createElement('form');
  field.className = 'field';
  field.noValidate = true;
  field.addEventListener('submit', (e) => {
    e.preventDefault();
    props.onSubmit(input.value);
  });

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = 'say-it';
  label.textContent = 'Say or type it';

  const wrap = document.createElement('div');
  wrap.className = 'field-wrap';
  const input = document.createElement('input');
  input.className = 'field-input';
  input.id = 'say-it';
  input.type = 'text';
  input.value = props.value;
  input.placeholder = 'Four 14-inch pizzas for Saturday dinner';
  input.autocomplete = 'off';
  input.enterKeyHint = 'go';
  input.dataset.key = 'say-it';
  input.addEventListener('input', () => props.onInput(input.value));
  wrap.append(input);

  if (props.micAvailable) {
    const mic = document.createElement('button');
    mic.type = 'button';
    mic.className = 'mic';
    mic.setAttribute('aria-label', 'Speak your request');
    mic.setAttribute('aria-pressed', String(props.listening));
    mic.dataset.key = 'say-mic';
    mic.append(micIcon());
    mic.addEventListener('click', () => props.onMic());
    wrap.append(mic);
  }

  field.append(label, wrap);

  const status = document.createElement('span');
  status.className = 'field-status';
  status.setAttribute('role', 'status');
  status.textContent = props.status;
  if (props.status !== '') field.append(status);

  const hint = document.createElement('span');
  hint.className = 'field-hint';
  hint.textContent = props.micAvailable ? VENDOR_NOTE : KEYBOARD_HINT;
  field.append(hint);

  if (props.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'tags';
    tags.setAttribute('role', 'group');
    tags.setAttribute('aria-label', 'What we heard');
    for (const t of props.tags) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = t;
      tags.append(tag);
    }
    field.append(tags);
  }
  return field;
}
