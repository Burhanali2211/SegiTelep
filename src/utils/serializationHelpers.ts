// Serialization helpers for safe storage operations
// Ensures only JSON-serializable data is stored, preventing runtime objects from corrupting storage

/**
 * List of keys that should never be serialized to storage
 * These represent runtime-only state that cannot be persisted
 */
const NON_SERIALIZABLE_KEYS = new Set([
  'audioElement',
  'videoElement',
  'canvasContext',
  'imageElement',
  'ref',
  'refs',
  'domElement',
  'window',
  'document',
  'event',
  'nativeEvent',
]);

/**
 * Checks if a value is a DOM element or other non-serializable runtime object
 */
function isNonSerializable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'function') return true;
  if (value instanceof Element) return true;
  if (value instanceof HTMLElement) return true;
  if (value instanceof Event) return true;
  if (value instanceof Window) return true;
  if (value instanceof Document) return true;
  if (typeof value === 'object' && value !== null) {
    const proto = Object.getPrototypeOf(value);
    const constructorName = proto?.constructor?.name;
    if (constructorName && (
      constructorName.includes('Element') ||
      constructorName.includes('Node') ||
      constructorName.includes('Event') ||
      constructorName === 'HTMLAudioElement' ||
      constructorName === 'HTMLVideoElement' ||
      constructorName === 'HTMLImageElement' ||
      constructorName === 'CanvasRenderingContext2D' ||
      constructorName === 'WebGLRenderingContext'
    )) {
      return true;
    }
  }
  return false;
}

/**
 * Safely deep clones an object, converting non-serializable values
 * - Sets -> Arrays
 * - Maps -> Objects
 * - Non-serializable values -> null
 */
export function safeSerialize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  try {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      // Skip non-serializable keys
      if (NON_SERIALIZABLE_KEYS.has(key)) {
        return undefined;
      }
      
      // Convert Sets to arrays
      if (value instanceof Set) {
        return Array.from(value);
      }
      
      // Convert Maps to objects
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      
      // Skip non-serializable values
      if (isNonSerializable(value)) {
        console.warn(`[Serialization] Skipping non-serializable value for key: ${key}`);
        return undefined;
      }
      
      return value;
    }));
  } catch (error) {
    console.error('[Serialization] Failed to serialize object:', error);
    // Return a safe empty version based on type
    if (Array.isArray(obj)) return [] as T;
    return {} as T;
  }
}

/**
 * Validates that an object is JSON-serializable
 * Returns true if safe, false if contains non-serializable data
 */
export function isSerializable(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true;
  if (typeof obj !== 'object') return true;
  
  try {
    JSON.stringify(obj);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep clones state specifically for undo/redo, handling Sets properly
 */
export function cloneStateForHistory<T extends Record<string, unknown>>(state: T): T {
  const clone: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(state)) {
    if (value instanceof Set) {
      // Keep as Set for runtime use
      clone[key] = new Set(value);
    } else if (value instanceof Map) {
      clone[key] = new Map(value);
    } else if (Array.isArray(value)) {
      clone[key] = JSON.parse(JSON.stringify(value));
    } else if (value !== null && typeof value === 'object') {
      clone[key] = JSON.parse(JSON.stringify(value));
    } else {
      clone[key] = value;
    }
  }
  
  return clone as T;
}

/**
 * Normalizes project data before storage
 * Ensures all data is in a consistent, serializable format
 */
export function normalizeProjectData<T extends Record<string, unknown>>(project: T): T {
  return safeSerialize(project);
}
