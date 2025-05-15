// src/hooks/useQueryWithCache.ts
import { useQuery, QueryKey, UseQueryOptions } from '@tanstack/react-query';

/**
 * Hook personalizado para buscar dados com cache utilizando React Query.
 *
 * @param key Chave única da query (QueryKey).
 * @param queryFn Função assíncrona que retorna os dados.
 * @param options Opções extras do React Query.
 * @returns Resultado da query (data, isLoading, error, etc.).
 */
export function useQueryWithCache<T>(
  key: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error, T, QueryKey>({
    queryKey: key,
    queryFn,
    staleTime: 5 * 60 * 1000, // Tempo em que os dados são considerados "frescos"
    gcTime: 10 * 60 * 1000,   // Tempo para o garbage collector limpar os dados da cache
    ...options,
  });
}
