import { createContext, type ReactNode } from 'react';
import type { DataAdapter } from '@/data/adapters/repositories';

export const DataAdapterContext = createContext<DataAdapter | null>(null);

export function DataAdapterProvider({ adapter, children }: { adapter: DataAdapter; children: ReactNode }) {
  return <DataAdapterContext.Provider value={adapter}>{children}</DataAdapterContext.Provider>;
}
