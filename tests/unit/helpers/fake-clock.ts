import type { Clock, Instant } from '../../../src/platform/clock';

export class FakeClock implements Clock {
  constructor(private t: Instant = 0) {}
  now(): Instant {
    return this.t;
  }
  set(instant: Instant): void {
    this.t = instant;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}
