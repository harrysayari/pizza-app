Button is the one control for every action: tomato primary for the single main action on a screen, raised secondary for everything else.

**Classes:** `btn` plus `btn-primary` or `btn-secondary`; add `btn-block` for full width.

**You provide:** a short verb label (`Make my plan`, `Done, next step`, `Add to calendar`). Use a real `<button>` or `<a>`; set `disabled` (or `aria-disabled="true"` on a link) for the disabled state.

**Rules**
- One primary button per screen. In step mode it is `Done, next step`.
- Height is `tap-comfort` (56px), never below `tap-min` (48px). Keep `tap-gap` (8px) between neighbouring buttons.
- Primary text is `on-tomato` on `tomato`. Never put `ink` on `tomato`.
- Pressed state sinks the button 3px and shrinks the key edge. Disabled uses a dashed edge, so it reads as off without relying on colour.
- Focus is a 3px `focus-ring` outline with 3px offset. Do not remove it.
