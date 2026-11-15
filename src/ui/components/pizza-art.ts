// A drawing of a baked pizza, shown when the dough is ready. Decorative only: the heading next to it
// says the same thing in words. All colours are CSS classes (src/styles/app.css) that use the tokens.

const SVG = `<svg class="pizza-art" data-art="pizza" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <circle class="pizza-crust" cx="100" cy="100" r="94"/>
  <circle class="pizza-spot" cx="100" cy="14" r="3"/><circle class="pizza-spot" cx="158" cy="38" r="3"/>
  <circle class="pizza-spot" cx="186" cy="96" r="3"/><circle class="pizza-spot" cx="166" cy="156" r="3"/>
  <circle class="pizza-spot" cx="104" cy="186" r="3"/><circle class="pizza-spot" cx="42" cy="164" r="3"/>
  <circle class="pizza-spot" cx="14" cy="104" r="3"/><circle class="pizza-spot" cx="34" cy="44" r="3"/>
  <circle class="pizza-sauce" cx="100" cy="100" r="76"/>
  <ellipse class="pizza-cheese" cx="78" cy="72" rx="16" ry="13"/>
  <ellipse class="pizza-cheese" cx="126" cy="82" rx="17" ry="14"/>
  <ellipse class="pizza-cheese" cx="96" cy="124" rx="17" ry="14"/>
  <ellipse class="pizza-cheese" cx="58" cy="114" rx="11" ry="9"/>
  <ellipse class="pizza-cheese" cx="138" cy="128" rx="13" ry="11"/>
  <ellipse class="pizza-cheese" cx="106" cy="52" rx="10" ry="8"/>
  <path class="pizza-cut" d="M100 100 L100 24 M100 100 L165.8 62 M100 100 L165.8 138 M100 100 L100 176 M100 100 L34.2 138 M100 100 L34.2 62"/>
  <ellipse class="pizza-basil" cx="108" cy="102" rx="10" ry="5.5" transform="rotate(-30 108 102)"/>
  <ellipse class="pizza-basil" cx="66" cy="92" rx="10" ry="5.5" transform="rotate(40 66 92)"/>
  <ellipse class="pizza-basil" cx="120" cy="140" rx="10" ry="5.5" transform="rotate(70 120 140)"/>
  <ellipse class="pizza-basil" cx="82" cy="140" rx="10" ry="5.5" transform="rotate(-60 82 140)"/>
  <ellipse class="pizza-basil" cx="100" cy="68" rx="10" ry="5.5" transform="rotate(10 100 68)"/>
</svg>`;

export function renderPizzaArt(): Element {
  const holder = document.createElement('div');
  holder.innerHTML = SVG;
  return holder.firstElementChild as Element;
}
