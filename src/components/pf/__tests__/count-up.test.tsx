import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountUp } from '../ui';

/**
 * CountUp used to push its number into state from inside an effect — including
 * a synchronous `setDisplay(value)` on the reduced-motion path, which is a
 * cascading render (and an eslint error). The number is now *derived* from an
 * eased progress value, so these tests pin the two branches that behaviour
 * depends on: honour reduced motion immediately, and start from zero when we
 * are going to animate.
 */

function mockReducedMotion(prefersReduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: prefersReduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

/** jsdom has no IntersectionObserver; CountUp must not crash without it. */
function removeIntersectionObserver() {
  vi.stubGlobal('IntersectionObserver', undefined);
  // `"IntersectionObserver" in window` must be false for the fallback path.
  delete (window as unknown as Record<string, unknown>).IntersectionObserver;
}

describe('CountUp', () => {
  beforeEach(() => removeIntersectionObserver());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the final number immediately when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    render(<CountUp value={87} />);
    // No animation is allowed to run, so the value must be there on first paint.
    expect(screen.getByText('87')).toBeInTheDocument();
  });

  it('starts from zero when it is going to animate', () => {
    mockReducedMotion(false);
    render(<CountUp value={87} />);
    // Progress starts at 0, so the rendered number does too — the count-up
    // itself advances via requestAnimationFrame.
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders without an IntersectionObserver present', () => {
    mockReducedMotion(false);
    expect(() => render(<CountUp value={5} />)).not.toThrow();
  });
});
