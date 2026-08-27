import { createRequire } from 'module';

let extractor: any = null;
let extractorPromise: Promise<any> | null = null;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DIM = 384;

export const VECTOR_DIM = DIM;
export const VECTOR_MODEL = MODEL_ID;

async function getExtractor() {
  if (extractor) return extractor;
  if (extractorPromise) return extractorPromise;
  extractorPromise = (async () => {
    // @xenova/transformers is ESM-only; dynamic import
    const { pipeline } = await import('@xenova/transformers');
    // @ts-ignore - pipeline types are dynamic
    const pipe = await (pipeline as any)('feature-extraction', MODEL_ID, {
      // quantized: true // smaller model not needed
    });
    extractor = pipe;
    return pipe;
  })();
  extractor = await extractorPromise;
  return extractor;
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const pipe = await getExtractor();
  const outputs: Float32Array[] = [];
  for (const text of texts) {
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    // output is Tensor with data Float32Array
    const data = (output as any).data as Float32Array;
    // ensure dim 384
    if (data.length !== DIM) {
      // truncate/pad (should not happen)
      const arr = new Float32Array(DIM);
      arr.set(data.subarray(0, Math.min(data.length, DIM)));
      outputs.push(arr);
    } else {
      outputs.push(new Float32Array(data));
    }
  }
  return outputs;
}

export async function embedText(text: string): Promise<Float32Array> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export function toJson(vec: Float32Array): string {
  return JSON.stringify(Array.from(vec));
}

export function fromJson(json: string): Float32Array {
  return new Float32Array(JSON.parse(json));
}

// sqlite-vec helper: format Float32Array as JSON string for MATCH
export function toVecString(vec: Float32Array): string {
  return JSON.stringify(Array.from(vec));
}

// Lazy loader for sqlite-vec extension per db
let vecLoadAttempted = new WeakMap<any, boolean>();
export async function ensureVecExtension(db: any): Promise<boolean> {
  if (vecLoadAttempted.has(db)) return true;
  try {
    // sqlite-vec is ESM, dynamic import
    const vec = await import('sqlite-vec');
    // @ts-ignore
    if (vec.load) vec.load(db);
    else if ((vec as any).default?.load) (vec as any).default.load(db);
    vecLoadAttempted.set(db, true);
    return true;
  } catch (e) {
    console.warn('sqlite-vec load failed, falling back to BLOB storage:', (e as Error).message);
    vecLoadAttempted.set(db, false);
    return false;
  }
}
