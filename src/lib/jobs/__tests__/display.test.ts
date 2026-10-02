import { describe, it, expect } from 'vitest';
import { postedAgo, ukByDefault } from '../display';
import { isUkLocation } from '../types';

const NOW = Date.parse('2026-10-10T12:00:00Z');

describe('postedAgo', () => {
  it('counts whole days', () => {
    expect(postedAgo('2026-10-10T01:00:00Z', NOW)).toBe('posted today');
    expect(postedAgo('2026-10-09T01:00:00Z', NOW)).toBe('posted 1 day ago');
    expect(postedAgo('2026-10-01T12:00:00Z', NOW)).toBe('posted 9 days ago');
  });
  it('is null, never invented, when the date is missing or unreadable', () => {
    expect(postedAgo(null, NOW)).toBeNull();
    expect(postedAgo(undefined, NOW)).toBeNull();
    expect(postedAgo('', NOW)).toBeNull();
    expect(postedAgo('not a date', NOW)).toBeNull();
  });
  it('treats a slightly future timestamp (clock skew) as today', () => {
    expect(postedAgo('2026-10-10T13:00:00Z', NOW)).toBe('posted today');
  });
});

describe('ukByDefault', () => {
  it('is true only for en-GB', () => {
    expect(ukByDefault('en-GB')).toBe(true);
    expect(ukByDefault('en-gb')).toBe(true);
    expect(ukByDefault('en-US')).toBe(false);
    expect(ukByDefault('en')).toBe(false);
    expect(ukByDefault(undefined)).toBe(false);
  });
});

describe('isUkLocation', () => {
  it.each(['London, UK', 'London', 'Cardiff, London or Remote (UK)', 'Remote - United Kingdom', 'Edinburgh, Scotland', 'London · New York', 'Cambridge, England', 'London, GB', 'Edinburgh, GB', 'Belfast, Northern Ireland', 'Washington, UK'])(
    'accepts %s',
    (l) => expect(isUkLocation(l)).toBe(true),
  );
  it.each(['Remote', 'New York, NY', 'Cambridge, MA', 'Birmingham, AL', 'Reading, PA', 'Dublin, Ireland', 'San Francisco · Austin', 'Location not stated', 'Remote (Canada)', 'Sydney, New South Wales', 'New England', 'Cambridge, Massachusetts', 'Birmingham, Alabama', 'London, Ontario'])(
    'rejects %s',
    (l) => expect(isUkLocation(l)).toBe(false),
  );
});
