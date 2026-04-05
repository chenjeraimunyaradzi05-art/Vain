'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { Spinner } from './Spinner';
import { NoData } from './EmptyState';

// Types
export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  variant?: 'default' | 'cosmic' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  
  // Sorting
  sortable?: boolean;
  defaultSort?: { key: string; direction: SortDirection };
  onSort?: (key: string, direction: SortDirection) => void;
  
  // Pagination
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  
  // Actions
  onRowClick?: (row: T, index: number) => void;
  rowActions?: (row: T) => React.ReactNode;
  
  className?: string;
}

// Utility function to get nested value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  variant = 'default',
  size = 'md',
  sortable = false,
  defaultSort,
  onSort,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  totalItems,
  currentPage: controlledPage,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedRows,
  onSelectionChange,
  onRowClick,
  rowActions,
  className = '',
}: DataTableProps<T>) {
  // State
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>(
    defaultSort || { key: '', direction: null }
  );
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());

  // Controlled vs uncontrolled
  const currentPage = controlledPage ?? internalPage;
  const pageSize = initialPageSize;
  const selected = selectedRows ?? internalSelected;

  // Variant classes
  const isCosmic = variant === 'cosmic';
  const isStriped = variant === 'striped';

  const containerClass = isCosmic
    ? 'bg-[#1A0F2E] border-[#FFD700]/20'
    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  const headerClass = isCosmic
    ? 'bg-[#2D1B69]/50 text-gray-300'
    : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300';

  const rowClass = (index: number) => {
    let base = 'transition-colors ';
    if (isCosmic) {
      base += 'hover:bg-white/5 ';
      if (isStriped && index % 2 === 1) base += 'bg-white/2 ';
    } else {
      base += 'hover:bg-gray-50 dark:hover:bg-gray-700/50 ';
      if (isStriped && index % 2 === 1) base += 'bg-gray-50 dark:bg-gray-800/50 ';
    }
    return base;
  };

  const cellClass = isCosmic
    ? 'text-gray-300 border-white/5'
    : 'text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700';

  const sizeClasses = {
    sm: { cell: 'px-3 py-2 text-sm', header: 'px-3 py-2 text-xs' },
    md: { cell: 'px-4 py-3 text-sm', header: 'px-4 py-3 text-xs' },
    lg: { cell: 'px-6 py-4 text-base', header: 'px-6 py-4 text-sm' },
  };

  const sizes = sizeClasses[size];

  // Sorting
  const handleSort = useCallback((key: string) => {
    if (!sortable) return;
    
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }

    setSortConfig({ key, direction });
    onSort?.(key, direction);
  }, [sortable, sortConfig, onSort]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;
    
    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortConfig.key);
      const bVal = getNestedValue(b, sortConfig.key);
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Pagination
  const total = totalItems ?? sortedData.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginatedData = pagination && !totalItems
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handlePageChange = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setInternalPage(newPage);
    onPageChange?.(newPage);
  }, [totalPages, onPageChange]);

  const handlePageSizeChange = useCallback((size: number) => {
    setInternalPageSize(size);
    setInternalPage(1);
    onPageSizeChange?.(size);
  }, [onPageSizeChange]);

  // Selection
  const handleSelectAll = useCallback(() => {
    const newSelected = new Set<string>();
    if (selected.size !== paginatedData.length) {
      paginatedData.forEach(row => newSelected.add(String(row[keyField])));
    }
    setInternalSelected(newSelected);
    onSelectionChange?.(newSelected);
  }, [paginatedData, selected, keyField, onSelectionChange]);

  const handleSelectRow = useCallback((id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setInternalSelected(newSelected);
    onSelectionChange?.(newSelected);
  }, [selected, onSelectionChange]);

  // Render sort indicator
  const renderSortIndicator = (key: string, isSortable: boolean) => {
    if (!isSortable) return null;
    
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4" />;
    }
    
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4" />;
    }
    
    return <ArrowUpDown className="w-4 h-4 opacity-30" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className={`border rounded-lg overflow-hidden ${containerClass} ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" variant={isCosmic ? 'gold' : 'default'} label="Loading data..." />
        </div>
      </div>
    );
  }

  // Empty state
  if (paginatedData.length === 0) {
    return (
      <div className={`border rounded-lg overflow-hidden ${containerClass} ${className}`}>
        <NoData variant={isCosmic ? 'cosmic' : 'default'} />
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${containerClass} ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className={headerClass}>
            <tr>
              {/* Selection checkbox */}
              {selectable && (
                <th className={`${sizes.header} w-12 text-center`}>
                  <input
                    type="checkbox"
                    checked={selected.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
              )}
              
              {columns.map((column) => {
                const isSortable = sortable && column.sortable !== false;
                return (
                  <th
                    key={column.key}
                    className={`
                      ${sizes.header}
                      font-semibold uppercase tracking-wider
                      text-${column.align || 'left'}
                      ${isSortable ? 'cursor-pointer select-none' : ''}
                      ${column.className || ''}
                    `}
                    style={{ width: column.width }}
                    onClick={() => isSortable && handleSort(column.key)}
                  >
                    <div className={`flex items-center gap-2 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                      {column.header}
                      {renderSortIndicator(column.key, isSortable)}
                    </div>
                  </th>
                );
              })}
              
              {/* Actions column */}
              {rowActions && (
                <th className={`${sizes.header} w-12 text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.map((row, index) => {
              const rowId = String(row[keyField]);
              const isSelected = selected.has(rowId);
              
              return (
                <tr
                  key={rowId}
                  className={`
                    ${rowClass(index)}
                    ${isSelected ? (isCosmic ? 'bg-[#FFD700]/10' : 'bg-blue-50 dark:bg-blue-900/20') : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {/* Selection checkbox */}
                  {selectable && (
                    <td 
                      className={`${sizes.cell} text-center border-t ${cellClass}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        ${sizes.cell}
                        border-t
                        text-${column.align || 'left'}
                        ${cellClass}
                        ${column.className || ''}
                      `}
                    >
                      {column.cell 
                        ? column.cell(row, index)
                        : getNestedValue(row, column.key) ?? '-'
                      }
                    </td>
                  ))}
                  
                  {/* Actions */}
                  {rowActions && (
                    <td 
                      className={`${sizes.cell} border-t text-right ${cellClass}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className={`
          flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t
          ${isCosmic ? 'border-white/10 bg-[#2D1B69]/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'}
        `}>
          {/* Page size selector */}
          <div className="flex items-center gap-2 text-sm">
            <span className={isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}>
              Rows per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className={`
                rounded border px-2 py-1 text-sm
                ${isCosmic 
                  ? 'bg-[#1A0F2E] border-white/20 text-white' 
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'}
              `}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Page info */}
          <div className={`text-sm ${isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded disabled:opacity-30 disabled:cursor-not-allowed
                ${isCosmic ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`
                p-2 rounded disabled:opacity-30 disabled:cursor-not-allowed
                ${isCosmic ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className={`
              px-3 py-1 text-sm font-medium
              ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}
            `}>
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded disabled:opacity-30 disabled:cursor-not-allowed
                ${isCosmic ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`
                p-2 rounded disabled:opacity-30 disabled:cursor-not-allowed
                ${isCosmic ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
