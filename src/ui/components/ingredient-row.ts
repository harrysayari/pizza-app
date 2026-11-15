// Tick-off ingredient row, markup from design/reference/components/IngredientRow.

export interface IngredientRowProps {
  id: string;
  name: string;
  /** Already formatted, for example "202 g". */
  amount: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function renderIngredientRow(props: IngredientRowProps): HTMLLIElement {
  const li = document.createElement('li');
  const label = document.createElement('label');
  label.className = 'ing';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = props.checked;
  input.dataset.key = `ing:${props.id}`;
  // Rows touch with a 1px border between them, so inset the real control by half a tap gap (less
  // half the border) to keep 8px between neighbours and 48px of height in a 56px row. The whole
  // row still toggles because the control sits inside the label.
  input.style.top = 'calc(var(--space-1) - 0.5px)';
  input.style.height = 'calc(100% - var(--space-2) + 1px)';
  input.addEventListener('change', () => props.onChange(input.checked));

  const box = document.createElement('span');
  box.className = 'ing-box';
  const name = document.createElement('span');
  name.className = 'ing-name';
  name.textContent = props.name;
  const amount = document.createElement('span');
  amount.className = 'ing-amount';
  amount.textContent = props.amount;

  label.append(input, box, name, amount);
  li.append(label);
  return li;
}
