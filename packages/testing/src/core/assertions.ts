// ============================================================================
// Quant Ecosystem - Testing Framework: Assertions
// Chainable expect() with deep equality, custom matchers, and .not modifier
// ============================================================================

import type { Matcher, MatcherResult } from '../types';

/**
 * Deep equality comparison that handles all JS types including
 * circular references, Maps, Sets, Dates, RegExp, typed arrays
 */
function deepEqual(a: unknown, b: unknown, seen: Map<unknown, unknown> = new Map()): boolean {
  // Strict equality check
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Handle NaN
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return a === b;
  }

  // Primitive types
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Circular reference detection
  if (seen.has(a)) {
    return seen.get(a) === b;
  }
  seen.set(a, b);

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date || b instanceof Date) return false;

  // RegExp comparison
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  if (a instanceof RegExp || b instanceof RegExp) return false;

  // Map comparison
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqual(val, b.get(key), seen)) return false;
    }
    return true;
  }
  if (a instanceof Map || b instanceof Map) return false;

  // Set comparison
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      let found = false;
      for (const bVal of b) {
        if (deepEqual(val, bVal, seen)) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) return false;

  // ArrayBuffer comparison
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) return false;
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }

  // TypedArray comparison
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    const viewA = a as unknown as { length: number; [index: number]: number };
    const viewB = b as unknown as { length: number; [index: number]: number };
    if (viewA.length !== viewB.length) return false;
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) return false;
    }
    return true;
  }

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Error comparison
  if (a instanceof Error && b instanceof Error) {
    return a.message === b.message && a.name === b.name;
  }

  // Object comparison
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as any)[key], (b as any)[key], seen)) return false;
  }

  return true;
}

/**
 * Gets a nested property from an object by dot-separated path
 */
function getNestedProperty(obj: unknown, path: string): { exists: boolean; value: unknown } {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return { exists: false, value: undefined };
    }
    if (typeof current !== 'object') {
      return { exists: false, value: undefined };
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return { exists: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[part];
  }

  return { exists: true, value: current };
}

/**
 * Serializes a value for assertion error messages
 */
function serialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof RegExp) return value.toString();
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '[Circular]'; }
  }
  return String(value);
}

/** Custom matchers registry */
const customMatchers: Map<string, Matcher> = new Map();

/**
 * Expect class - provides chainable assertions with .not modifier
 */
export class Expect<T = unknown> {
  private value: T;
  private negated: boolean;

  constructor(value: T, negated: boolean = false) {
    this.value = value;
    this.negated = negated;
  }

  /**
   * Returns a negated assertion chain
   */
  get not(): Expect<T> {
    return new Expect(this.value, !this.negated);
  }

  private assert(pass: boolean, message: string, expected?: unknown, actual?: unknown): void {
    const finalPass = this.negated ? !pass : pass;
    if (!finalPass) {
      const err = new Error(message) as any;
      err.expected = expected;
      err.actual = actual;
      err.operator = this.negated ? 'not' : 'equal';
      throw err;
    }
  }

  /**
   * Strict equality (===)
   */
  toBe(expected: unknown): void {
    const pass = Object.is(this.value, expected);
    const prefix = this.negated ? 'Expected value not to be' : 'Expected value to be';
    this.assert(pass, `${prefix} ${serialize(expected)}, but received ${serialize(this.value)}`, expected, this.value);
  }

  /**
   * Value equality using deepEqual
   */
  toEqual(expected: unknown): void {
    const pass = deepEqual(this.value, expected);
    const prefix = this.negated ? 'Expected values not to be equal' : 'Expected values to be equal';
    this.assert(pass, `${prefix}.\nExpected: ${serialize(expected)}\nReceived: ${serialize(this.value)}`, expected, this.value);
  }

  /**
   * Deep recursive equality (alias for toEqual with full structural comparison)
   */
  toDeepEqual(expected: unknown): void {
    const pass = deepEqual(this.value, expected);
    const prefix = this.negated ? 'Expected values not to be deeply equal' : 'Expected values to be deeply equal';
    this.assert(pass, `${prefix}.\nExpected: ${serialize(expected)}\nReceived: ${serialize(this.value)}`, expected, this.value);
  }

  /**
   * Asserts that a function throws
   */
  toThrow(expected?: string | RegExp): void {
    if (typeof this.value !== 'function') {
      throw new Error('toThrow() requires the value to be a function');
    }
    let threw = false;
    let thrownError: unknown;
    try {
      (this.value as Function)();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    if (expected === undefined) {
      this.assert(threw, this.negated ? 'Expected function not to throw' : 'Expected function to throw, but it did not');
    } else {
      if (!threw) {
        this.assert(false, 'Expected function to throw, but it did not');
        return;
      }
      const message = thrownError instanceof Error ? thrownError.message : String(thrownError);
      const pass = expected instanceof RegExp ? expected.test(message) : message.includes(expected);
      this.assert(pass, `Expected thrown error to match ${serialize(expected)}, but got "${message}"`);
    }
  }

  /**
   * Alias for toThrow with message matching
   */
  toThrowError(expected?: string | RegExp): void {
    this.toThrow(expected);
  }

  /**
   * Asserts value is null
   */
  toBeNull(): void {
    const pass = this.value === null;
    this.assert(pass, `Expected ${serialize(this.value)} ${this.negated ? 'not ' : ''}to be null`);
  }

  /**
   * Asserts value is undefined
   */
  toBeUndefined(): void {
    const pass = this.value === undefined;
    this.assert(pass, `Expected ${serialize(this.value)} ${this.negated ? 'not ' : ''}to be undefined`);
  }

  /**
   * Asserts value is defined (not undefined)
   */
  toBeDefined(): void {
    const pass = this.value !== undefined;
    this.assert(pass, `Expected value ${this.negated ? 'not ' : ''}to be defined`);
  }

  /**
   * Asserts value is truthy
   */
  toBeTruthy(): void {
    const pass = !!this.value;
    this.assert(pass, `Expected ${serialize(this.value)} ${this.negated ? 'not ' : ''}to be truthy`);
  }

  /**
   * Asserts value is falsy
   */
  toBeFalsy(): void {
    const pass = !this.value;
    this.assert(pass, `Expected ${serialize(this.value)} ${this.negated ? 'not ' : ''}to be falsy`);
  }

  /**
   * Asserts array/string contains item
   */
  toContain(item: unknown): void {
    let pass = false;
    if (Array.isArray(this.value)) {
      pass = this.value.some(v => deepEqual(v, item));
    } else if (typeof this.value === 'string') {
      pass = this.value.includes(item as string);
    } else if (this.value instanceof Set) {
      for (const v of this.value) {
        if (deepEqual(v, item)) { pass = true; break; }
      }
    }
    this.assert(pass, `Expected ${serialize(this.value)} ${this.negated ? 'not ' : ''}to contain ${serialize(item)}`);
  }

  /**
   * Asserts string matches pattern
   */
  toMatch(pattern: RegExp | string): void {
    const strValue = String(this.value);
    const pass = pattern instanceof RegExp ? pattern.test(strValue) : strValue.includes(pattern);
    this.assert(pass, `Expected "${strValue}" ${this.negated ? 'not ' : ''}to match ${serialize(pattern)}`);
  }

  /**
   * Asserts numeric value is greater than expected
   */
  toBeGreaterThan(n: number): void {
    const pass = (this.value as number) > n;
    this.assert(pass, `Expected ${this.value} ${this.negated ? 'not ' : ''}to be greater than ${n}`);
  }

  /**
   * Asserts numeric value is less than expected
   */
  toBeLessThan(n: number): void {
    const pass = (this.value as number) < n;
    this.assert(pass, `Expected ${this.value} ${this.negated ? 'not ' : ''}to be less than ${n}`);
  }

  /**
   * Float comparison with precision
   */
  toBeCloseTo(n: number, precision: number = 2): void {
    const factor = Math.pow(10, precision);
    const pass = Math.round((this.value as number) * factor) === Math.round(n * factor);
    this.assert(pass, `Expected ${this.value} ${this.negated ? 'not ' : ''}to be close to ${n} (precision: ${precision})`);
  }

  /**
   * Asserts array/string has specific length
   */
  toHaveLength(length: number): void {
    const actual = (this.value as any)?.length;
    const pass = actual === length;
    this.assert(pass, `Expected length ${length}, but received ${actual}`);
  }

  /**
   * Asserts object has property at path (with optional value check)
   */
  toHaveProperty(path: string, expectedValue?: unknown): void {
    const result = getNestedProperty(this.value, path);
    if (expectedValue !== undefined) {
      const pass = result.exists && deepEqual(result.value, expectedValue);
      this.assert(pass, `Expected property "${path}" to equal ${serialize(expectedValue)}, got ${serialize(result.value)}`);
    } else {
      this.assert(result.exists, `Expected object to have property "${path}"`);
    }
  }

  /**
   * Asserts value is instance of constructor
   */
  toBeInstanceOf(constructor: Function): void {
    const pass = this.value instanceof (constructor as any);
    this.assert(pass, `Expected value ${this.negated ? 'not ' : ''}to be instance of ${constructor.name}`);
  }

  /**
   * Asserts object partially matches expected
   */
  toMatchObject(partial: Record<string, unknown>): void {
    if (typeof this.value !== 'object' || this.value === null) {
      this.assert(false, 'Expected value to be an object for toMatchObject');
      return;
    }
    const pass = matchesPartial(this.value as Record<string, unknown>, partial);
    this.assert(pass, `Expected object to ${this.negated ? 'not ' : ''}match ${serialize(partial)}`);
  }

  /**
   * Runs a custom matcher by name
   */
  customMatcher(name: string, ...args: unknown[]): void {
    const matcher = customMatchers.get(name);
    if (!matcher) {
      throw new Error(`Custom matcher "${name}" is not registered`);
    }
    const result = matcher.fn(this.value, ...args);
    this.assert(result.pass, result.message);
  }
}

/**
 * Checks if object partially matches the expected structure
 */
function matchesPartial(received: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const key of Object.keys(expected)) {
    if (!Object.prototype.hasOwnProperty.call(received, key)) return false;
    const expVal = expected[key];
    const recVal = received[key];
    if (typeof expVal === 'object' && expVal !== null && !Array.isArray(expVal)) {
      if (typeof recVal !== 'object' || recVal === null) return false;
      if (!matchesPartial(recVal as Record<string, unknown>, expVal as Record<string, unknown>)) return false;
    } else {
      if (!deepEqual(recVal, expVal)) return false;
    }
  }
  return true;
}

/**
 * Factory function to create Expect instance
 */
export function expect<T>(value: T): Expect<T> {
  return new Expect(value);
}

/**
 * Registers a custom matcher for use with expect
 */
export function registerMatcher(name: string, fn: (received: unknown, ...args: unknown[]) => MatcherResult): void {
  customMatchers.set(name, { name, fn });
}

/**
 * Clears all registered custom matchers
 */
export function clearMatchers(): void {
  customMatchers.clear();
}

/**
 * Export deepEqual for use in other modules
 */
export { deepEqual };
