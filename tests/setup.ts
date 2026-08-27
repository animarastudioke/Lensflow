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

// jsdom implements neither the pointer-capture API nor scrollIntoView, and
// Radix's Popper-based menus (DropdownMenu, Select, ContextMenu) call
// hasPointerCapture()/scrollIntoView() during their open/typeahead
// handling -- without these no-op stubs, clicking a trigger in jsdom throws
// (or silently fails to open) even though the same click works in a real
// browser.
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = () => false
}
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = () => {}
}
if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = () => {}
}
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {}
}
