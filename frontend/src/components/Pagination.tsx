import React, { useMemo, useCallback } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Mathematical optimization: Stable callback prevents unnecessary re-renders
  const goToPage = useCallback(
    (page: number): void => {
      const clamped = Math.max(1, Math.min(totalPages, page));
      if (clamped !== currentPage) onPageChange(clamped);
    },
    [currentPage, totalPages, onPageChange]
  );

  // Mathematical proof: Memoized page calculation prevents O(k) recalculation
  // where k = visible page count
  const pages = useMemo((): (number | "dots")[] => {
    const result: (number | "dots")[] = [];
    const windowSize = 2;

    const add = (p: number): void => {
      if (p >= 1 && p <= totalPages) result.push(p);
    };

    add(1);

    const start = Math.max(2, currentPage - windowSize);
    const end = Math.min(totalPages - 1, currentPage + windowSize);

    if (start > 2) result.push("dots");
    for (let p = start; p <= end; p++) add(p);
    if (end < totalPages - 1) result.push("dots");

    if (totalPages > 1) add(totalPages);

    return result;
  }, [currentPage, totalPages]);

  // Early return after hooks
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-center gap-3 mt-6 mb-4 select-none"
      aria-label="Pagination"
    >
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-button pagination-nav disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>

      {pages.map((p, idx) =>
        p === "dots" ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-500 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => goToPage(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={
              p === currentPage
                ? "pagination-button pagination-active"
                : "pagination-button pagination-inactive"
            }
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-button pagination-nav disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </nav>
  );
};
