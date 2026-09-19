import "@testing-library/jest-dom/vitest";

// jsdom não implementa estas APIs, usadas pelo posicionamento dos menus (Radix Popper).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.scrollIntoView ??= () => {};
