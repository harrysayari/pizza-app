# Contract: Say or type the request

One sentence in, up to four choices out (FR-005). Parsing is local and rule-based, and has no network dependency.

## Input and output

```ts
parseRequest(text: string, today: LocalDate): ParsedRequest

interface ParsedRequest {
  size?: 12 | 14 | 16;
  pizzas?: number;      // 1..12
  day?: LocalDate;      // from tomorrow through six days after tomorrow
  time?: 'lunch' | 'early' | 'dinner';
  understood: string[]; // human labels for the tags, e.g. ["4 pizzas", "14\"", "Sat", "Dinner"]
}
```

Rules: the function never throws and never guesses. Anything it cannot read is left out. The page sets only the returned fields and leaves the rest as chosen.

## What each field accepts

| Field | Recognised | Not recognised |
|-------|-----------|----------------|
| `size` | `12`, `14`, `16` with `inch`, `-inch`, `in`, `"` or a following "pizza"; "twelve/fourteen/sixteen inch" | other numbers like 18 or 10 |
| `pizzas` | digits 1 to 12 or words one to twelve, followed by "pizza(s)" or "dough ball(s)", or before a size ("four 14 inch") | 0, 13 and over |
| `day` | "tomorrow", full or short weekday names (Saturday, sat), "this Saturday"; resolves to the next such day from `today`, no later than six days after tomorrow | dates ("the 21st"), "next month" |
| `time` | "lunch" (lunchtime), "early dinner", "dinner", "supper"; clock times only when they equal 12:30, 6:00 or 7:30 | other clock times |

## Cases

| Input | Result |
|-------|--------|
| "four 14-inch pizzas for Saturday dinner" | 4, 14", Saturday, dinner |
| "2 pizzas tomorrow lunch" | 2, tomorrow, lunch |
| "sixteen inch" | size only |
| "pizza night" | nothing; the page shows an example: `Try: 4 pizzas, 14 inch, Saturday dinner` |
| "four 18-inch pizzas" | 4 only (18 is not offered) |

## Speech

- The mic button is shown only where the browser has speech recognition. Otherwise, typing only, with a hint to use the keyboard's microphone.
- Speech starts only after a tap and stops on a second tap or silence. The recognised text goes into the same text box and is parsed with the same function.
- A one-line note says that the browser may send the audio to its vendor to recognise it.
