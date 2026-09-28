import "@testing-library/jest-dom/vitest";

// jsdom não implementa estas APIs, usadas pelo posicionamento dos menus (Radix Popper).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.scrollTo ??= () => {};

// jsdom também não tem matchMedia: nos testes nenhuma media query casa (desktop, sem
// "reduzir movimento"); cada teste que depende disso faz o seu próprio stub.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
