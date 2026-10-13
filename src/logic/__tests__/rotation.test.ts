import { nextInRotation } from '../rotation';

const push = { id: 1, rotationOrder: 0 };
const pull = { id: 2, rotationOrder: 1 };
const legs = { id: 3, rotationOrder: 2 };
const arms = { id: 4, rotationOrder: null };

describe('nextInRotation', () => {
  test('returns null when no template is in the rotation', () => {
    expect(nextInRotation([arms], null)).toBeNull();
  });

  test('starts with the first template when there is no history', () => {
    expect(nextInRotation([legs, pull, push], null)).toBe(push);
  });

  test('suggests the template after the last one done', () => {
    expect(nextInRotation([push, pull, legs], push.id)).toBe(pull);
  });

  test('wraps around after the last template', () => {
    expect(nextInRotation([push, pull, legs], legs.id)).toBe(push);
  });

  test('restarts at the first template when the last one left the rotation', () => {
    expect(nextInRotation([push, pull, legs, arms], arms.id)).toBe(push);
  });

  test('skips archived templates', () => {
    const archivedPull = { ...pull, archived: true };
    expect(nextInRotation([push, archivedPull, legs], push.id)).toBe(legs);
  });
});
