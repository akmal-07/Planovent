import React from 'react';
import { Lock, Unlock, Sparkles, User, Trash2, ArrowUpRight } from 'lucide-react';
import type { VendorSlot } from '../../types/plan';
import { formatINR } from '../../lib/calculations';

interface VendorCardProps {
  slot: VendorSlot;
  onOpenDrawer: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  slot,
  onOpenDrawer,
  onToggleLock,
  onDelete,
}) => {
  const finalizedQuote = slot.quotes.find((q) => q.isFinalized);
  const isConfirmed = slot.status === 'confirmed' || finalizedQuote !== undefined;

  return (
    <div className={`glass-card rounded-2xl p-5 border transition-all flex flex-col justify-between ${
      isConfirmed
        ? 'border-emerald-500/30 bg-emerald-950/10'
        : 'border-stone-800 hover:border-gold-500/30'
    }`}>
      {/* Top Meta */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-800 text-stone-300 border border-stone-700 uppercase tracking-wider">
              {slot.categoryKey}
            </span>

            {/* Source */}
            {slot.source === 'user' ? (
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

          {/* Lock & Delete */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleLock}
              aria-label={slot.isLocked ? `Unlock vendor slot "${slot.type}"` : `Lock vendor slot "${slot.type}"`}
              aria-pressed={slot.isLocked}
              className={`p-1.5 rounded-lg border transition-all ${
                slot.isLocked
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700/60'
              }`}
              title={slot.isLocked ? 'Locked by user' : 'Unlocked'}
            >
              {slot.isLocked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <Unlock className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
            <button
              onClick={onDelete}
              aria-label={`Delete vendor slot "${slot.type}"`}
              className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
              title="Delete slot"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Title / Archetype */}
        <h3 className="text-base font-serif font-bold text-stone-100 leading-snug">
          {slot.type}
        </h3>

        {/* Estimated Bracket vs Awarded Price */}
        <div className="mt-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-stone-400 uppercase font-semibold">
              {isConfirmed && finalizedQuote ? 'Awarded Contract' : 'Target Bracket'}
            </span>
            <span className="text-sm font-mono font-bold text-gold-300">
              {formatINR(isConfirmed && finalizedQuote ? finalizedQuote.quotedPrice : slot.estimatedQuote)}
            </span>
          </div>
          {isConfirmed && finalizedQuote && (
            <div className="text-[11px] text-emerald-400 font-medium mt-1 truncate">
              ✓ {finalizedQuote.vendorName}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Comparator Trigger */}
      <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
        <span className="text-xs text-stone-400 font-mono">
          {slot.quotes.length === 1 ? '1 quote recorded' : `${slot.quotes.length} quotes recorded`}
        </span>

        <button
          onClick={onOpenDrawer}
          aria-label={`Compare quotes for ${slot.type}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
        >
          <span>Compare Quotes</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
