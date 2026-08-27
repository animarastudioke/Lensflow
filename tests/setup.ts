import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver -- several Radix primitives (e.g. the
// useSize hook backing Switch/Tabs) call `new ResizeObserver(...)` in a
// layout effect on mount, which throws under jsdom and silently breaks
// interaction in any test that renders them. This is a no-op stub, not a
// polyfill of real resize behavior -- component tests don't depend on
// actual resize notifications.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
