// One step in the schedule, markup from design/reference/components/TimelineItem.

export type TimelineState = 'done' | 'now' | 'later';

export interface TimelineItemProps {
  /** "7:25 pm" */
  clock: string;
  /** "Fri" */
  day: string;
  title: string;
  /** Detail lines, shown in order. */
  details: readonly string[];
  /** Plain badges such as "Wait 1 hr" or "15 min". */
  badges: readonly string[];
  state: TimelineState;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function renderTimelineItem(props: TimelineItemProps): HTMLLIElement {
  const li = el('li', `tl-item is-${props.state}`);
  if (props.state === 'now') li.setAttribute('aria-current', 'step');

  const mark = el('span', 'tl-mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.append(el('span', 'dough-ball'));

  const body = el('div', 'tl-body');
  const time = el('div', 'tl-time');
  time.append(el('span', 'clock', props.clock), el('span', 'tl-day', props.day));
  body.append(time, el('h3', 'tl-title', props.title));
  for (const d of props.details) body.append(el('p', 'tl-detail', d));

  const badges = props.badges.map((b) => el('span', 'tl-badge', b));
  if (props.state === 'done') badges.push(el('span', 'tl-badge tl-badge-done', 'Done'));
  if (props.state === 'now') badges.push(el('span', 'tl-badge tl-badge-now', 'Now'));
  if (badges.length > 0) {
    const row = el('div', 'tl-badges');
    row.append(...badges);
    body.append(row);
  }

  li.append(mark, body);
  return li;
}
