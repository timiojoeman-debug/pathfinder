import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NaturalnessBadge, NaturalnessNote } from '../networking/naturalness-note';

/**
 * The networking header used to show a hardcoded "reads natural" badge on every
 * message, including ones nobody had scored. These tests pin the replacement's
 * central rule: with no verdict the component claims nothing at all, and when
 * there is a verdict it reports the unflattering ones as readily as the good.
 */

describe('NaturalnessBadge', () => {
  it('renders nothing rather than defaulting to a pass', () => {
    const { container: none } = render(<NaturalnessBadge result={null} />);
    expect(none).toBeEmptyDOMElement();

    const { container: undef } = render(<NaturalnessBadge result={undefined} />);
    expect(undef).toBeEmptyDOMElement();

    // A score with no verdict is not a verdict.
    const { container: scoreOnly } = render(<NaturalnessBadge result={{ score: 91 }} />);
    expect(scoreOnly).toBeEmptyDOMElement();
  });

  it('reports a bad verdict, not just a good one', () => {
    render(<NaturalnessBadge result={{ verdict: 'heavily_ai', score: 22 }} />);
    expect(screen.getByText(/reads AI-written/)).toBeTruthy();
    expect(screen.getByText(/22/)).toBeTruthy();
  });

  it('shows the verdict without a score when none was given', () => {
    render(<NaturalnessBadge result={{ verdict: 'needs_editing' }} />);
    const el = screen.getByText(/needs editing/);
    expect(el.textContent).not.toContain('·');
  });
});

describe('NaturalnessNote', () => {
  it('renders nothing without a verdict', () => {
    const { container } = render(<NaturalnessNote result={{ issues: [{ description: 'x' }] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists what to fix, combining the description with its suggestion', () => {
    render(
      <NaturalnessNote
        result={{
          verdict: 'needs_editing',
          score: 58,
          issues: [
            { description: 'Three em-dashes in four sentences', suggestion: 'Cut two' },
            { description: 'Opens with a formal cliche' },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Three em-dashes in four sentences: Cut two/)).toBeTruthy();
    expect(screen.getByText(/Opens with a formal cliche/)).toBeTruthy();
  });

  it('shows the badge alone when the message scored clean', () => {
    render(<NaturalnessNote result={{ verdict: 'natural', score: 96, issues: [] }} />);

    expect(screen.getByText(/reads natural/)).toBeTruthy();
    expect(screen.queryByText(/Worth editing/)).toBeNull();
  });

  it('drops issues that carry no readable text', () => {
    render(<NaturalnessNote result={{ verdict: 'mostly_natural', issues: [{ type: 'buzzword' }] }} />);

    expect(screen.queryByText(/Worth editing/)).toBeNull();
  });
});
