import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  ShieldAlert,
  Building,
  Utensils,
  Flower2,
  Camera,
  Music,
  Mail,
  Car,
  Package,
} from 'lucide-react';
import type { BudgetCategory, BudgetCategoryKey, PriorityLevel } from '../../types/plan';
import { formatINR, getEffectiveSpend } from '../../lib/calculations';

interface CategoryRowProps {
  category: BudgetCategory;
  totalPlannedOrActual: number;
  onUpdate: (updates: Partial<BudgetCategory>) => void;
  onToggleLock: () => void;
}

const CATEGORY_ICONS: Record<BudgetCategoryKey, React.ElementType> = {
  venue: Building,
  catering: Utensils,
  decor: Flower2,
  photo_video: Camera,
  entertainment: Music,
  invites: Mail,
  transport: Car,
  misc: Package,
};

const PRIORITY_BADGES: Record<PriorityLevel, { label: string; class: string }> = {
  high: { label: 'High Priority (Protected)', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  medium: { label: 'Medium Priority', class: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  low: { label: 'Low Priority (Flexible)', class: 'bg-stone-800 text-stone-400 border-stone-700' },
};

export const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  totalPlannedOrActual,
  onUpdate,
  onToggleLock,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[category.key] || Package;

  const effective = getEffectiveSpend(category);
  const balanceDue = Math.max(0, effective - category.paid);
  const percentOfTotal =
    totalPlannedOrActual > 0
      ? Math.round((effective / totalPlannedOrActual) * 100)
      : 0;

  const handleEstimatedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const val = Number.isNaN(raw) ? 0 : raw;
    onUpdate({ estimated: Math.max(0, Math.round(val)) });
  };

  const handleActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      onUpdate({ actual: undefined });
      return;
    }
    const raw = Number(e.target.value);
    const val = Number.isNaN(raw) ? 0 : raw;
    onUpdate({ actual: Math.max(0, Math.round(val)) });
  };

  const handlePaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const val = Number.isNaN(raw) ? 0 : raw;
    onUpdate({ paid: Math.max(0, Math.round(val)) });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ priorityWeight: e.target.value as PriorityLevel });
  };

  return (
    <div className={`transition-all border-b border-stone-800/80 hover:bg-stone-900/40 ${
      category.isLocked ? 'bg-stone-900/10' : ''
    }`}>
      {/* Primary Row */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 px-4 sm:px-6 py-4 items-center">
        {/* Category Identity & Lock */}
        <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
          {/* Padlock button with explicit accessibility attributes */}
          <button
            onClick={onToggleLock}
            type="button"
            aria-label={category.isLocked ? `Unlock ${category.label}` : `Lock ${category.label}`}
            aria-pressed={category.isLocked}
            className={`p-1.5 rounded-lg border transition-all ${
              category.isLocked
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                : 'bg-stone-800/80 border-stone-700/60 text-stone-400 hover:text-stone-200'
            }`}
            title={category.isLocked ? 'Locked: Protected from AI mutation' : 'Unlocked: Open for AI adjustments'}
          >
            {category.isLocked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <Unlock className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>

          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>

          {/* Title & Badges */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-stone-200 truncate">
                {category.label}
              </span>

              {/* Priority Badge */}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_BADGES[category.priorityWeight].class}`}>
                {category.priorityWeight === 'high' ? 'High' : category.priorityWeight === 'medium' ? 'Med' : 'Low'}
              </span>

              {/* Source Badge */}
              {category.source === 'user' ? (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <User className="w-2.5 h-2.5" aria-hidden="true" />
                  User
                </span>
              ) : (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                  AI
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-400 truncate mt-0.5">
              Scaling: <span className="font-mono text-stone-300 capitalize">{category.scalingType}</span>
            </p>
          </div>
        </div>

        {/* Estimated Input */}
        <div className="col-span-4 sm:col-span-2">
          <label htmlFor={`est-${category.id}`} className="sm:hidden text-[10px] text-stone-400 uppercase font-semibold block mb-1">
            Estimated
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-mono">₹</span>
            <input
              id={`est-${category.id}`}
              type="number"
              step="1000"
              value={category.estimated || ''}
              onChange={handleEstimatedChange}
              aria-label={`Estimated budget for ${category.label}`}
              className="glass-input w-full pl-6 pr-2 py-1.5 text-xs sm:text-sm font-mono text-stone-200 rounded-lg text-right"
              placeholder="0"
            />
          </div>
        </div>

        {/* Actual Input */}
        <div className="col-span-4 sm:col-span-2">
          <label htmlFor={`act-${category.id}`} className="sm:hidden text-[10px] text-stone-400 uppercase font-semibold block mb-1">
            Actual Final
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-mono">₹</span>
            <input
              id={`act-${category.id}`}
              type="number"
              step="1000"
              value={category.actual !== undefined ? category.actual : ''}
              onChange={handleActualChange}
              aria-label={`Actual confirmed spend for ${category.label}`}
              className="glass-input w-full pl-6 pr-2 py-1.5 text-xs sm:text-sm font-mono text-stone-200 rounded-lg text-right placeholder:text-stone-600"
              placeholder="Pending quotes"
            />
          </div>
        </div>

        {/* Paid Input */}
        <div className="col-span-4 sm:col-span-2">
          <label htmlFor={`paid-${category.id}`} className="sm:hidden text-[10px] text-stone-400 uppercase font-semibold block mb-1">
            Paid
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-mono">₹</span>
            <input
              id={`paid-${category.id}`}
              type="number"
              step="1000"
              value={category.paid || ''}
              onChange={handlePaidChange}
              aria-label={`Amount paid to date for ${category.label}`}
              className="glass-input w-full pl-6 pr-2 py-1.5 text-xs sm:text-sm font-mono text-emerald-300 rounded-lg text-right"
              placeholder="0"
            />
          </div>
        </div>

        {/* Effective Spend & Toggle Details */}
        <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
          <div className="text-right">
            <div className="text-[10px] text-stone-400 uppercase font-semibold sm:hidden">Effective Spend</div>
            <div className="text-sm font-mono font-bold text-gold-300">
              {formatINR(effective)}
            </div>
            <div className="text-[10px] text-stone-400">
              {percentOfTotal}% of total spend
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={`Toggle extra settings for ${category.label}`}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Expandable Details Panel */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 pt-1 bg-stone-900/30 border-t border-stone-800/40 text-xs text-stone-300 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Priority Weight Selector */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <label htmlFor={`priority-${category.id}`} className="text-[10px] uppercase text-stone-400 font-semibold block mb-1">
                Value Priority (Trade-Off Rule)
              </label>
              <select
                id={`priority-${category.id}`}
                value={category.priorityWeight}
                onChange={handlePriorityChange}
                aria-label={`Priority level for ${category.label}`}
                className="w-full bg-stone-800 text-stone-200 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs"
              >
                <option value="high">High (Shielded from cuts)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="low">Low (Cut first in budget trim)</option>
              </select>
              <p className="text-[10px] text-stone-500 mt-1">
                In Bit 3 What-If simulations, high categories are protected.
              </p>
            </div>

            {/* Balance Due */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-400 font-semibold block">Outstanding Vendor Balance</span>
              <span className="text-sm font-mono font-bold text-amber-300 mt-1 block">
                {formatINR(balanceDue)}
              </span>
              <p className="text-[10px] text-stone-500 mt-1">
                Calculated: Effective ({formatINR(effective)}) − Paid ({formatINR(category.paid)})
              </p>
            </div>

            {/* Invariant Note */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] uppercase text-stone-400 font-semibold block flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Auto-Lock Rule
              </span>
              <p className="text-[11px] text-stone-400 mt-1">
                Manual edits set <code className="text-gold-300 font-mono">isLocked: true</code> so future AI refinements preserve your numbers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
