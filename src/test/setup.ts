import '@testing-library/jest-dom';

// jsdom implements neither of these, but several presentational components read
// them on mount (Reveal/PageHeader via window.matchMedia, scroll-reveal via
// IntersectionObserver). Provide inert defaults so rendering a component in a
// test never throws; individual tests still override matchMedia when they need
// to assert reduced-motion behaviour.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
