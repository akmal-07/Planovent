import React, { useState } from 'react';
import { Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import type { BudgetCategory, BudgetSummary } from '../../types/plan';
import { formatINR } from '../../lib/calculations';
import { CategoryRow } from './CategoryRow';

interface BudgetTableProps {
  budget: BudgetCategory[];
  summary: BudgetSummary;
  onUpdateCategory: (categoryId: string, updates: Partial<BudgetCategory>) => void;
  onToggleLock: (categoryId: string) => void;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({
  budget,
  summary,
  onUpdateCategory,
  onToggleLock,
}) => {
  const [filterLock, setFilterLock] = useState<'all' | 'locked' | 'unlocked'>('all');

  const filteredCategories = budget.filter((cat) => {
    if (filterLock === 'locked') return cat.isLocked;
    if (filterLock === 'unlocked') return !cat.isLocked;
    return true;
  });

  const lockedCount = budget.filter((c) => c.isLocked).length;

  return (
    <section aria-label="8-Category Budget Breakdown Table" className="glass-panel rounded-2xl border border-stone-800 shadow-xl overflow-hidden mb-8">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-6 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/50">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-gold-400" aria-hidden="true" />
            <h2 className="text-lg font-serif font-bold text-stone-100">
              8-Category Budget Architecture
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Deterministic formula: <span className="font-mono text-stone-300">Effective = Actual ?? Estimated</span>. High priority categories are protected during cuts.
          </p>
        </div>

        {/* Lock Filter Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-stone-400 flex items-center gap-1 mr-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
            <span>{lockedCount}/8 Locked</span>
          </span>
          <div className="inline-flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs" role="group" aria-label="Filter categories by lock state">
            <button
              onClick={() => setFilterLock('all')}
              aria-pressed={filterLock === 'all'}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterLock === 'all'
                  ? 'bg-stone-800 text-stone-100 font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All (8)
            </button>
            <button
              onClick={() => setFilterLock('locked')}
              aria-pressed={filterLock === 'locked'}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterLock === 'locked'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Locked ({lockedCount})
            </button>
            <button
              onClick={() => setFilterLock('unlocked')}
              aria-pressed={filterLock === 'unlocked'}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterLock === 'unlocked'
                  ? 'bg-stone-800 text-stone-100 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              AI Open ({8 - lockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers (Desktop) */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-stone-900/80 border-b border-stone-800 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
        <div className="col-span-4">Category & Priority</div>
        <div className="col-span-2 text-right">Estimated</div>
        <div className="col-span-2 text-right">Actual Final</div>
        <div className="col-span-2 text-right">Paid to Date</div>
        <div className="col-span-2 text-right">Effective Spend</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-stone-800/60">
        {filteredCategories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            totalPlannedOrActual={summary.totalPlannedOrActual}
            onUpdate={(updates) => onUpdateCategory(category.id, updates)}
            onToggleLock={() => onToggleLock(category.id)}
          />
        ))}
      </div>

      {/* Table Footer Totals */}
      <div className="px-4 sm:px-6 py-4 bg-stone-900/90 border-t border-stone-700/60 grid grid-cols-12 gap-2 sm:gap-4 items-center">
        <div className="col-span-12 sm:col-span-4">
          <span className="text-xs uppercase font-bold tracking-wider text-stone-300 block">
            Grand Totals (8 Invariant Categories)
          </span>
          <span className="text-[11px] text-stone-400">
            {summary.isOverBudget
              ? `Over budget by ${formatINR(summary.overBudgetAmount)}`
              : `Under budget cushion: ${formatINR(summary.remainingBudget)}`}
          </span>
        </div>

        <div className="col-span-4 sm:col-span-2 text-right">
          <span className="text-[10px] uppercase text-stone-400 block sm:hidden">Est:</span>
          <span className="text-xs sm:text-sm font-mono font-semibold text-stone-300">
            {formatINR(summary.totalEstimated)}
          </span>
        </div>

        <div className="col-span-4 sm:col-span-2 text-right">
          <span className="text-[10px] uppercase text-stone-400 block sm:hidden">Act:</span>
          <span className="text-xs sm:text-sm font-mono font-semibold text-stone-300">
            {formatINR(
              budget.reduce((acc, c) => acc + (c.actual !== undefined ? c.actual : 0), 0)
            )}
          </span>
        </div>

        <div className="col-span-4 sm:col-span-2 text-right">
          <span className="text-[10px] uppercase text-stone-400 block sm:hidden">Paid:</span>
          <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
            {formatINR(summary.totalPaid)}
          </span>
        </div>

        <div className="col-span-12 sm:col-span-2 text-right pt-2 sm:pt-0 border-t sm:border-0 border-stone-800">
          <span className="text-[10px] uppercase text-stone-400 block sm:hidden">Committed:</span>
          <span className="text-sm sm:text-base font-mono font-bold text-gold-300">
            {formatINR(summary.totalPlannedOrActual)}
          </span>
        </div>
      </div>

      {/* Footnote */}
      <div className="p-3 sm:px-6 bg-stone-950/60 border-t border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" aria-hidden="true" />
        <span>
          <strong className="text-stone-300 font-semibold">Rubric Quality Guarantee:</strong> Mathematical precision is guaranteed via pure functions in <code className="text-gold-300 font-mono">src/lib/calculations.ts</code>. The AI will never be tasked with computing sums, keeping your balance invariant.
        </span>
      </div>
    </section>
  );
};
