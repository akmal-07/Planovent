import React from 'react';
import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Wallet, CreditCard } from 'lucide-react';
import type { BudgetSummary } from '../../types/plan';
import { formatINR } from '../../lib/calculations';

interface BudgetSummaryCardsProps {
  summary: BudgetSummary;
  totalBudget: number;
  onOpenSetup: () => void;
}

export const BudgetSummaryCards: React.FC<BudgetSummaryCardsProps> = ({
  summary,
  totalBudget,
  onOpenSetup,
}) => {
  const {
    totalEstimated,
    totalPlannedOrActual,
    totalPaid,
    totalDue,
    remainingBudget,
    isOverBudget,
    overBudgetAmount,
  } = summary;

  const percentCommitted =
    totalBudget > 0 ? Math.round((totalPlannedOrActual / totalBudget) * 100) : 0;
  const progressWidth = Math.min(100, Math.max(0, percentCommitted));

  return (
    <section aria-label="Financial Summary Cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Target Budget Card */}
      <div
        onClick={onOpenSetup}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpenSetup(); }}
        aria-label={`Target budget is ${formatINR(totalBudget)}. Click to edit.`}
        className="glass-card rounded-2xl p-5 border border-stone-800 hover:border-gold-500/40 transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl group-hover:bg-gold-500/10 transition-all" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Total Target Budget
          </span>
          <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-gold-400 group-hover:scale-110 transition-transform">
            <IndianRupee className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div className="text-2xl font-serif font-bold text-stone-100 font-mono tracking-tight">
          {formatINR(totalBudget)}
        </div>
        <div className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
          <span>Est: {formatINR(totalEstimated)}</span>
          <span className="text-gold-400 font-medium group-hover:underline">Edit Target →</span>
        </div>
      </div>

      {/* 2. Committed Spend Card */}
      <div className="glass-card rounded-2xl p-5 border border-stone-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Committed Spend
          </span>
          <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div className="text-2xl font-serif font-bold text-stone-100 font-mono tracking-tight">
          {formatINR(totalPlannedOrActual)}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
            <span>Σ(Actual ?? Estimated)</span>
            <span className={`font-mono font-bold ${isOverBudget ? 'text-rose-400' : 'text-stone-300'}`}>
              {percentCommitted}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentCommitted} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isOverBudget
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : 'bg-gradient-to-r from-brand-600 via-brand-500 to-gold-400'
              }`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Remaining Cushion Card */}
      <div className={`glass-card rounded-2xl p-5 border relative overflow-hidden ${
        isOverBudget
          ? 'border-rose-500/40 bg-rose-950/20'
          : 'border-emerald-500/30 bg-emerald-950/10'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            {isOverBudget ? 'Budget Deficit' : 'Unallocated Cushion'}
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isOverBudget
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isOverBudget ? <AlertTriangle className="w-4 h-4" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          </div>
        </div>
        <div className={`text-2xl font-serif font-bold font-mono tracking-tight ${
          isOverBudget ? 'text-rose-400' : 'text-emerald-400'
        }`}>
          {formatINR(isOverBudget ? overBudgetAmount : remainingBudget)}
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          {isOverBudget
            ? `Over target by ${formatINR(overBudgetAmount)}. Adjust low priority items.`
            : 'Safe financial buffer for unexpected ceremony costs.'}
        </p>
      </div>

      {/* 4. Cashflow & Settlement Card */}
      <div className="glass-card rounded-2xl p-5 border border-stone-800 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Cashflow Paid & Due
          </span>
          <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-amber-400">
            <Wallet className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase block">Paid to Vendors</span>
            <span className="text-lg font-bold text-stone-200 font-mono">
              {formatINR(totalPaid)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 uppercase block">Balance Due</span>
            <span className="text-lg font-bold text-amber-300 font-mono flex items-center gap-1 justify-end">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              {formatINR(totalDue)}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-stone-400 mt-2">
          {totalPlannedOrActual > 0
            ? `${Math.round((totalPaid / totalPlannedOrActual) * 100)}% of committed vendor contracts cleared`
            : 'No payments recorded yet'}
        </div>
      </div>
    </section>
  );
};
