/* eslint-disable react-refresh/only-export-components -- shadcn 惯例：范围算法与组件同文件 */
import * as React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '@pc/lib/utils'
import { buttonVariants } from '@pc/components/ui/button'
import type { ButtonVariants } from '@pc/components/ui/button'

// React port of the reka-ui pagination primitives used by the former desktop
// app. DOM structure matches reka-ui exactly: a <nav> root providing page
// state, a <div> list, and <button> items reporting through root context.

export type PaginationRangeItem = { type: 'page'; value: number } | { type: 'ellipsis' }

const range = (start: number, end: number) => {
  const length = end - start + 1
  return Array.from({ length }, (_, idx) => idx + start)
}

// Mirrors reka-ui's Pagination/utils.ts getRange().
export const getRangeItems = (
  currentPage: number,
  pageCount: number,
  siblingCount: number,
  showEdges: boolean,
): PaginationRangeItem[] => {
  const transform = (items: Array<number | 'ellipsis'>): PaginationRangeItem[] =>
    items.map((value) =>
      typeof value === 'number' ? { type: 'page' as const, value } : { type: 'ellipsis' as const },
    )

  const ELLIPSIS = 'ellipsis'
  const firstPageIndex = 1
  const lastPageIndex = pageCount
  const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPageIndex)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPageIndex)

  if (showEdges) {
    const totalPageNumbers = Math.min(2 * siblingCount + 5, pageCount)
    const itemCount = totalPageNumbers - 2
    const showLeftEllipsis =
      leftSiblingIndex > firstPageIndex + 2 &&
      Math.abs(lastPageIndex - itemCount - firstPageIndex + 1) > 2 &&
      Math.abs(leftSiblingIndex - firstPageIndex) > 2
    const showRightEllipsis =
      rightSiblingIndex < lastPageIndex - 2 &&
      Math.abs(lastPageIndex - itemCount) > 2 &&
      Math.abs(lastPageIndex - rightSiblingIndex) > 2

    if (!showLeftEllipsis && showRightEllipsis) {
      return transform([...range(1, itemCount), ELLIPSIS, lastPageIndex])
    }
    if (showLeftEllipsis && !showRightEllipsis) {
      return transform([firstPageIndex, ELLIPSIS, ...range(lastPageIndex - itemCount + 1, lastPageIndex)])
    }
    if (showLeftEllipsis && showRightEllipsis) {
      return transform([
        firstPageIndex,
        ELLIPSIS,
        ...range(leftSiblingIndex, rightSiblingIndex),
        ELLIPSIS,
        lastPageIndex,
      ])
    }
    return transform(range(firstPageIndex, lastPageIndex))
  }

  const itemCount = siblingCount * 2 + 1
  if (pageCount < itemCount) return transform(range(1, lastPageIndex))
  if (currentPage <= siblingCount + 1) return transform(range(firstPageIndex, itemCount))
  if (pageCount - currentPage <= siblingCount) {
    return transform(range(pageCount - itemCount + 1, lastPageIndex))
  }
  return transform(range(leftSiblingIndex, rightSiblingIndex))
}

interface PaginationContextValue {
  page: number
  pageCount: number
  siblingCount: number
  showEdges: boolean
  disabled: boolean
  onPageChange: (page: number) => void
}

const PaginationContext = React.createContext<PaginationContextValue | null>(null)

const usePagination = () => {
  const context = React.useContext(PaginationContext)
  if (!context) {
    throw new Error('Pagination compound components must be used within <Pagination>')
  }
  return context
}

export interface PaginationProps extends React.ComponentPropsWithoutRef<'nav'> {
  page?: number
  defaultPage?: number
  itemsPerPage: number
  total?: number
  siblingCount?: number
  disabled?: boolean
  showEdges?: boolean
  onPageChange?: (page: number) => void
}

const Pagination = ({
  page: pageProp,
  defaultPage = 1,
  itemsPerPage,
  total = 0,
  siblingCount = 2,
  disabled = false,
  showEdges = false,
  onPageChange,
  className,
  children,
  ...props
}: PaginationProps) => {
  const [innerPage, setInnerPage] = React.useState(defaultPage)
  const isControlled = pageProp !== undefined
  const page = isControlled ? pageProp : innerPage

  const handlePageChange = React.useCallback(
    (value: number) => {
      if (!isControlled) setInnerPage(value)
      onPageChange?.(value)
    },
        [isControlled, onPageChange],
  )

  const pageCount = Math.max(1, Math.ceil(total / (itemsPerPage || 1)))

  const context = React.useMemo<PaginationContextValue>(
    () => ({ page, pageCount, siblingCount, showEdges, disabled, onPageChange: handlePageChange }),
    [page, pageCount, siblingCount, showEdges, disabled, handlePageChange],
  )

  return (
    <PaginationContext.Provider value={context}>
      <nav
        data-slot="pagination"
        className={cn('mx-auto flex w-full justify-center', className)}
        {...props}
      >
        {children}
      </nav>
    </PaginationContext.Provider>
  )
}
Pagination.displayName = 'Pagination'

export type PaginationContentProps = React.ComponentPropsWithoutRef<'div'>

const PaginationContent = ({ className, ...props }: PaginationContentProps) => (
  <div
    data-slot="pagination-content"
    className={cn('flex flex-row items-center gap-1', className)}
    {...props}
  />
)
PaginationContent.displayName = 'PaginationContent'

export interface PaginationItemProps extends React.ComponentPropsWithoutRef<'button'> {
  value: number
}

const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  ({ value, className, children, onClick, disabled, ...props }, ref) => {
    const rootContext = usePagination()
    const isSelected = rootContext.page === value
    return (
      <button
        ref={ref}
        type="button"
        data-type="page"
        data-slot="pagination-item"
        aria-label={`Page ${value}`}
        aria-current={isSelected ? 'page' : undefined}
        data-selected={isSelected ? 'true' : undefined}
        disabled={disabled ?? rootContext.disabled}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), className)}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented && !rootContext.disabled) {
            rootContext.onPageChange(value)
          }
        }}
        {...props}
      >
        {children ?? value}
      </button>
    )
  },
)
PaginationItem.displayName = 'PaginationItem'

export type PaginationEllipsisProps = React.ComponentPropsWithoutRef<'div'>

const PaginationEllipsis = ({ className, ...props }: PaginationEllipsisProps) => (
  <div
    data-slot="pagination-ellipsis"
    className={cn('flex size-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More pages</span>
  </div>
)
PaginationEllipsis.displayName = 'PaginationEllipsis'

interface PaginationSiblingProps extends React.ComponentPropsWithoutRef<'button'> {
  size?: ButtonVariants['size']
}

const siblingClass = (size: ButtonVariants['size'], className?: string) =>
  cn(buttonVariants({ variant: 'ghost', size }), 'gap-1 px-2.5 sm:pr-2.5', className)

export const PaginationFirst = ({
  className,
  size = 'default',
  children,
  onClick,
  disabled,
  ...props
}: PaginationSiblingProps) => {
  const { page, disabled: rootDisabled, onPageChange } = usePagination()
  const isDisabled = disabled ?? (page === 1 || rootDisabled)
  return (
    <button
      type="button"
      data-slot="pagination-first"
      aria-label="First Page"
      disabled={isDisabled}
      className={siblingClass(size, className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) onPageChange(1)
      }}
      {...props}
    >
      {children ?? (
        <>
          <ChevronLeft />
          <span className="hidden sm:block">First</span>
        </>
      )}
    </button>
  )
}
PaginationFirst.displayName = 'PaginationFirst'

export const PaginationPrevious = ({
  className,
  size = 'default',
  children,
  onClick,
  disabled,
  ...props
}: PaginationSiblingProps) => {
  const { page, disabled: rootDisabled, onPageChange } = usePagination()
  const isDisabled = disabled ?? (page === 1 || rootDisabled)
  return (
    <button
      type="button"
      data-slot="pagination-previous"
      aria-label="Previous Page"
      disabled={isDisabled}
      className={siblingClass(size, className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) onPageChange(page - 1)
      }}
      {...props}
    >
      {children ?? (
        <>
          <ChevronLeft />
          <span className="hidden sm:block">Previous</span>
        </>
      )}
    </button>
  )
}
PaginationPrevious.displayName = 'PaginationPrevious'

export const PaginationNext = ({
  className,
  size = 'default',
  children,
  onClick,
  disabled,
  ...props
}: PaginationSiblingProps) => {
  const { page, pageCount, disabled: rootDisabled, onPageChange } = usePagination()
  const isDisabled = disabled ?? (page === pageCount || rootDisabled)
  return (
    <button
      type="button"
      data-slot="pagination-next"
      aria-label="Next Page"
      disabled={isDisabled}
      className={siblingClass(size, className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) onPageChange(page + 1)
      }}
      {...props}
    >
      {children ?? (
        <>
          <span className="hidden sm:block">Next</span>
          <ChevronRight />
        </>
      )}
    </button>
  )
}
PaginationNext.displayName = 'PaginationNext'

export const PaginationLast = ({
  className,
  size = 'default',
  children,
  onClick,
  disabled,
  ...props
}: PaginationSiblingProps) => {
  const { page, pageCount, disabled: rootDisabled, onPageChange } = usePagination()
  const isDisabled = disabled ?? (page === pageCount || rootDisabled)
  return (
    <button
      type="button"
      data-slot="pagination-last"
      aria-label="Last Page"
      disabled={isDisabled}
      className={siblingClass(size, className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !isDisabled) onPageChange(pageCount)
      }}
      {...props}
    >
      {children ?? (
        <>
          <span className="hidden sm:block">Last</span>
          <ChevronRight />
        </>
      )}
    </button>
  )
}
PaginationLast.displayName = 'PaginationLast'


export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
}
