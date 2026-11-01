import React from 'react';
import { Sparkles, RotateCcw, RefreshCw, Undo2, Calendar, MapPin, IndianRupee, HeartHandshake } from 'lucide-react';
import type { WeddingPlan } from '../../types/plan';
import { formatCompactINR, calculateDaysRemaining } from '../../lib/calculations';

interface HeaderProps {
  plan: WeddingPlan;
  hasSnapshot: boolean;
  onLoadBenchmark: () => void;
  onReset: () => void;
  onUndo: () => void;
  onOpenSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  hasSnapshot,
  onLoadBenchmark,
  onReset,
  onUndo,
  onOpenSetup,
}) => {
  const primaryDate = plan.functions[0]?.date || new Date().toISOString().split('T')[0];
  const daysRemaining = calculateDaysRemaining(primaryDate);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur-xl transition-all" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-500 to-gold-400 p-[1px] shadow-lg shadow-brand-950/50 flex-shrink-0">
              <div className="w-full h-full bg-stone-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" aria-hidden="true" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-tight truncate">
                  {plan.title}
                </h1>
                {plan.id === 'benchmark-hyderabad-8L' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gold-400/10 text-gold-400 border border-gold-400/20">
                    Viewing Example Preset
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-500" aria-hidden="true" />
                  {plan.city} • {plan.eventStyle}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-stone-300">
                  <Calendar className="w-3 h-3 text-stone-500" aria-hidden="true" />
                  {daysRemaining > 0 ? `${daysRemaining} days to go` : daysRemaining === 0 ? 'Today is the celebration!' : 'Celebration concluded'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Stat Pill */}
            <button
              onClick={onOpenSetup}
              aria-label="Open Event Setup and Priorities to configure budget and guests"
              className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-gold-500/40 transition-colors text-left group"
              title="Click to configure celebration setup and priorities"
            >
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block">
                  Total Budget ({plan.guestCount} Guests)
                </span>
                <span className="text-sm font-bold text-gold-300 font-mono flex items-center justify-end">
                  {formatCompactINR(plan.totalBudget)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-stone-300 group-hover:text-gold-300 transition-colors">
                <IndianRupee className="w-4 h-4" aria-hidden="true" />
              </div>
            </button>

            {/* Undo Snapshot Button */}
            {hasSnapshot && (
              <button
                onClick={onUndo}
                aria-label="Undo last change"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm animate-pulse"
                title="Undo last change from snapshot"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Undo</span>
              </button>
            )}

            {/* Load Benchmark ₹8L / 200 Guests Button */}
            <button
              onClick={onLoadBenchmark}
              aria-label="Load ₹8L / 200-Guest benchmark example wedding"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800/90 hover:bg-stone-800 text-stone-200 border border-stone-700/60 hover:border-gold-500/40 transition-all shadow-sm"
              title="Reset and load official ₹8L / 200-guest benchmark scenario"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
              <span className="hidden sm:inline">Load ₹8L / 200-Guest Example</span>
              <span className="sm:hidden">₹8L Demo</span>
            </button>

            {/* Event Setup Trigger */}
            <button
              onClick={onOpenSetup}
              aria-label="Configure Event Priorities and Setup"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition-all"
              title="Event Setup & Priority Bar"
            >
              <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Setup & Priorities</span>
            </button>

            {/* Reset Plan Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset plan to blank? You can reload the ₹8L benchmark example anytime.')) {
                  onReset();
                }
              }}
              aria-label="Reset plan to blank state"
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-lg border border-transparent hover:border-stone-700/50 transition-colors"
              title="Reset plan to blank"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
