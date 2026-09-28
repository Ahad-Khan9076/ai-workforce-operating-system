import { describe, it, expect } from 'vitest';
import { getOrgWorkDate } from './workforce-time.util.js';

describe('org timezone work date', () => {
  it('uses organization timezone for work date boundary', () => {
    const instant = new Date('2025-09-29T22:30:00.000Z');
    expect(getOrgWorkDate(instant, 'UTC')).toBe('2025-09-29');
    expect(getOrgWorkDate(instant, 'Asia/Karachi')).toBe('2025-09-30');
  });
});
