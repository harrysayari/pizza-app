# Feature Specification: Pizza Dough Planner

**Feature Branch**: `001-pizza-dough-planner`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Build a mobile-friendly Pizza Dough Planner web page. The user says what pizza they want and when, and the app gives a back-timed schedule and step-by-step guidance for making Neapolitan-style dough from one proven recipe. It works on a phone in the kitchen, one-handed, with no account and no install."

## Clarifications

### Session 2026-11-15

- Q: Should ingredients scale from about 1,120 g of usable dough or the full 1,230 g the recipe adds up to? → A: The full 1,230 g. One reference batch makes four balls of about 307 g, with no loss assumed, so ingredients = recipe amounts × (total dough ÷ 1,230 g).
- Q: Which dough ball weight should each pizza size use? → A: 12" = 280 g, 14" ≈ 310 g, 16" ≈ 350 g. The reference batch's 307 g balls correspond to a 14" pizza.
- Q: For long waits like the fridge rest, show a live countdown or a come-back time? → A: A live countdown only for waits of 2 hours or less; longer waits show the day and time to come back and rely on the calendar alarm.
- Q: If the cook finishes a step later or earlier than scheduled, should the rest of the schedule move? → A: No. Planned times stay fixed, but the page shows an updated estimated ready time and how far ahead or behind the cook is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a dough batch and see the schedule (Priority: P1)

A home cook chooses a pizza size, how many pizzas they want, the day they want to bake and the time they want the dough ready. They get the total dough needed, the ingredient amounts in grams, and a schedule that tells them what to do and when, working backward from the bake time.

**Why this priority**: This is the whole point of the product. Without a correct, back-timed plan nothing else has value, and it can be delivered and used on its own.

**Independent Test**: Choose 14", 4 pizzas, Saturday, Dinner. Confirm the plan shows a total dough weight of 1,240 g, a full ingredient list in grams, and a schedule whose steps end with "ready to bake" at the Saturday dinner time and start the evening before.

**Acceptance Scenarios**:

1. **Given** the user has chosen 14", 4 pizzas, a bake day and Dinner, **When** they tap "Make my plan", **Then** they see the ball weight (about 310 g), the total dough (1,240 g), the ingredients grouped as Poolish and Final dough, and a schedule of steps with a clock time and weekday on each.
2. **Given** a plan is shown, **When** the user changes the size or the number of pizzas, **Then** the amounts and times update to match without starting over.
3. **Given** the user picks a different bake time chip, **When** the plan updates, **Then** every step time shifts so the last step still ends at the chosen bake time.
4. **Given** a plan is shown, **When** the user ticks an ingredient, **Then** it shows as ticked and stays ticked until they untick it or change the pizza size or the number of pizzas. Changing the day or time keeps the ticks.

---

### User Story 2 - Follow the steps one at a time with timers (Priority: P2)

While making the dough, the cook opens a mode that shows one step per screen with the amounts for that step and, for waiting steps, a countdown. When a countdown ends they are told, and they move on with one tap.

**Why this priority**: This is how the plan gets used in the kitchen, with messy hands and a phone propped up. It builds on the plan but can be tested alone with any plan.

**Independent Test**: Start step-by-step mode on a plan, begin a 15-minute rest, and confirm the countdown runs, the screen stays awake, and a sound, vibration (where supported) and a clear finished state appear when it reaches zero.

**Acceptance Scenarios**:

1. **Given** a plan, **When** the user opens step-by-step mode, **Then** they see the first step with its title, instruction, the scaled amounts for that step, and which step it is out of the total.
2. **Given** a waiting step of 2 hours or less, **When** the user taps the start button, **Then** a countdown begins and the screen stays on by default.
2a. **Given** a waiting step longer than 2 hours (such as the fridge rest), **When** the user reaches it, **Then** they see the day and time to come back instead of a countdown.
3. **Given** a running countdown reaches zero while the page is open, **When** it ends, **Then** a sound plays, the device vibrates if it can, and a finished state with the words "Time is up" appears.
4. **Given** the countdown ended while the page was hidden or the phone was locked, **When** the user returns to the page, **Then** the alert plays and the page shows how long ago the timer ended.
5. **Given** sound is muted by the user, **When** a countdown ends, **Then** no sound plays but the finished state and vibration still appear, and the mute choice is remembered on the next visit.
6. **Given** the user has not yet tapped anything on the page, **When** a countdown would end, **Then** no sound plays before a first tap; starting a timer counts as that tap.
7. **Given** the device refuses to keep the screen on, **When** a timer starts, **Then** the page tells the user the screen may lock.
8. **Given** the user finishes a step 25 minutes after its planned time, **When** they tap "Done, next step", **Then** the page shows they are 25 minutes behind and an updated ready time, while the planned times in the schedule and calendar stay unchanged.

---

### User Story 3 - Not enough time: show the earliest possible ready time (Priority: P3)

If the cook picks a bake time that leaves too little time before it, they are not shown an error. They are told the earliest the dough can be ready and can accept it with one tap.

**Why this priority**: People will often ask for "tomorrow" without knowing the recipe needs about a day. Handling it gracefully prevents a dead end, but the plan works for most requests without it.

**Independent Test**: At a time of day when the chosen bake time is under the minimum, choose it and confirm a note appears with the earliest ready time and a button that applies it.

**Acceptance Scenarios**:

1. **Given** the chosen bake time is less than the minimum lead time (about 22 hours) from now, **When** the user makes the plan, **Then** a note explains this and shows the earliest possible ready day and time.
2. **Given** the note is shown, **When** the user taps the button to use the earliest time, **Then** the plan is made for that time.
3. **Given** a day or time choice cannot work, **When** the choices are shown, **Then** that choice is labelled so the user can see why, and is never a blank dead end.

---

### User Story 4 - Put the schedule in the phone's calendar (Priority: P4)

The cook adds the whole schedule to their calendar so they are reminded of each step even when the phone is locked.

**Why this priority**: Timer alerts only work while the page is open. Calendar reminders cover the long gaps, such as the overnight fridge rest, and a locked phone.

**Independent Test**: Tap "Add to calendar" on a plan and confirm the calendar receives one event per step at the right time, with a reminder, and an alarm at the end of every waiting step.

**Acceptance Scenarios**:

1. **Given** a plan, **When** the user taps "Add to calendar", **Then** an event for every step is delivered to their calendar, each with a title, time and short instruction.
2. **Given** a waiting step, **When** its event is created, **Then** it includes an alarm at the end of the wait.
3. **Given** the calendar cannot be reached, **When** the user taps the button, **Then** they see a plain message and the plan is unaffected.

---

### User Story 5 - Say or type the request (Priority: P5)

The cook says or types one sentence such as "four 14-inch pizzas for Saturday dinner" and the matching choices are filled in for them to check and edit.

**Why this priority**: It saves taps with wet hands, but the tap choices already do the job, so this is an optional shortcut.

**Independent Test**: Enter "four 14-inch pizzas for Saturday dinner" and confirm the size, count, day and time choices are set and visibly shown, and can be changed by tapping.

**Acceptance Scenarios**:

1. **Given** a sentence that names a size, count, day and time, **When** it is submitted, **Then** the matching choices are set and shown as tags the user can check.
2. **Given** the sentence is only partly understood, **When** it is submitted, **Then** the understood parts are set and the rest are left for the user to choose.
3. **Given** nothing is understood, **When** it is submitted, **Then** the user sees an example of what to try and no choices change.
4. **Given** speaking is unavailable on the device, **When** the user opens the box, **Then** only typing is offered, with a hint about the keyboard's dictation.

---

### User Story 6 - Come back, share and use offline (Priority: P6)

The cook can close the page and return later to the same plan and timers, share a plan as a link, and keep using the page when the network drops.

**Why this priority**: Dough takes a day. People will leave and come back, and kitchens have poor signal. It makes the other stories dependable.

**Independent Test**: Make a plan, close and reopen the page, and confirm the same plan appears; open the shared link on another phone and confirm the same choices; go offline after the first load and confirm planning and steps still work.

**Acceptance Scenarios**:

1. **Given** a plan was made, **When** the user closes and reopens the page, **Then** the same plan and ticked ingredients are shown.
2. **Given** a plan, **When** the user shares its link and someone opens it, **Then** the same size, count, day and time are restored.
3. **Given** the page has loaded once, **When** the network is lost, **Then** planning, the schedule and step-by-step mode keep working.
4. **Given** a timer was running when the page was closed, **When** the page is reopened, **Then** the timer shows the correct time left or that it has ended.
5. **Given** a saved plan, **When** the user opens the page again, **Then** it resumes at the last screen and step they were on.
6. **Given** a saved plan, **When** the user chooses "Start a new plan" and confirms, **Then** the saved plan, ticks, step and timers are cleared and the start screen appears with the mute choice kept.
7. **Given** a saved plan, **When** the user chooses "Clear saved data" and confirms, **Then** everything remembered on the device, including the mute choice, is removed.

---

### Edge Cases

- **Under one pizza's worth of yeast:** For one small pizza, ingredient amounts such as yeast and honey fall near 1 g. Amounts under 10 g are shown to one decimal place so the recipe ratios stay correct, and larger amounts are shown in whole grams.
- **Bake time far away:** If the bake day is several days out, the schedule starts late enough that the fridge rest stays within 16 to 24 hours, and the first step is shown with its day.
- **Start time already passed:** If the first step's time is already in the past, treat it as too soon and show the earliest ready time.
- **Fridge window:** The fridge rest is never planned for more than 24 hours.
- **Time zones and clock changes:** Times are shown in the user's local time, and a daylight-saving change or timezone change does not shift steps by the wrong amount.
- **Largest batch:** At the limit of 12 pizzas the amounts are shown correctly with a plain note if the batch is larger than a home mixer or bowl is likely to hold. The note shows when total dough is over 3,000 g (for example 10 pizzas at 14", or 12 at 12" or 16"), on the schedule screen, and never changes an amount.
- **Sound blocked or muted by the device:** The finished state and vibration still appear.
- **Page reloaded or tab closed during a timer:** The time left is correct on return, based on the planned end time.
- **Saved data removed by the device:** Some browsers delete a page's saved data after about a week without a visit, and private windows do not keep it. The product shows the start screen without an error, and a shared link restores the choices.
- **No microphone or speech support:** Typing is available with a hint; nothing breaks.
- **Reduced motion requested:** Animation is minimal but timers and states still show.

## Requirements *(mandatory)*

### Functional Requirements

**Inputs**

- **FR-001**: Users MUST be able to choose a pizza size of 12", 14" or 16" with one tap each.
- **FR-002**: Users MUST be able to set the number of pizzas from 1 to 12 using plus and minus buttons, without typing.
- **FR-003**: Users MUST be able to choose a bake day from "Tomorrow" and the following weekday names, and a ready-to-bake time of Lunch (12:30 pm), Early dinner (6:00 pm) or Dinner (7:30 pm), all by tapping.
- **FR-004**: The product MUST NOT ask users to use a date picker.
- **FR-005**: Users MAY say or type one sentence that sets the same choices; the understood choices MUST be shown visibly and be editable, and MUST NOT replace the tap choices. Where the browser sends speech to its vendor to recognise it, the mic button MUST say so in one line, and typing MUST always work.

**Dough size and amounts**

- **FR-006**: The product MUST use these dough ball weights: 12" = 280 g, 14" = 310 g, 16" = 350 g.
- **FR-007**: Total dough MUST equal the number of pizzas times the ball weight.
- **FR-008**: Every ingredient MUST scale from the reference recipe in proportion to total dough divided by 1,230 g, with no allowance for loss.
- **FR-009**: Amounts MUST be shown in grams, rounded to whole grams, except amounts under 10 g, which MUST be shown to one decimal place.
- **FR-010**: Ingredients MUST be grouped as Poolish and Final dough, and the user MUST be able to tick each one off.

**Schedule**

- **FR-011**: The product MUST produce a schedule of steps back-timed from the chosen bake time, each with a weekday and clock time in the user's local time.
- **FR-012**: The schedule MUST follow the reference recipe's order and waiting times, and keep the fridge rest between 16 and 24 hours.
- **FR-013**: If the chosen bake time leaves less than the minimum lead time (about 22 hours), the product MUST show the earliest possible ready time with a one-tap way to use it, and MUST NOT show an error dead end.
- **FR-014**: Changing any choice MUST update the amounts and times immediately.
- **FR-041**: The schedule's steps MUST be shown in two parts that the user can open and close: Part 1, Poolish (the steps up to and including the fridge rest), and Part 2, Final dough (the steps after the fridge). Each part MUST show its total time in hours and minutes and when it starts and ends, and the schedule MUST show the total time from the first step to the bake. Opening or closing a part MUST NOT change any time, and MUST be kept when the screen redraws.

**Step-by-step mode**

- **FR-015**: Users MUST be able to follow the plan one step per screen, each showing a title, an instruction, the scaled amounts for that step, and its position out of the total.
- **FR-016**: Waiting steps of 2 hours or less MUST offer a countdown the user starts with one tap, with controls to pause, add a minute, and finish early. Waiting steps longer than 2 hours MUST instead show the day and time to come back, and rely on the calendar alarm.
- **FR-040**: The planned step times MUST stay fixed. When the user marks steps done, step-by-step mode MUST show an updated estimate of when the dough will be ready, based on the actual finish times and the remaining waits, and how many minutes ahead or behind the plan the user is.
- **FR-017**: When a countdown ends while the page is open, the product MUST play a sound, vibrate where the device supports it, and show a finished state with the words "Time is up".
- **FR-018**: The product MUST NOT play any sound before the user's first tap on the page.
- **FR-019**: Users MUST be able to mute the sound at any time, and the choice MUST be remembered.
- **FR-020**: "Keep screen on" MUST be on by default while a timer runs, and the product MUST tell the user if the device refuses it.
- **FR-021**: If a countdown ended while the page was hidden or the phone locked, the alert MUST play when the user returns, with how long ago it ended.
- **FR-022**: The product MUST NOT promise alerts on a locked or closed page.

**Calendar**

- **FR-023**: Users MUST be able to add the schedule to their calendar, with one event per step and a reminder on each.
- **FR-024**: Each waiting step's event MUST include an alarm at the end of its wait.

**Access, saving and sharing**

- **FR-025**: The product MUST work as a page opened from a link, with no account, installation or sign-in.
- **FR-026**: The plan, ticked ingredients, the current step, timer state and mute choice MUST be remembered on the user's device between visits, including after the page and the browser are closed, and the user MUST resume where they left off.
- **FR-038**: Users MUST be able to start a new plan, which clears the saved plan, ticked ingredients, current step and timers, and keeps their mute choice. Users MUST also be able to clear all saved data. Both actions MUST ask for confirmation inside the page before deleting anything.
- **FR-039**: If saved data is missing when the page opens (cleared by the device, or a private window), the product MUST show the start screen and, if opened from a shared link, restore the size, count, day and time from the link.
- **FR-027**: Users MUST be able to share or bookmark a link that restores the same size, count, day and time.
- **FR-028**: Once loaded, planning, the schedule and step-by-step mode MUST work without a network connection.
- **FR-029**: The product MUST NOT collect personal data or send plans to any server.

**Usability and accessibility**

- **FR-030**: Every tappable control MUST be at least 48px by 48px and at least 8px from the next control.
- **FR-031**: Body text MUST be at least 16px, step instructions at least 18px, and countdown digits at least 48px.
- **FR-032**: Text MUST meet WCAG AA contrast in both a light and a dark appearance.
- **FR-033**: Every control MUST have an accessible name, a visible focus indicator, and be usable by keyboard and screen reader.
- **FR-034**: No state (selected, done, running, paused, too soon) MUST be shown by colour alone.
- **FR-035**: Animation MUST respect the user's reduced-motion setting.
- **FR-036**: The core flow MUST be usable one-handed on a phone about 430px wide.
- **FR-037**: The product MUST follow the project design system and constitution.

### Key Entities

- **Plan**: One planned batch. Holds the pizza size, number of pizzas, bake day and time, the derived ball weight and total dough, and the list of scheduled steps.
- **Recipe**: The single reference recipe: its ingredients in two groups, its ordered steps with their durations, and its fridge window.
- **Ingredient**: A named item with an amount in grams scaled to the plan, its group, and whether the user has ticked it.
- **Step**: One action in the schedule with a title, instruction, scaled amounts, a clock time and weekday, an optional waiting duration, whether it is done, and the time it was actually finished.
- **Timer**: A countdown tied to a waiting step, with its planned end time and its state (idle, running, paused, finished).
- **Preferences**: Choices remembered on the device, such as mute and keep-screen-on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (with 14" and 4 pizzas preselected and no day or time preselected): A first-time user can go from opening the page to seeing a full plan in under 30 seconds and no more than 6 taps.
- **SC-002** (post-launch measure, not testable inside the product): At least 90% of first-time users complete a plan on their first attempt without help.
- **SC-003**: For every combination of size and pizza count, the ingredient amounts and ball weight match the reference calculation exactly, with the total dough equal to pizzas times ball weight.
- **SC-004**: For every bake time that allows enough lead time, the schedule's last step ends exactly at the chosen bake time, and no fridge rest is shorter than 16 hours or longer than 24 hours.
- **SC-005**: Every request that leaves too little time shows the earliest possible ready time; users never reach a blank error screen.
- **SC-006**: When a timer ends with the page open, the user is alerted within 1 second of the end time, and within 2 seconds of returning if it ended while the page was hidden.
- **SC-007**: After the page has loaded once, 100% of planning, schedule and step-by-step features work with the network off.
- **SC-008**: Every control meets the minimum size and spacing, text meets the minimum sizes and contrast in both appearances, and a keyboard-only user can complete a plan and the first step.
- **SC-009** (post-launch measure, gathered by follow-up feedback): At least 80% of users who finish a plan say the dough was ready when they expected it, in follow-up feedback.
- **SC-010**: No personal data is requested or sent anywhere during use.

## Assumptions

- Users are home cooks making Neapolitan-style pizza on a phone; no accounts, history or other pizza styles are included in this version.
- The reference recipe is the one from the source flowchart. One batch is about 1,230 g: poolish (200 g water, 5 g honey, 5 g yeast, 200 g 00 flour; mix 2 to 3 minutes, rest uncovered 15 minutes, seal and rest 1 hour, refrigerate 16 to 24 hours) plus final dough (poolish out for 1 hour, 300 g Manitoba flour, 200 g 00 flour, 300 g water with 20 g salt, mix 10 to 15 minutes, shape and rest 15 minutes, form and oil, towel-covered rest 1 hour, cut and ball, rest 1 to 2 hours covered).
- One reference batch (1,230 g of ingredients) makes four balls of about 307 g, with no loss assumed. Ball weights are confirmed: 12" = 280 g, 14" about 310 g, 16" about 350 g.
- The first-stage ingredient list uses honey as in the flowchart. One note on the source board mentions salt in that stage; it has not been checked against the video.
- A planning default of 18 hours in the fridge is used unless the bake time forces a value between 16 and 24 hours.
- The minimum lead time from the first step to the bake is about 22 hours at the default timings.
- Day choices cover Tomorrow and the next six days.
- Out of scope for this version: alerts on a locked or closed page (needs a server), a button that sets the phone's own timer, accounts and saved history, other pizza styles, imperial units and step photos.
- Dependencies: the project design system and constitution (v1.1.1) apply to all screens.
