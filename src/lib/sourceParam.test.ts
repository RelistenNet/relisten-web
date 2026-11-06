import { describe, expect, it } from 'vitest';
import { fromSourceParam, isLegacySourceParam, toSourceParam } from './sourceParam';

const id = 'source_7bbw2e16a0h9ssczd3bwzgv1wp';
const param = '7bbw2e16a0h9ssczd3bwzgv1wp';

describe('toSourceParam', () => {
  it.each([
    [id, param],
    [param, param],
    [undefined, ''],
    [null, ''],
    ['', ''],
    // Only a leading prefix is stripped.
    ['abc_source_x', 'abc_source_x'],
  ])('%s → %j', (input, expected) => {
    expect(toSourceParam(input)).toBe(expected);
  });
});

describe('fromSourceParam', () => {
  it.each([
    [param, id],
    [id, id],
    [undefined, ''],
    [null, ''],
    ['', ''],
  ])('%s → %j', (input, expected) => {
    expect(fromSourceParam(input)).toBe(expected);
  });

  it('round-trips with toSourceParam', () => {
    expect(fromSourceParam(toSourceParam(id))).toBe(id);
    expect(toSourceParam(fromSourceParam(param))).toBe(param);
  });
});

describe('isLegacySourceParam', () => {
  it.each([
    ['123456', true],
    ['1', true],
    ['1234567890', true],
    ['12345678901', false],
    ['4dd4e9a2-1b6d-4d6b-9c4f-0f2d1c8e6a77', true],
    ['4DD4E9A2-1B6D-4D6B-9C4F-0F2D1C8E6A77', true],
    ['4dd4e9a2-1b6d-4d6b-9c4f-0f2d1c8e6a7', false],
    [param, false],
    [id, false],
    ['12a', false],
    ['', false],
    [undefined, false],
    [null, false],
  ])('%s → %s', (input, expected) => {
    expect(isLegacySourceParam(input)).toBe(expected);
  });
});
