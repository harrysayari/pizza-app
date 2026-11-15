# Feature Specification: Timer-End Notifications

**Feature Branch**: `002-timer-notifications` (no git branch created; work stays on `main` unless you ask for one)

**Created**: 2026-11-15

**Status**: Draft (clarified; the constitution is amended to v1.2.1 and allows the reminder service)

**Input**: User description: "Timer-end notifications: an easier, harder-to-miss way to tell the cook when a timer is up. The app is now hosted over HTTPS, so browser notifications are possible. The user can opt in to notifications so they are told when a wait is over even when the app is in another tab or app, or the phone is locked; the alert is easier to notice and acknowledge; permission is asked only after a tap with a plain explanation, never on first load; the app works fully without it."

## Clarifications

### Session 2026-11-15

- Q: Should alerts also reach a phone whose app is closed or locked, which needs a small server and a push service? → A: Yes. Server push is in scope. This conflicts with constitution principle IX and the "user data stays local" rule, so the constitution MUST be amended first, and this spec defines the privacy behaviour the constitution requires (FR-021 to FR-027).
- Q: How long does the in-page alert repeat its sound? → A: Every 30 seconds for up to 5 minutes, then it stops. The on-screen alert stays until the user acts on it (FR-003).
- Q: Should the reminder service also notify at the end of the long fridge rest, not only the waits with a timer? → A: Yes. Every wait is covered, including the fridge rest, using its planned end (FR-014, FR-019, FR-022).
- Q: If the user does not react to a notification, should the phone be reminded a second time? → A: Yes, once, 5 minutes later, only if the app has not been opened and the alert has not been acted on. No further repeats (FR-009, FR-012, FR-024).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A timer alert you cannot miss while the app is open (Priority: P1)

A cook starts the 15 minute rest, then goes to look at the ingredient list or the schedule. When the timer ends, a clear alert appears on whichever screen they are on, naming the step and saying "Time is up". The chime and vibration repeat every 30 seconds for up to 5 minutes, and the alert stays on screen until the cook acts on it with one tap: "Done, next step" or "+1 min".

**Why this priority**: Today the alert shows only on the step screen and plays once, so it is easy to miss with floury hands. This helps every user with no permission, no server and no platform limits, so it is the smallest slice that delivers value.

**Independent Test**: Start the 15 minute rest, open the schedule screen, let the timer end. The alert appears on the schedule screen, the chime repeats, and tapping "Done, next step" stops the sound and moves to the next step.

**Acceptance Scenarios**:

1. **Given** a timer is running and the user is on any screen, **When** it ends, **Then** an alert appears on that screen with the step name and the words "Time is up", and it stays until the user acts on it.
2. **Given** the alert is showing, **When** the user taps "Done, next step", **Then** the sound and vibration stop, the step is marked done and the next step is shown.
3. **Given** the alert is showing, **When** the user taps "+1 min", **Then** the alert closes, sound and vibration stop, and a one minute timer runs.
4. **Given** the alert is showing and the user does nothing, **When** 5 minutes have passed, **Then** the sound and vibration stop on their own and the alert stays on screen.
5. **Given** the sound is muted, **When** a timer ends, **Then** the alert still appears and vibrates where supported, with no sound.
6. **Given** the user has not tapped anywhere on the page yet, **When** a timer ends, **Then** no sound plays, as before, and the alert still appears.

---

### User Story 2 - Opt in to notifications (Priority: P2)

A cook wants to switch to another tab or app while a rest runs. They turn on "Notify me when a timer ends". The app first explains in plain words what will happen, what is sent where, and what it cannot promise. Only after the cook confirms does the browser ask for permission. From then on, a timer that ends while the app is in the background shows a system notification, and tapping it returns to the step with the alert showing.

**Why this priority**: This is the main ask. It builds on the in-page alert and needs permission, so it comes second. It also works for apps still running in the background even if the service in Story 3 is unavailable.

**Independent Test**: Turn notifications on, start a timer, hide the page, let the timer end. A notification appears naming the step; tapping it returns to the app on that step with the alert showing.

**Acceptance Scenarios**:

1. **Given** the app has just loaded, **When** the user has not asked for notifications, **Then** no permission prompt appears.
2. **Given** notifications are off, **When** the user taps the notification control, **Then** a short plain explanation is shown first, and the browser's permission prompt appears only after the user confirms.
3. **Given** notifications are on and a timer is running, **When** the timer ends while the page is hidden, **Then** a notification appears with the step name and "Time is up".
4. **Given** that notification, **When** the user taps it, **Then** the app comes forward on that step with the alert showing.
5. **Given** notifications are on, **When** a timer ends while the page is visible, **Then** only the in-page alert shows, with no duplicate notification.
6. **Given** the user pauses, finishes early, adds a minute, or starts a new timer, **When** the old end time passes, **Then** no notification appears for the old end time.
7. **Given** notifications are on and the sound is muted, **When** a notification appears, **Then** it makes no sound.
8. **Given** a notification was shown and the user has not opened the app or acted on the alert, **When** 5 minutes have passed, **Then** the notification is shown once more, and never again after that.
9. **Given** a notification was shown, **When** the user opens the app or acts on the alert within 5 minutes, **Then** the repeat does not appear.

---

### User Story 3 - A reminder that reaches a locked or closed phone (Priority: P3)

A cook starts a timer, puts the phone down and the screen locks, or closes the browser. When the timer ends, the phone still shows the notification, because the app told a small reminder service at the start when the timer would end. The cook taps it and lands on the step with the alert showing.

**Why this priority**: This is what makes the notification dependable when the phone pauses the app, but it needs a service, a constitution change, and privacy limits, so it follows the simpler stories. The in-page alert and the calendar alarms still work without it.

**Independent Test**: With notifications on and the app online, start a timer, lock the phone or close the browser, wait for the end time. A notification arrives within a minute of the end. Pausing the timer before the end means no notification arrives.

**Acceptance Scenarios**:

1. **Given** notifications are on and the device is online, **When** a timer starts, resumes or gains a minute, **Then** its end time is registered with the reminder service, and nothing else about the plan is.
2. **Given** a registered timer, **When** it ends while the app is closed or the phone is locked, **Then** a notification arrives within 2 minutes of the end time.
3. **Given** a registered timer, **When** the user pauses, finishes early, taps "Done, next step", starts another timer, or turns notifications off, **Then** the registration is cancelled and no notification arrives for the old end time.
4. **Given** the reminder service cannot be reached when a timer starts, **When** the user continues, **Then** the timer still runs, the in-page alert and background notification still work, and the user is told once, in plain words, that the locked-phone reminder could not be set and calendar alarms are the backup.
5. **Given** the user taps "Clear saved data" or turns notifications off, **When** the device is online, **Then** the service is asked to remove their delivery address and any waiting reminder.
6. **Given** a notification arrives at the same moment the page is open and visible, **When** the page shows the alert, **Then** the user does not also see a notification.
7. **Given** the poolish goes into the fridge (a wait of many hours), **When** the previous step is marked done, **Then** the planned end of the fridge rest is registered, and a notification arrives within 2 minutes of that planned end even if the app was closed all day.
8. **Given** a registered fridge rest, **When** the user marks it done early, changes the plan, or starts a new plan, **Then** the registration is cancelled and no notification arrives for the old end time.

---

### User Story 4 - Honest help and a clear privacy note (Priority: P4)

Some browsers refuse notifications, the user may tap "Block", an iPhone tab needs the page on the home screen first, and no phone can promise delivery. The cook sees a plain explanation of which of these applies, what to do next, and exactly what is sent to the reminder service. They are never told an alert is guaranteed, and they are pointed to calendar alarms as the backup.

**Why this priority**: It stops a false sense of safety, which is the real risk for a cook who walks away, and it keeps the app usable and trustworthy for everyone.

**Independent Test**: In each situation (permission blocked, notifications unavailable, iPhone browser tab not on the home screen, service unreachable), the control shows the state and one next step, and the rest of the app works.

**Acceptance Scenarios**:

1. **Given** the user blocked notifications in the browser, **When** they open the control, **Then** it says notifications are blocked and how to allow them, and nothing else is affected.
2. **Given** the browser cannot show notifications, **When** the user opens the control, **Then** it says so in one sentence and offers the calendar alarms instead.
3. **Given** an iPhone with the page open in the browser rather than added to the home screen, **When** the user opens the control, **Then** it explains that notifications need the page on the home screen and offers no broken toggle.
4. **Given** any state, **When** the explanation is shown, **Then** it says delivery depends on the phone and network and can be late or missed, and it names calendar alarms as the backup. It never promises delivery.
5. **Given** the explanation before permission, **When** the user reads it, **Then** it says in plain words what is sent to the reminder service (an address for this phone's notifications, the end time and the step name), that nothing else about the plan is sent, and that it can be turned off at any time.
6. **Given** a timer ended while the phone had paused the app, **When** the user returns, **Then** the alert shows with how long ago it ended, as today.

---

### Edge Cases

- **Permission blocked later**: The user turns notifications off in the browser after turning them on in the app. The control shows "blocked" and the app falls back to the in-page alert.
- **Phone does not deliver**: Do-not-disturb, no signal, or battery saver delays or hides the notification. On return the alert shows with how long ago it ended. Calendar alarms are the backup.
- **Fridge rest ends early or late**: The reminder uses the planned end shown as "Come back at". If the cook takes the poolish out earlier and marks the step done, the reminder is cancelled. If they are later, the reminder has already arrived and the in-page alert shows how long ago it was when they return. "Remind me in 15 min" registers a new reminder.
- **Plan changed after registering**: Changing the day or time, starting a new plan, or clearing saved data cancels every registration for the old plan.
- **Several ends in a row**: Only one timer runs at a time, so at most one alert and one notification (plus its single repeat) exist per end. Starting a new timer replaces any alert or notification from the old one.
- **Cancel while offline**: The user pauses a timer with no network, so the reminder service cannot be told. A reminder, and its repeat, may still arrive for the old end time. Anything left at the service expires on its own within 24 hours after its end time, and the app hides a notification for a timer it knows is no longer running.
- **Delivery address expires**: The phone's notification channel stops working. The service drops it on the first failed delivery, and the app asks to register again the next time notifications are on.
- **Tap on a notification after the app was closed**: The app opens at the saved step with the finished timer and the alert showing.
- **Offline**: Planning, the schedule, the timers, the in-page alert and background notifications all work with no network. Only registering a locked-phone reminder needs the network, and failing to do so never blocks the user.
- **Clock changes**: The end time comes from the saved end time, as today, so a phone sleeping or the page reloading does not shift it.
- **Reduced motion**: The alert appears without animation. The state is shown by words and an icon, not colour or motion alone.
- **Screen reader**: The alert is announced when it appears.
- **Clear saved data**: The app's own "notifications on" choice is cleared, the reminder service is asked to remove the user's data, and the control shows the real browser permission state.
- **Misuse**: Someone sends the reminder service made-up requests. It refuses anything but registrations from the app for the fixed timer-end message, so it cannot be used to send other messages.

## Requirements *(mandatory)*

### Functional Requirements

**The alert (works without permission or a server)**

- **FR-001**: When a timer (or, per FR-014, a long wait) ends while the page is open, the product MUST show an alert on the screen the user is on, naming the step and saying "Time is up".
- **FR-002**: The alert MUST offer "Done, next step" and "+1 min", each as a single tap.
- **FR-003**: The alert MUST stay on screen until the user acts on it. While it shows, the chime and vibration MUST repeat every 30 seconds, and MUST stop on their own after 5 minutes.
- **FR-004**: Repeated sound MUST obey the mute setting and MUST NOT play before the user's first tap on the page. Vibration repeats only where the device supports it.
- **FR-005**: Acting on the alert MUST stop all sound and vibration at once.

**Notifications**

- **FR-006**: The product MUST let the user turn timer notifications on and off with one control, reachable from the settings and from step mode.
- **FR-007**: The browser's permission prompt MUST be requested when the page loads (changed by the owner from "only after a tap"). Browsers that only allow the prompt after a tap, such as iPhone Safari, MUST be asked on the first tap instead. A refusal MUST NOT be asked about again, and the control MUST still let the user turn notifications on or off later.
- **FR-008**: The control MUST show one of four states in words and an icon: off, on, blocked, or not available, each with one next step. No state is a dead end.
- **FR-009**: When notifications are on and a timer ends while the page is hidden, the product MUST show a system notification with the step name and "Time is up". If the user has not opened the app or acted on the alert 5 minutes later, the product MUST show the same notification once more, and MUST NOT repeat it again.
- **FR-010**: Tapping the notification MUST bring the user to the app on that step with the alert showing.
- **FR-011**: The product MUST NOT show a notification while the page is visible.
- **FR-012**: Pausing, finishing early, adding a minute, starting a new timer, marking a wait done, changing or clearing the plan, acting on the alert, or turning notifications off MUST remove or replace any pending or shown notification for the old end time. One wait end MUST produce at most one notification plus the single repeat from FR-009, however they are delivered. Opening the app MUST cancel the repeat.
- **FR-013**: A notification MUST be silent when the user has muted sound.
- **FR-014**: Waits longer than 2 hours (the fridge rest) MUST also get a notification, at the planned end time shown as "Come back at". They still have no countdown. When the page is open at that time, the in-page alert MUST appear, offering "Done, next step" and "Remind me in 15 min" instead of "+1 min".
- **FR-015**: The product MUST work fully when notifications are off, blocked or unavailable, and MUST NOT nag. It asks only when the user opens the control.
- **FR-016**: When the user returns after an alert was missed, the product MUST show the alert with how long ago the timer ended, as feature 001 FR-021 requires.
- **FR-017**: Wording MUST be honest. It MUST say that delivery depends on the phone and network and can be late or missed, and it MUST name calendar alarms as the backup. It MUST NOT promise delivery. On an iPhone browser tab it MUST explain the home-screen requirement before offering notifications. This replaces the "no alerts on a locked or closed page" rule of feature 001 FR-022 with a "no delivery promise" rule.
- **FR-018**: The "notifications on" choice MUST be remembered between visits and cleared by "Clear saved data". It is kept by "Start a new plan", like the mute choice.

**Locked or closed phone (the reminder service)**

- **FR-019**: When notifications are on and the device is online, the product MUST register each wait's end time with a small reminder service run for this project, whenever a timer starts, resumes, or gains a minute, and whenever a long wait begins (the step before it is marked done), so that the phone can be notified when the app is closed or the phone is locked.
- **FR-020**: The registration MUST be cancelled whenever FR-012 removes a notification, and when the user turns notifications off.
- **FR-021**: The reminder service MUST hold only: an address that identifies this phone's notification channel, the timer's end time, and the step name. It MUST NOT receive the plan, size, count, bake day or time, ticks, a name, an email address, a location, an account, or any analytics identifier.
- **FR-022**: The service MUST delete a registration as soon as its reminder has been sent or cancelled, and MUST delete anything left within 24 hours after its end time. A registration is therefore held for at most the length of the wait plus 24 hours (about 2 days for the longest fridge rest). It MUST NOT keep logs that link a delivery address to a step or time.
- **FR-023**: Turning notifications off, or "Clear saved data", MUST ask the service to delete the user's data when the device is online. Anything left is covered by FR-022.
- **FR-024**: The service MUST send only the fixed timer-end message (and its single repeat), only to a phone that opted in through the app, and MUST refuse any other request.
- **FR-025**: The explanation shown before the permission prompt MUST say in plain words what is sent to the reminder service and to the phone's notification channel, that nothing else about the plan is sent, and that it can be turned off at any time.
- **FR-026**: If the reminder service cannot be reached, the product MUST keep the timer, the in-page alert and background notifications working, and MUST tell the user once, in plain words, that the locked-phone reminder could not be set and calendar alarms are the backup. It MUST NOT block or delay the user.
- **FR-027**: With notifications on, a phone that is online and allows notifications MUST get the reminder within 2 minutes of the wait's end time.

**Accessibility**

- **FR-028**: The alert and the control MUST meet the project's accessibility rules: tap targets of 48px or more with 8px spacing, text of 16px or more, WCAG AA contrast in both themes, an accessible name on every control, a screen-reader announcement when the alert appears, no meaning by colour alone, and reduced motion respected.

### Key Entities

- **Timer alert**: The on-screen alert for one wait end. Has the step, the end time, and a state: showing or acted on. The sound repeats while it shows, for up to 5 minutes.
- **Notification setting**: The user's own on or off choice, saved on the device, plus the browser's permission state (not asked, granted, blocked) and whether notifications are available at all.
- **System notification**: The message shown outside the app for one timer end. Has only the step name and fixed text. At most one exists per wait end, plus one repeat 5 minutes later if the user has not reacted.
- **Reminder registration**: What the reminder service holds for one wait: the phone's notification address, the end time and the step name. Deleted when sent or cancelled, and within 24 hours after its end time at the latest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the page open, in 100% of timer ends the alert appears within 1 second on whichever screen the user is on, and it stays until acted on.
- **SC-002**: A user can move on from a finished timer with one tap.
- **SC-003**: A first-time user can turn notifications on in no more than 3 taps including the browser prompt, and no prompt appears before their first tap on the control.
- **SC-004**: With notifications on and the app running in the background on a browser that allows it, the notification appears within 5 seconds of the timer end.
- **SC-005**: With notifications on, a phone that is online and allows notifications gets the reminder within 2 minutes of the end of a wait, including the fridge rest, even when the app is closed or the phone is locked.
- **SC-006**: One wait end never produces more than one notification plus a single repeat 5 minutes later, never more than one alert on screen, no repeat once the user has opened the app or acted on the alert, and a cancelled wait never produces a notification.
- **SC-007**: Where notifications are blocked or unavailable, or the reminder service is down, 100% of existing features still work, and the user sees the reason and one next step.
- **SC-008**: No text in the product promises delivery of an alert, checked by an automated test.
- **SC-009**: The reminder service holds no data about a user's plan and no registration more than 24 hours past its end time, checked by a test of what it receives and stores.
- **SC-010**: Before any notification permission is requested, nothing about the user is sent anywhere, so the existing privacy test still passes for users who never turn notifications on.
- **SC-011** (post-launch measure, not testable inside the product): At least 90% of people who turn notifications on and use them on a real phone say they noticed the timer ending.

## Assumptions

- **Constitution**: Principle IX, the timer-alert rule and the local-data rule were amended (v1.2.0, wording fixed in v1.2.1) to allow one optional reminder service with the data limits in FR-021 to FR-025. The plan must still include a Constitution Check against that exception.
- **Feature 001 changes**: Feature 001 FR-022 ("MUST NOT promise alerts on a locked or closed page") and FR-029 ("MUST NOT send plans to any server") stay true in spirit. FR-017 here replaces the first with a "no delivery promise" rule, and the second is unchanged, because plans are never sent.
- **Third-party channel**: Phones deliver the notification through their browser's or operating system's own notification service. That is outside our control, which is why delivery cannot be promised.
- **Host fit is unverified**: The app is hosted as static files on DreamHost. Running the reminder service there, and how often a scheduled job can run, is unknown and must be checked during planning. The 2 minute target in FR-027 assumes a scheduler that can run every minute. If the host cannot do this, the plan must pick a different place to run it, and that is a decision for you.
- **Platform limits**: On iPhone, notifications only work for a page added to the home screen (iOS 16.4 or newer). On Android and desktop browsers they work from a normal tab once permission is given.
- A wait is a step where the cook does nothing while time passes. Waits of 2 hours or less have a countdown timer; longer waits (the fridge rest) show "Come back at" with no countdown. The product still has one timer at a time, as in feature 001. Both kinds of wait get the alert and notification described here.
- Mute applies to the in-page sound and to notification sound.
- Feature 001's timer rules, calendar alarms, saved state and offline support are reused unchanged. Calendar alarms stay the backup.
- The app is hosted over HTTPS, which browsers require for notifications.
- Dependencies: feature 001 (the timer, step mode, settings, saved state), the project design system, and constitution v1.2.1.
