import React from 'react';
import {
  Sliders,
  Users,
  IndianRupee,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { WeddingPlan, WhatIfSimulationResult, WhatIfSimulationParams } from '../../types/plan';
import { formatINR, formatCompactINR } from '../../lib/calculations';

interface WhatIfSimulatorPanelProps {
  plan: WeddingPlan;
  simulation: WhatIfSimulationResult;
  params: WhatIfSimulationParams;
  onParamsChange: (updater: (prev: WhatIfSimulationParams) => WhatIfSimulationParams) => void;
  onApplyScenario: (mode: 'projected' | 'rebalanced') => void;
}

export const WhatIfSimulatorPanel: React.FC<WhatIfSimulatorPanelProps> = ({
  plan,
  simulation,
  params,
  onParamsChange,
  onApplyScenario,
}) => {
  const styleTiers = [
    { label: 'Intimate / Elegant', multiplier: 0.85, badge: '0.85x' },
    { label: 'Standard Luxury', multiplier: 1.0, badge: '1.0x' },
    { label: 'Grand Destination', multiplier: 1.25, badge: '1.25x' },
  ];

  const resetToPlanDefaults = () => {
    onParamsChange(() => ({
      guestCount: plan.guestCount,
      totalBudget: plan.totalBudget,
      styleMultiplier: 1.0,
      respectLocks: true,
    }));
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Low (Flexible)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section aria-label="What-If Elasticity Simulator" className="space-y-6">
      {/* 0ms Interactive Controls Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-stone-800 bg-stone-900/60 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
              <Sliders className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-100">
                0ms Client-Side Elasticity Controls
              </h2>
              <p className="text-xs text-stone-400">
                Instantly simulate guest shifts, style multipliers, and priority-weighted budget cuts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToPlanDefaults}
            aria-label="Reset simulation to current plan numbers"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset to Current Plan</span>
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guest Count Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="slider-guest-count" className="flex items-center gap-2 text-xs font-semibold text-stone-300">
                <Users className="w-4 h-4 text-gold-400" aria-hidden="true" />
                Target Guest Count
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-bold text-stone-100">
                  {params.guestCount}
                </span>
                <span className="text-xs text-stone-400">guests</span>
                {params.guestCount !== plan.guestCount && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                    {params.guestCount > plan.guestCount ? '+' : ''}
                    {params.guestCount - plan.guestCount}
                  </span>
                )}
              </div>
            </div>

            <input
              id="slider-guest-count"
              type="range"
              min={50}
              max={800}
              step={10}
              value={params.guestCount}
              onChange={(e) =>
                onParamsChange((prev) => ({
                  ...prev,
                  guestCount: parseInt(e.target.value, 10) || 50,
                }))
              }
              aria-label="Target Guest Count Slider"
              className="w-full accent-gold-500 cursor-pointer h-2 bg-stone-950 rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>50 Intimate</span>
              <span>200 Benchmark</span>
              <span>500 Grand</span>
              <span>800 Mega</span>
            </div>
          </div>

          {/* Target Total Budget Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="slider-total-budget" className="flex items-center gap-2 text-xs font-semibold text-stone-300">
                <IndianRupee className="w-4 h-4 text-gold-400" aria-hidden="true" />
                Target Total Budget
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-bold text-gold-300">
                  {formatINR(params.totalBudget)}
                </span>
                <span className="text-xs text-stone-400">({formatCompactINR(params.totalBudget)})</span>
              </div>
            </div>

            <input
              id="slider-total-budget"
              type="range"
              min={200000}
              max={5000000}
              step={25000}
              value={params.totalBudget}
              onChange={(e) =>
                onParamsChange((prev) => ({
                  ...prev,
                  totalBudget: parseInt(e.target.value, 10) || 200000,
                }))
              }
              aria-label="Target Total Budget Slider"
              className="w-full accent-gold-500 cursor-pointer h-2 bg-stone-950 rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] text-stone-500 font-mono">
              <span>₹2 L</span>
              <span>₹8 L Benchmark</span>
              <span>₹20 L</span>
              <span>₹50 L Luxury</span>
            </div>
          </div>
        </div>

        {/* Style Tier & Respect Locks Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Style Multipliers */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-300">
              Celebration Style Factor
            </label>
            <div className="grid grid-cols-3 gap-2">
              {styleTiers.map((tier) => {
                const isSelected = params.styleMultiplier === tier.multiplier;
                return (
                  <button
                    key={tier.badge}
                    type="button"
                    onClick={() =>
                      onParamsChange((prev) => ({
                        ...prev,
                        styleMultiplier: tier.multiplier,
                      }))
                    }
                    aria-pressed={isSelected}
                    aria-label={`Select ${tier.label} (${tier.badge})`}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-md shadow-gold-950/40'
                        : 'bg-stone-950/80 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <div className="font-mono font-bold text-xs">{tier.badge}</div>
                    <div className="text-[10px] text-stone-400 truncate">{tier.label.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Respect Locks Toggle Switch */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-300">
              Lock Invariant Engine
            </label>
            <button
              type="button"
              onClick={() =>
                onParamsChange((prev) => ({
                  ...prev,
                  respectLocks: !prev.respectLocks,
                }))
              }
              aria-pressed={params.respectLocks}
              aria-label="Toggle Respect Locked Categories"
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                params.respectLocks
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-stone-950/80 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    params.respectLocks
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {params.respectLocks ? (
                    <Lock className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Unlock className="w-4 h-4" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold text-stone-200">
                    {params.respectLocks ? 'Protecting Locked Categories' : 'Scaling All Categories'}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {params.respectLocks
                      ? 'Manually locked items & quotes are 100% shielded'
                      : 'Every category scales with elasticity sliders'}
                  </span>
                </div>
              </div>

              <div
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  params.respectLocks ? 'bg-emerald-500' : 'bg-stone-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    params.respectLocks ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Real-Time Outcome Snapshot & Action Trigger */}
        <div className="pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-0.5">
              Current Spend
            </span>
            <span className="text-base font-mono font-bold text-stone-200">
              {formatINR(simulation.currentTotal)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-0.5">
              Projected (Scaled)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base font-mono font-bold text-gold-300">
                {formatINR(simulation.projectedTotal)}
              </span>
              {simulation.projectedTotal !== simulation.currentTotal && (
                <span
                  className={`text-xs font-mono font-semibold flex items-center ${
                    simulation.projectedTotal > simulation.currentTotal
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {simulation.projectedTotal > simulation.currentTotal ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
                  )}
                  {simulation.projectedTotal > simulation.currentTotal ? '+' : ''}
                  {formatINR(simulation.projectedTotal - simulation.currentTotal)}
                </span>
              )}
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              simulation.isOverBudget
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-80 mb-0.5">
              {simulation.isOverBudget ? 'Deficit To Rebalance' : 'Surplus Cushion'}
            </span>
            <span className="text-base font-mono font-bold">
              {simulation.isOverBudget
                ? `Deficit: ${formatINR(simulation.deficit)}`
                : `Surplus: ${formatINR(params.totalBudget - simulation.projectedTotal)}`}
            </span>
          </div>
        </div>

        {/* Unresolvable Deficit Warning Banner */}
        {simulation.unresolvableDeficit > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-semibold block text-amber-300">
                ⚠️ Mathematically Unresolvable Deficit: {formatINR(simulation.unresolvableDeficit)}
              </strong>
              <span>
                Non-negotiable High-Priority categories (Catering, Photography) and locked allocations are strictly shielded from cuts. To balance the celebration budget, decrease the target guest count or increase total budget.
              </span>
            </div>
          </div>
        )}

        {/* Apply Scenario Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onApplyScenario('projected')}
            aria-label="Apply Projected Scenario to Wedding Plan"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Apply Projected Scenario ({formatINR(simulation.projectedTotal)})</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyScenario('rebalanced')}
            aria-label="Apply Priority-Rebalanced Scenario to Wedding Plan"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gold-500 hover:bg-gold-400 text-stone-950 font-bold shadow-lg shadow-gold-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Apply Priority-Rebalanced Scenario ({formatINR(simulation.rebalancedTotal)})</span>
          </button>
        </div>
      </div>

      {/* Live 8-Category Comparison Table */}
      <div className="glass-panel rounded-2xl border border-stone-800 bg-stone-900/60 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-serif font-bold text-stone-100">
              Live 8-Category Elasticity Breakdown
            </h3>
            <p className="text-xs text-stone-400">
              Deterministic per-guest, step, and fixed scaling with Largest-Remainder rupee balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-800 text-stone-300 border border-stone-700">
              Largest-Remainder Rupee Sum: {formatINR(simulation.rebalancedTotal)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="What-If 8-Category Comparison Table">
            <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800 uppercase text-[10px] font-semibold">
              <tr>
                <th scope="col" className="py-3 px-4">Category</th>
                <th scope="col" className="py-3 px-3">Priority</th>
                <th scope="col" className="py-3 px-3">Scaling</th>
                <th scope="col" className="py-3 px-3">Lock</th>
                <th scope="col" className="py-3 px-4 text-right">Current Spend</th>
                <th scope="col" className="py-3 px-4 text-right">Projected (Scaled)</th>
                <th scope="col" className="py-3 px-4 text-right">Priority-Rebalanced</th>
                <th scope="col" className="py-3 px-4 text-right">Net Rupee Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {simulation.categories.map((c) => {
                const isShielded = c.priorityWeight === 'high' && c.rebalancedSpend === c.projectedSpend;
                const isCut = c.rebalancedSpend < c.projectedSpend;

                return (
                  <tr
                    key={c.key}
                    className={`hover:bg-stone-800/40 transition-colors ${
                      c.isLocked && params.respectLocks ? 'bg-stone-950/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-stone-200">
                      <div className="flex items-center gap-2">
                        <span>{c.label}</span>
                        {isShielded && (
                          <span title="Shielded from cuts" className="text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5 inline" aria-label="Shielded from cuts" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {getPriorityBadge(c.priorityWeight)}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] text-stone-400">
                        {c.scalingType === 'per_guest' ? 'Per-Guest' : c.scalingType === 'step' ? 'Step-Tier' : 'Fixed'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {c.isLocked ? (
                        <span className="inline-flex items-center text-amber-400" title="Locked category">
                          <Lock className="w-3.5 h-3.5" aria-label="Locked" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-stone-600" title="Unlocked category">
                          <Unlock className="w-3.5 h-3.5" aria-label="Unlocked" />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-stone-400">
                      {formatINR(c.currentSpend)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-gold-300">
                      {formatINR(c.projectedSpend)}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold ${
                        isCut ? 'text-amber-300' : 'text-stone-100'
                      }`}
                    >
                      {formatINR(c.rebalancedSpend)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          c.delta > 0
                            ? 'text-rose-400'
                            : c.delta < 0
                            ? 'text-emerald-400'
                            : 'text-stone-500'
                        }
                      >
                        {c.delta > 0 ? '+' : ''}
                        {formatINR(c.delta)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-950/90 font-bold border-t border-stone-800 text-stone-200">
              <tr>
                <td colSpan={4} className="py-3 px-4 uppercase text-[10px] text-stone-400">
                  Total Rupee Allocation
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatINR(simulation.currentTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gold-300">
                  {formatINR(simulation.projectedTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-stone-100">
                  {formatINR(simulation.rebalancedTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  <span
                    className={
                      simulation.rebalancedTotal > simulation.currentTotal
                        ? 'text-rose-400'
                        : simulation.rebalancedTotal < simulation.currentTotal
                        ? 'text-emerald-400'
                        : 'text-stone-400'
                    }
                  >
                    {simulation.rebalancedTotal > simulation.currentTotal ? '+' : ''}
                    {formatINR(simulation.rebalancedTotal - simulation.currentTotal)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Deterministic Facts Box (0ms) */}
      <div className="glass-panel rounded-2xl p-5 border border-stone-800 bg-stone-950/60 text-xs space-y-2">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Deterministic Mathematical Facts (Computed at 0ms)
        </span>
        <ul className="space-y-1.5 list-disc list-inside text-stone-300">
          {simulation.tradeOffFacts.map((fact, i) => (
            <li key={i} className="leading-relaxed">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
