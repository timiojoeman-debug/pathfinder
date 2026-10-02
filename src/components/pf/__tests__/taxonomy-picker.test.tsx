import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { IndustryPicker, RolePicker, StagePicker } from '../taxonomy-picker';
import { INDUSTRIES, ROLES, STAGES } from '@/lib/pf/taxonomy';

function Role({ initial = null, spy }: { initial?: string | null; spy?: (v: string | null) => void }) {
  const [v, setV] = useState<string | null>(initial);
  return <RolePicker value={v} onPick={(x) => { spy?.(x); setV(x); }} />;
}

describe('RolePicker', () => {
  it('shows the common roles first and reveals the rest on request', () => {
    render(<Role />);
    expect(screen.getByText('Full-Stack')).toBeTruthy();
    expect(screen.queryByText('Game development')).toBeNull();
    fireEvent.click(screen.getByText(`Show all ${ROLES.length} roles`));
    expect(screen.getByText('Game development')).toBeTruthy();
    expect(screen.getByText('Developer relations')).toBeTruthy();
    expect(screen.getByText(/Show fewer roles/)).toBeTruthy();
  });

  it('keeps a selected uncommon role visible while collapsed', () => {
    render(<Role initial="Game development" />);
    expect(screen.getByText('Game development').getAttribute('aria-pressed')).toBe('true');
  });

  it('lets the student type their own role and says suggestions are less tailored', () => {
    const spy = vi.fn();
    render(<Role spy={spy} />);
    fireEvent.click(screen.getByText('Other role'));
    fireEvent.change(screen.getByLabelText('Other role'), { target: { value: ' Hardware verification ' } });
    expect(spy).toHaveBeenLastCalledWith('Hardware verification');
    expect(screen.getByText(/less tailored/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Other role'), { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith(null);
  });

  it('picks a role by its label', () => {
    const spy = vi.fn();
    render(<Role spy={spy} />);
    fireEvent.click(screen.getByText('UX / Product design'));
    expect(spy).toHaveBeenCalledWith('UX / Product design');
  });
});

describe('IndustryPicker and StagePicker', () => {
  it('collapses industries to the common ones and offers all of them', () => {
    render(<IndustryPicker value={null} onPick={() => {}} />);
    expect(screen.getByText('Fintech')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.queryByText('Telecoms')).toBeNull();
    fireEvent.click(screen.getByText(`Show all ${INDUSTRIES.length} industries`));
    expect(screen.getByText('Telecoms')).toBeTruthy();
  });

  it('shows every company type at once', () => {
    render(<StagePicker value="Scaleups" onPick={() => {}} />);
    for (const s of STAGES) expect(screen.getByText(s.label)).toBeTruthy();
  });
});
