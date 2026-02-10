import { describe, test, expect } from 'vitest';
import { sanitizeString, sanitizeInput } from '../../server/lib/sanitize';

describe('Input Sanitization', () => {
  test('strips HTML tags from strings', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    expect(sanitizeString('<b>Bold</b> text')).toBe('Bold text');
    expect(sanitizeString('<img src=x onerror=alert(1)>')).toBe('');
  });

  test('removes control characters', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
    expect(sanitizeString('test\x07value')).toBe('testvalue');
  });

  test('preserves newlines and tabs', () => {
    expect(sanitizeString('line1\nline2')).toBe('line1\nline2');
    expect(sanitizeString('col1\tcol2')).toBe('col1\tcol2');
  });

  test('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  test('sanitizeInput recursively cleans objects', () => {
    const input = {
      name: '<script>alert(1)</script>Max',
      nested: {
        email: '<b>test@test.at</b>',
        count: 42,
      },
      tags: ['<i>tag1</i>', 'tag2'],
    };

    const result = sanitizeInput(input);
    expect(result.name).toBe('alert(1)Max');
    expect(result.nested.email).toBe('test@test.at');
    expect(result.nested.count).toBe(42);
    expect(result.tags[0]).toBe('tag1');
    expect(result.tags[1]).toBe('tag2');
  });

  test('handles null and undefined gracefully', () => {
    expect(sanitizeInput(null)).toBeNull();
    expect(sanitizeInput(undefined)).toBeUndefined();
  });

  test('passes through non-string primitives', () => {
    expect(sanitizeInput(42)).toBe(42);
    expect(sanitizeInput(true)).toBe(true);
  });
});
