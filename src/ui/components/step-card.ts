// StepCard: one step on one screen. Markup from design/reference/components/StepCard.
// The timer (or a come-back time) goes in `extra`, between the text and the buttons.

export interface StepCardProps {
  /** 1-based position. */
  index: number;
  total: number;
  title: string;
  text: string;
  /** Scaled amounts for this step only, already formatted, for example { amount: "202 g", name: "water" }. */
  amounts: { amount: string; name: string }[];
  extra?: Node | null;
  canGoBack: boolean;
  onBack: () => void;
  onDone: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function renderStepCard(p: StepCardProps): HTMLElement {
  const card = el('article', 'step');
  const titleId = 'step-title';
  card.setAttribute('aria-labelledby', titleId);

  const meta = el('div', 'step-meta');
  const dots = el('span', 'dough-dots');
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= p.total; i++) {
    dots.append(el('span', i < p.index ? 'dot is-done' : i === p.index ? 'dot is-now' : 'dot'));
  }
  meta.append(el('span', 'step-count', `Step ${p.index} of ${p.total}`), dots);

  const title = el('h2', 'step-title', p.title);
  title.id = titleId;
  card.append(meta, title);

  if (p.amounts.length > 0) {
    const list = el('ul', 'step-amounts');
    list.setAttribute('aria-label', 'Amounts for this step');
    for (const a of p.amounts) {
      const li = el('li');
      li.append(`${a.amount} `, el('span', 'unit-name', a.name));
      list.append(li);
    }
    card.append(list);
  }

  card.append(el('p', 'step-text', p.text));
  if (p.extra) card.append(p.extra);

  const bar = el('div');
  const actions = el('div', 'step-actions');
  const back = el('button', 'btn btn-secondary', 'Back');
  back.type = 'button';
  back.dataset.key = 'step:back';
  back.disabled = !p.canGoBack;
  back.addEventListener('click', p.onBack);
  const next = el('button', 'btn btn-primary', 'Done, next step');
  next.type = 'button';
  next.dataset.key = 'step:done';
  next.addEventListener('click', p.onDone);
  actions.append(back, next);
  bar.append(actions);
  card.append(bar);
  return card;
}
