// Banner: inline note with an icon, a title, one sentence and at most one button.
// Markup from design/reference/components/Banner.

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  title: string;
  body: string;
  action?: BannerAction;
  /** `ok` is the success variant (check icon, basil colours). */
  variant?: 'info' | 'ok';
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon(variant: 'info' | 'ok'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'banner-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', variant === 'ok' ? '2.5' : '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '9');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', variant === 'ok' ? 'M8 12.5l3 3 5-6' : 'M12 7v5l3 2');
  svg.append(circle, path);
  return svg;
}

export function renderBanner(props: BannerProps): HTMLElement {
  const variant = props.variant ?? 'info';
  const root = document.createElement('div');
  root.className = variant === 'ok' ? 'banner banner-ok' : 'banner';
  root.setAttribute('role', 'status');

  const body = document.createElement('div');
  body.className = 'banner-body';
  const title = document.createElement('p');
  title.className = 'banner-title';
  title.textContent = props.title;
  const text = document.createElement('p');
  text.textContent = props.body;
  body.append(title, text);

  if (props.action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.textContent = props.action.label;
    button.dataset.key = 'banner-action';
    button.addEventListener('click', props.action.onClick);
    body.append(button);
  }

  root.append(icon(variant), body);
  return root;
}
