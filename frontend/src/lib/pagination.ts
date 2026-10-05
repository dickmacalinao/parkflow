import { useMemo, useState } from 'react';

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Client-side pagination for endpoints that return a plain array.
 * Clamps the page when the item count shrinks (e.g. after a delete).
 */
export function useClientPagination<T>(items: T[] | undefined, pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => (items ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );
  return { page: currentPage, setPage, pageItems, total, pageSize };
}
