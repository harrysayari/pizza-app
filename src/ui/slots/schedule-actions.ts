import { startSteps } from '../../state/actions/timer';

// Schedule action slots. renderStartSteps() is filled by US2 (lane E), renderCalendar() by US4 (lane G).
export function renderStartSteps(): string | Node {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary btn-block';
  b.textContent = 'Start step-by-step';
  b.dataset.key = 'start-steps';
  b.addEventListener('click', () => startSteps());
  return b;
}

export function renderCalendar(): string | Node {
  return '';
}
