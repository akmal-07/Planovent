import React from 'react';
import { Gauge, Sparkles, ShieldCheck } from 'lucide-react';
import type { WeddingPlan, BudgetSummary } from '../../types/plan';
import { formatINR } from '../../lib/calculations';

interface WhatIfPreviewProps {
  plan: WeddingPlan;
  summary: BudgetSummary;
}

export const WhatIfPreview: React.FC<WhatIfPreviewProps> = ({ plan, summary }) => {
  const highPriorityCategories = plan.budget.filter((c) => c.priorityWeight === 'high');
  const lowPriorityCategories = plan.budget.filter((c) => c.priorityWeight === 'low');

  return (
    <section aria-label="What-If Simulator & Risk Radar Preview" className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-500/20 to-brand-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <Gauge className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif font-bold text-stone-100">
                What-If Simulator & Risk Radar Architecture
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-400/10 text-gold-400 border border-gold-400/20">
                Scheduled for Bit 3
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Zero-latency client-side guest elasticity calculations and deterministic risk detection.
            </p>
          </div>
        </div>

        {/* Priority Shielding Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Shielded Priorities ({highPriorityCategories.length} Categories)
            </div>
            <p className="text-xs text-stone-300">
              Categories you marked as <strong className="text-emerald-300">High Priority</strong> (such as Catering & Photography) are strictly shielded from automatic budget cuts during trade-off simulations.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {highPriorityCategories.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-200 text-[11px] font-medium border border-emerald-500/30">
                  {c.label} ({formatINR(c.estimated)})
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
            <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-gold-400" aria-hidden="true" />
              Flexible Categories ({lowPriorityCategories.length} Categories)
            </div>
            <p className="text-xs text-stone-300">
              Categories marked as <strong className="text-stone-200">Low Priority</strong> (like Decor & Invitations) are the first to absorb 15–20% reductions when simulating tighter financial scenarios.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {lowPriorityCategories.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 text-[11px] font-medium border border-stone-700">
                  {c.label} ({formatINR(c.estimated)})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Metrics Snapshot */}
        <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 text-xs text-stone-400 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="block text-[10px] uppercase text-stone-500">Benchmark Guests</span>
            <span className="text-base font-mono font-bold text-stone-200">{plan.guestCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-stone-500">Committed Spend</span>
            <span className="text-base font-mono font-bold text-gold-300">{formatINR(summary.totalPlannedOrActual)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-stone-500">Budget Target</span>
            <span className="text-base font-mono font-bold text-stone-200">{formatINR(plan.totalBudget)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-stone-500">Buffer Status</span>
            <span className={`text-base font-mono font-bold ${summary.isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              {summary.isOverBudget ? `Over: ${formatINR(summary.overBudgetAmount)}` : `Buffer: ${formatINR(summary.remainingBudget)}`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
