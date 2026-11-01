import React, { useState } from 'react';
import { Store, Plus, CheckCircle2, X } from 'lucide-react';
import type { VendorSlot, VendorQuote, BudgetCategoryKey } from '../../types/plan';
import { BUDGET_CATEGORY_KEYS } from '../../lib/calculations';
import { VendorCard } from './VendorCard';
import { QuoteComparisonDrawer } from './QuoteComparisonDrawer';

interface VendorGridProps {
  vendors: VendorSlot[];
  onAddVendorSlot: (slot: Omit<VendorSlot, 'id' | 'source' | 'isLocked' | 'quotes'>) => void;
  onDeleteVendorSlot: (slotId: string) => void;
  onToggleLock: (slotId: string) => void;
  onAddQuote: (slotId: string, quote: Omit<VendorQuote, 'id' | 'isFinalized'>) => void;
  onFinalizeQuote: (slotId: string, quoteId: string) => void;
  onDeleteQuote: (slotId: string, quoteId: string) => void;
}

export const VendorGrid: React.FC<VendorGridProps> = ({
  vendors,
  onAddVendorSlot,
  onDeleteVendorSlot,
  onToggleLock,
  onAddQuote,
  onFinalizeQuote,
  onDeleteQuote,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);

  // New slot form state
  const [newType, setNewType] = useState('');
  const [newCategoryKey, setNewCategoryKey] = useState<BudgetCategoryKey>('photo_video');
  const [newEstimated, setNewEstimated] = useState<number | ''>(50000);

  const confirmedCount = vendors.filter((v) => v.status === 'confirmed' || v.quotes.some((q) => q.isFinalized)).length;

  const filteredVendors = vendors.filter((v) => {
    const isConfirmed = v.status === 'confirmed' || v.quotes.some((q) => q.isFinalized);
    if (filterStatus === 'confirmed') return isConfirmed;
    if (filterStatus === 'pending') return !isConfirmed;
    return true;
  });

  const activeSlot = vendors.find((v) => v.id === activeSlotId) || null;

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim() || newEstimated === '') return;

    onAddVendorSlot({
      type: newType.trim(),
      categoryKey: newCategoryKey,
      estimatedQuote: Number(newEstimated),
      status: 'pending',
    });

    setNewType('');
    setNewEstimated(50000);
    setIsAddSlotOpen(false);
  };

  return (
    <section aria-label="Vendor Checklist and Quote Comparator" className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gold-400" aria-hidden="true" />
            <h2 className="text-lg font-serif font-bold text-stone-100">
              Vendor Checklist & Quote Comparator
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Zero hallucinated vendors. AI creates archetypes; you enter and award real vendor proposals.
          </p>
        </div>

        {/* Status Filter & Add Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>
              {confirmedCount}/{vendors.length} Confirmed
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-stone-900 p-0.5 border border-stone-800 text-xs" role="group" aria-label="Filter vendors by status">
            <button
              onClick={() => setFilterStatus('all')}
              aria-pressed={filterStatus === 'all'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStatus === 'all'
                  ? 'bg-stone-800 text-gold-300 border border-gold-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All ({vendors.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              aria-pressed={filterStatus === 'confirmed'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStatus === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Confirmed ({confirmedCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              aria-pressed={filterStatus === 'pending'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-stone-800 text-gold-300'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Pending ({vendors.length - confirmedCount})
            </button>
          </div>

          <button
            onClick={() => setIsAddSlotOpen(true)}
            aria-label="Add new vendor slot"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-gold-500 hover:from-brand-500 hover:to-gold-400 text-white text-xs font-bold shadow-md hover:scale-[1.01] transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Slot</span>
          </button>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <div className="p-8 text-center text-stone-400 text-sm glass-panel rounded-2xl border border-stone-800">
          No vendor slots match this filter. Click &ldquo;Add Slot&rdquo; to add vendor archetypes.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVendors.map((slot) => (
            <VendorCard
              key={slot.id}
              slot={slot}
              onOpenDrawer={() => setActiveSlotId(slot.id)}
              onToggleLock={() => onToggleLock(slot.id)}
              onDelete={() => onDeleteVendorSlot(slot.id)}
            />
          ))}
        </div>
      )}

      {/* Quote Comparison Modal / Drawer */}
      <QuoteComparisonDrawer
        isOpen={activeSlotId !== null}
        onClose={() => setActiveSlotId(null)}
        slot={activeSlot}
        onAddQuote={onAddQuote}
        onFinalizeQuote={onFinalizeQuote}
        onDeleteQuote={onDeleteQuote}
      />

      {/* Add Slot Modal */}
      {isAddSlotOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-slot-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl border border-stone-700/80 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddSlotOpen(false)}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-100 rounded-lg"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <h3 id="add-slot-title" className="text-base font-serif font-bold text-stone-100 mb-4">
              Add New Vendor Archetype Slot
            </h3>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label htmlFor="slot-archetype-name" className="block text-xs font-semibold text-stone-300 mb-1">
                  Vendor Archetype / Role
                </label>
                <input
                  id="slot-archetype-name"
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="e.g. Sangeet Dhol Players & Brass Band"
                  className="glass-input w-full px-3 py-2 text-xs text-stone-100 rounded-xl"
                  required
                />
              </div>

              <div>
                <label htmlFor="slot-category-select" className="block text-xs font-semibold text-stone-300 mb-1">
                  Budget Category
                </label>
                <select
                  id="slot-category-select"
                  value={newCategoryKey}
                  onChange={(e) => setNewCategoryKey(e.target.value as BudgetCategoryKey)}
                  className="w-full bg-stone-900 text-stone-200 border border-stone-700 rounded-xl px-3 py-2 text-xs"
                >
                  {BUDGET_CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="slot-estimated-bracket" className="block text-xs font-semibold text-stone-300 mb-1">
                  Target Estimated Bracket (Integer INR)
                </label>
                <input
                  id="slot-estimated-bracket"
                  type="number"
                  step="1000"
                  min="0"
                  value={newEstimated}
                  onChange={(e) => setNewEstimated(e.target.value === '' ? '' : Number(e.target.value))}
                  className="glass-input w-full px-3 py-2 text-xs font-mono text-stone-100 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md"
                >
                  Create Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
