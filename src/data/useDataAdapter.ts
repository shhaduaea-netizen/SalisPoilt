import { useContext } from 'react';
import { DataAdapterContext } from '@/data/DataAdapterContext';
import type { DataAdapter } from '@/data/adapters/repositories';

export function useDataAdapter(): DataAdapter {
  const adapter = useContext(DataAdapterContext);
  if (!adapter) throw new Error('useDataAdapter must be used inside DataAdapterProvider');
  return adapter;
}
