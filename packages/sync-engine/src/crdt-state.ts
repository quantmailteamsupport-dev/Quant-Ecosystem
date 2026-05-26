import * as Y from 'yjs';
import { z } from 'zod';

export type StateSubscribeCallback<T, K extends keyof T = keyof T> = (key: K, value: T[K]) => void;

export class CRDTState<T extends Record<string, unknown>> {
  private readonly doc: Y.Doc;
  private readonly map: Y.Map<unknown>;
  private readonly schema: z.ZodType<T>;
  private readonly subscribers: Map<keyof T, Set<StateSubscribeCallback<T>>> = new Map();

  constructor(schema: z.ZodType<T>) {
    this.schema = schema;
    this.doc = new Y.Doc();
    this.map = this.doc.getMap<unknown>('state');

    this.map.observe((event) => {
      for (const [key] of event.changes.keys) {
        const keyTyped = key as keyof T;
        const subs = this.subscribers.get(keyTyped);
        if (subs) {
          const value = this.map.get(key) as T[typeof keyTyped];
          for (const cb of subs) {
            cb(keyTyped, value);
          }
        }
      }
    });
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.map.get(key as string) as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    // Validate the individual field using schema.shape if available (z.object()),
    // otherwise fall back to full-object validation via schema.parse()
    const schemaWithShape = this.schema as unknown as {
      shape?: Record<string, z.ZodType<unknown>>;
    };
    if (schemaWithShape.shape && (key as string) in schemaWithShape.shape) {
      const fieldSchema = schemaWithShape.shape[key as string];
      if (fieldSchema) {
        fieldSchema.parse(value);
      }
    } else {
      // For refined/transformed schemas without .shape, validate the full snapshot.
      // Only validate if the snapshot is complete (all fields set); otherwise
      // field-level validation is not possible without .shape and we defer to
      // full-object validation once the state is populated.
      const current = this.getSnapshot();
      const candidate = { ...current, [key]: value };
      const result = this.schema.safeParse(candidate);
      if (!result.success) {
        // Check if failures relate to the field being set or to refinement checks
        const fieldErrors = result.error.issues.filter(
          (issue) =>
            (issue.path.length > 0 && issue.path[0] === key) ||
            (issue.path.length === 0 && issue.code === 'custom'),
        );
        if (fieldErrors.length > 0) {
          throw result.error;
        }
        // If only errors are on other (unset) fields, allow the write -
        // state is still being built incrementally
      }
    }
    this.map.set(key as string, value);
  }

  subscribe<K extends keyof T>(key: K, callback: StateSubscribeCallback<T, K>): () => void {
    let subs = this.subscribers.get(key);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(key, subs);
    }
    subs.add(callback as StateSubscribeCallback<T>);
    return () => {
      subs!.delete(callback as StateSubscribeCallback<T>);
      if (subs!.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  getSnapshot(): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.map.entries()) {
      result[key] = value;
    }
    return result as T;
  }

  applySnapshot(data: Partial<T>): void {
    this.doc.transact(() => {
      for (const [key, value] of Object.entries(data)) {
        this.map.set(key, value);
      }
    });
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }
}
