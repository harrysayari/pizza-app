// Toggle: on/off switch, markup from design/reference/components/Toggle.

export interface ToggleProps {
  label: string;
  checked: boolean;
  /** When set the switch is disabled and this text replaces On and Off. */
  disabledReason?: string;
  /** data-key, so focus survives a re-render. */
  key?: string;
  onChange: (checked: boolean) => void;
}

function span(className: string, text?: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = className;
  if (text !== undefined) s.textContent = text;
  return s;
}

export function renderToggle(props: ToggleProps): HTMLElement {
  const label = document.createElement('label');
  label.className = 'toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.checked = props.checked;
  if (props.key) input.dataset.key = props.key;
  const disabled = props.disabledReason !== undefined;
  input.disabled = disabled;
  input.addEventListener('change', () => props.onChange(input.checked));

  const track = span('toggle-track');
  track.append(span('toggle-thumb'));

  const state = span('toggle-state');
  if (disabled) {
    state.textContent = props.disabledReason!;
  } else {
    state.append(span('on', 'On'), span('off', 'Off'));
  }
  const text = span('toggle-text');
  text.append(span('label', props.label), state);

  label.append(input, track, text);
  return label;
}
