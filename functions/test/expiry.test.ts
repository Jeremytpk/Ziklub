import { describe, expect, it } from 'vitest';
import * as core from '../../packages/core/src/room';
import { decide, EMPTY_ROOM_TIMEOUT_MS, ROOM_MAX_AGE_MS } from '../src/expiry';

const H = 60 * 60 * 1000;
const M = 60 * 1000;

describe('room clean-up decisions', () => {
  it('uses the same limits as the app', () => {
    expect(ROOM_MAX_AGE_MS).toBe(core.ROOM_MAX_AGE_MS);
    expect(EMPTY_ROOM_TIMEOUT_MS).toBe(core.EMPTY_ROOM_TIMEOUT_MS);
  });
  it('erases rooms after 3 hours, even with people in them', () => {
    expect(decide({ createdAt: 0 }, 5, 3 * H - 1)).toBe('keep');
    expect(decide({ createdAt: 0 }, 5, 3 * H)).toBe('erase');
  });
  it('erases closed rooms and leftovers', () => {
    expect(decide({ createdAt: 0, closedBy: 'Maya' }, 2, M)).toBe('erase');
    expect(decide(null, 0, M)).toBe('erase');
  });
  it('erases a room 15 minutes after the last person left', () => {
    expect(decide({ createdAt: 0 }, 0, 10 * M)).toBe('mark-empty');
    expect(decide({ createdAt: 0, emptySince: 10 * M }, 0, 24 * M)).toBe('keep');
    expect(decide({ createdAt: 0, emptySince: 10 * M }, 0, 25 * M)).toBe('erase');
  });
  it('forgets the empty timer when someone comes back', () => {
    expect(decide({ createdAt: 0, emptySince: 10 * M }, 1, 20 * M)).toBe('clear-empty');
  });
});
