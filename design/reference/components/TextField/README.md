TextField is the optional "say or type it" box: one line of text with a mic button, whose result fills the same visible chips and stepper.

**Markup:** `.field` with a `label.field-label`, a `.field-wrap` holding `input.field-input` and `button.mic[aria-pressed]`, and a `.field-hint` or `.field-status[role=status]` line. After parsing, show what was heard as `.tags`.

**You provide:** the label, a placeholder that is a real example (`Four 14-inch pizzas for Saturday dinner`), and a status line for each state: listening, understood, not understood. Hide the `.mic` button where speech recognition is unavailable and show the keyboard-dictation hint instead.

**Rules**
- The wrap is 56px tall; the mic is a 48px circle inside it. The input has a label, never just a placeholder.
- Listening is shown by the filled tomato mic, the pulse, and the words `Listening…`, so colour is never the only signal. The pulse stops when reduced motion is requested.
- Whatever is heard only sets the chips. The chips stay editable and remain the source of truth.
- If nothing is understood, say what to try, for example `Try: 4 pizzas, 14 inch, Saturday dinner`. Do not show an error colour.
