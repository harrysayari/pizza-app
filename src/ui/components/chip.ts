// Chip group: single-choice radios, markup from design/reference/components/Chip.

export interface ChipOption {
  value: string;
  label: string;
  /** Second line: a ball weight on size chips, a clock time on time chips. */
  sub?: string;
  /** Size chips use the large face. */
  large?: boolean;
}

export interface ChipGroupProps {
  legend: string;
  name: string;
  options: readonly ChipOption[];
  /** The selected value, or null when nothing is chosen yet. */
  selected: string | null;
  onChange: (value: string) => void;
}

function span(className: string, text?: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = className;
  if (text !== undefined) s.textContent = text;
  return s;
}

export function renderChipGroup(props: ChipGroupProps): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'chipset';
  const legend = document.createElement('legend');
  legend.textContent = props.legend;
  const chips = document.createElement('div');
  chips.className = 'chips';

  for (const o of props.options) {
    const label = document.createElement('label');
    label.className = o.large ? 'chip chip-lg' : 'chip';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = props.name;
    input.value = o.value;
    input.checked = o.value === props.selected;
    input.dataset.key = `${props.name}:${o.value}`;
    input.addEventListener('change', () => {
      if (input.checked) props.onChange(o.value);
    });

    const line = span('chip-line');
    line.append(span('chip-check'));
    if (o.large) line.append(span('chip-main', o.label));
    else line.append(document.createTextNode(o.label));
    const face = span('chip-face');
    face.append(line);
    if (o.sub) face.append(span('chip-sub', o.sub));
    label.append(input, face);
    chips.append(label);
  }

  fieldset.append(legend, chips);
  return fieldset;
}
