// Number-of-pizzas stepper, markup from design/reference/components/Stepper.

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

let uid = 0;

export function renderStepper(props: StepperProps): HTMLElement {
  const id = `stepper-label-${++uid}`;
  const wrap = document.createElement('div');
  wrap.className = 'stack';

  const label = document.createElement('span');
  label.className = 'field-label';
  label.id = id;
  label.textContent = props.label;

  const group = document.createElement('div');
  group.className = 'stepper';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', id);

  const button = (text: string, aria: string, key: string, next: number, disabled: boolean) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stepper-btn';
    b.textContent = text;
    b.setAttribute('aria-label', aria);
    b.dataset.key = key;
    b.disabled = disabled;
    b.addEventListener('click', () => props.onChange(next));
    return b;
  };

  const value = document.createElement('span');
  value.className = 'stepper-value';
  value.setAttribute('aria-live', 'polite');
  value.textContent = String(props.value);

  const unit = document.createElement('span');
  unit.className = 'stepper-unit';
  unit.textContent = props.value === 1 ? 'pizza' : 'pizzas';

  group.append(
    button('−', 'One fewer pizza', 'stepper:dec', Math.max(props.min, props.value - 1), props.value <= props.min),
    value,
    button('+', 'One more pizza', 'stepper:inc', Math.min(props.max, props.value + 1), props.value >= props.max),
    unit,
  );
  wrap.append(label, group);
  return wrap;
}
