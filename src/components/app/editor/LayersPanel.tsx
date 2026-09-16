'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/Button';

export interface OutlineBlock {
  lumenId: string;
  tag: string;
  label: string;
}

/**
 * The page as a list of blocks, reorderable by dragging.
 *
 * Pointer events rather than the HTML5 drag API. That API does not fire on
 * touch at all, so the grip handle was decoration on a phone — a control that
 * looks draggable and cannot be dragged. Pointer events are one code path for
 * mouse, pen and finger, and they also let the row follow the finger and show
 * a line where the block will land, neither of which the native API gives you
 * without fighting it.
 *
 * A drag is one move, not a run of swaps: it says which block goes before
 * which, and the page is changed once.
 */
/**
 * What a drop into a gap actually means, as a move.
 *
 * Gaps are counted between rows, so the gap above row 3 is index 3 and the one
 * below it is index 4 — which makes "dropped where it already was" two
 * different indices, and an off-by-one here silently reorders the page by one
 * place every time. Pulled out of the component so it can be checked.
 */
export function dropTarget(
  blocks: OutlineBlock[],
  draggingId: string,
  gap: number,
): { beforeLumenId: string | null } | null {
  const from = blocks.findIndex((block) => block.lumenId === draggingId);
  if (from === -1) return null;
  // The gap directly above and the one directly below are both where it
  // already is. Applying either would put an empty edit in the save.
  if (gap === from || gap === from + 1) return null;
  return { beforeLumenId: blocks[gap]?.lumenId ?? null };
}

export function LayersPanel({
  blocks,
  selected,
  onSelect,
  onMove,
  onMoveTo,
  onDuplicate,
  onRemove,
  onAdd,
  loading,
}: {
  blocks: OutlineBlock[];
  loading?: boolean;
  selected: string | null;
  onSelect: (lumenId: string) => void;
  onMove: (lumenId: string, direction: 'up' | 'down') => void;
  /** Put this block immediately before that one; null means last. */
  onMoveTo: (lumenId: string, beforeLumenId: string | null) => void;
  onDuplicate: (lumenId: string) => void;
  onRemove: (lumenId: string) => void;
  onAdd: () => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  // Where the block would land: the index it would take in the list.
  const [dropAt, setDropAt] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  /** The gap the pointer is nearest, from the rows on screen. */
  const gapUnder = useCallback((clientY: number): number => {
    const rows = [...(listRef.current?.querySelectorAll('[data-row]') ?? [])] as HTMLElement[];
    for (let index = 0; index < rows.length; index += 1) {
      const box = rows[index].getBoundingClientRect();
      if (clientY < box.top + box.height / 2) return index;
    }
    return rows.length;
  }, []);

  const finish = useCallback(() => {
    // Read before clearing, because clearing is what re-renders.
    const id = dragging;
    const at = dropAt;
    setDragging(null);
    setDropAt(null);
    started.current = false;
    if (!id || at === null) return;

    const target = dropTarget(blocks, id, at);
    if (target) onMoveTo(id, target.beforeLumenId);
  }, [blocks, dragging, dropAt, onMoveTo]);

  // On window rather than the row: a finger that slides off the list still
  // ends the drag, instead of leaving a row stuck to the pointer.
  useEffect(() => {
    if (!dragging) return;
    const onMoveEvent = (event: PointerEvent) => {
      event.preventDefault();
      started.current = true;
      setDropAt(gapUnder(event.clientY));
    };
    window.addEventListener('pointermove', onMoveEvent, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', onMoveEvent);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dragging, finish, gapUnder]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Blocks</span>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          + Add
        </Button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12.5px] text-ink-muted">
            {loading ? 'Reading the page…' : 'No editable blocks on this page.'}
          </p>
        ) : (
          <>
            {blocks.map((block, index) => (
              <div key={block.lumenId}>
                <DropLine active={dropAt === index && dragging !== null} />
                <div
                  data-row
                  role="button"
                  tabIndex={0}
                  aria-grabbed={dragging === block.lumenId}
                  onClick={() => onSelect(block.lumenId)}
                  onKeyDown={(event) => {
                    // Reorderable without a pointer at all. Alt is held so the
                    // arrows still scroll the list normally.
                    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                      event.preventDefault();
                      onMove(block.lumenId, event.key === 'ArrowUp' ? 'up' : 'down');
                      return;
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(block.lumenId);
                    }
                  }}
                  className={cn(
                    'group rounded-[9px] border px-2.5 py-2 transition',
                    selected === block.lumenId
                      ? 'border-accent/45 bg-accent-soft'
                      : 'border-transparent hover:bg-white/5',
                    dragging === block.lumenId && 'opacity-40',
                    'focus:outline-none focus-visible:border-accent/60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* The grip is the only part that starts a drag, so the row
                        stays scrollable with a finger. */}
                    <span
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture?.(event.pointerId);
                        started.current = false;
                        setDragging(block.lumenId);
                        setDropAt(index);
                      }}
                      title="Drag to reorder"
                      aria-label={`Drag ${block.label} to reorder`}
                      className="-my-1 cursor-grab touch-none select-none px-1 py-1 text-[12px] leading-none text-ink-muted active:cursor-grabbing"
                    >
                      ⠿
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[12.5px]',
                        selected === block.lumenId ? 'text-accent' : 'text-ink-secondary',
                      )}
                    >
                      {block.label}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-muted">{block.tag}</span>
                  </div>

                  <div className="mt-1.5 hidden gap-1 group-hover:flex group-focus-within:flex">
                    <RowAction
                      label="↑"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => onMove(block.lumenId, 'up')}
                    />
                    <RowAction
                      label="↓"
                      title="Move down"
                      disabled={index === blocks.length - 1}
                      onClick={() => onMove(block.lumenId, 'down')}
                    />
                    <RowAction label="⧉" title="Duplicate" onClick={() => onDuplicate(block.lumenId)} />
                    <RowAction label="✕" title="Delete" danger onClick={() => onRemove(block.lumenId)} />
                  </div>
                </div>
              </div>
            ))}
            <DropLine active={dropAt === blocks.length && dragging !== null} />
          </>
        )}
      </div>

      {blocks.length > 1 ? (
        <p className="border-t border-hairline px-4 py-2 text-[11px] leading-relaxed text-ink-muted">
          Drag ⠿ to reorder, or hold Alt and press ↑ ↓.
        </p>
      ) : null}
    </div>
  );
}

/** Where the block will land. Always occupies its space, so nothing jumps. */
function DropLine({ active }: { active: boolean }) {
  return (
    <div className="h-1.5 py-[2px]" aria-hidden>
      <div className={cn('h-[2px] rounded-pill transition', active ? 'bg-accent' : 'bg-transparent')} />
    </div>
  );
}

function RowAction({
  label,
  title,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'rounded-[6px] border border-hairline px-1.5 py-0.5 text-[11px] leading-none transition disabled:opacity-30',
        danger
          ? 'text-[#e5735a] hover:bg-[#e5735a]/10'
          : 'text-ink-muted hover:bg-white/5 hover:text-ink-primary',
      )}
    >
      {label}
    </button>
  );
}
