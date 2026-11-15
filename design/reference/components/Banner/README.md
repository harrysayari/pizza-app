Banner is the inline note that explains a situation and offers the next move; its main job is the "too soon" case, where it shows the earliest possible ready time instead of an error.

**Markup:** `.banner[role=status]` with an inline SVG icon (`.banner-icon`) and `.banner-body` holding `p.banner-title`, one sentence of explanation, and at most one `.btn`. Add `banner-ok` for success.

**You provide:** a title that states the situation, one plain sentence of reasoning, and the action as a button that applies the suggestion (`Use Sunday 6:00 pm`).

**Rules**
- Too soon is a heads-up, not a failure: `semolina-soft` background, `semolina-text` title and border, a clock icon. Never use `tomato` for it, because tomato means "act".
- Success uses `basil` with a check icon. Both variants always have an icon and a title, so colour is never the only cue.
- Place it directly above the content it affects (above the timeline) and never hide the timeline behind it.
- One banner at a time.
