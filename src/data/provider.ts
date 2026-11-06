import { createDemoAdapter } from '@/data/adapters/demo/createDemoAdapter';
import type { DataAdapter } from '@/data/adapters/repositories';

export function createDataAdapter(mode: string): DataAdapter {
  if (mode === 'demo') return createDemoAdapter();
  throw new Error(`Unsupported VITE_DATA_MODE "${mode}". Only "demo" is available in this phase.`);
}
