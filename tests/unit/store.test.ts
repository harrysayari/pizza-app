import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/state/store';
import { mountApp } from '../../src/ui/app';

describe('store', () => {
  it('starts with the documented defaults', () => {
    const s = createStore().getState();
    expect(s.progress.screen).toBe('plan');
    expect(s.preferences).toEqual({ muted: false, keepScreenOn: true, theme: 'system' });
    expect(s.request).toBeNull();
    expect(s.bakeAt).toBeNull();
    expect(s.fridgeMinutes).toBeNull();
    expect(s.plan).toBeNull();
    expect(s.ticked).toEqual({});
    expect(s.doneAt).toEqual({});
    expect(s.timer).toBeNull();
  });

  it('update merges a patch and notifies subscribers with the new state', () => {
    const store = createStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.update({ fridgeMinutes: 1080 });
    expect(store.getState().fridgeMinutes).toBe(1080);
    expect(store.getState().preferences.theme).toBe('system');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0].fridgeMinutes).toBe(1080);
  });

  it('unsubscribe stops notifications', () => {
    const store = createStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.update({ bakeAt: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not mutate the previous state object', () => {
    const store = createStore();
    const before = store.getState();
    store.update({ bakeAt: 5 });
    expect(before.bakeAt).toBeNull();
  });
});

describe('app shell', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('renders the current screen and switches on state change', () => {
    const store = createStore();
    mountApp(root, store);
    expect(root.querySelector('[data-screen="plan"]')).not.toBeNull();
    store.update({ progress: { ...store.getState().progress, screen: 'schedule' } });
    expect(root.querySelector('[data-screen="schedule"]')).not.toBeNull();
    expect(root.querySelector('[data-screen="plan"]')).toBeNull();
    store.update({ progress: { ...store.getState().progress, screen: 'steps' } });
    expect(root.querySelector('[data-screen="steps"]')).not.toBeNull();
  });

  it('sets data-theme from preferences and leaves it unset for system', () => {
    const store = createStore();
    mountApp(root, store);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    store.update({ preferences: { ...store.getState().preferences, theme: 'dark' } });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    store.update({ preferences: { ...store.getState().preferences, theme: 'system' } });
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
