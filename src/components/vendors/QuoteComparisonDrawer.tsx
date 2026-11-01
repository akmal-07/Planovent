import React, { useState } from 'react';
import { X, Plus, Check, Award, ShieldAlert, IndianRupee, Trash2 } from 'lucide-react';
import type { VendorSlot, VendorQuote } from '../../types/plan';
import { formatINR } from '../../lib/calculations';

interface QuoteComparisonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slot: VendorSlot | null;
  onAddQuote: (slotId: string, quote: Omit<VendorQuote, 'id' | 'isFinalized'>) => void;
  onFinalizeQuote: (slotId: string, quoteId: string) => void;
  onDeleteQuote: (slotId: string, quoteId: string) => void;
}

export const QuoteComparisonDrawer: React.FC<QuoteComparisonDrawerProps> = ({
  isOpen,
  onClose,
  slot,
  onAddQuote,
  onFinalizeQuote,
  onDeleteQuote,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [quotedPrice, setQuotedPrice] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !slot) return null;

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || quotedPrice === '') return;

    onAddQuote(slot.id, {
      vendorName: vendorName.trim(),
      quotedPrice: Number(quotedPrice),
      notes: notes.trim() || undefined,
    });

    setVendorName('');
    setQuotedPrice('');
    setNotes('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-stone-700/80 p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close quote comparison dialog"
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gold-400/10 text-gold-400 border border-gold-400/20 uppercase tracking-wider">
              {slot.categoryKey}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Target Bracket: {formatINR(slot.estimatedQuote)}
            </span>
          </div>
          <h2 id="drawer-title" className="text-xl font-serif font-bold text-stone-100 mt-1">
            {slot.type} — Quote Comparator
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Compare vendor proposals side-by-side. Finalizing a quote synchronizes the committed spend to your budget.
          </p>
        </div>

        {/* Zero Hallucinated Vendors Rule Banner */}
        <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-xs text-stone-400 flex items-center gap-2 mb-6">
          <ShieldAlert className="w-4 h-4 text-gold-400 flex-shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-stone-300">Constitutional Invariant:</strong> The AI never invents fake vendors or phone numbers. Real vendor names and numbers only exist when entered by you below.
          </span>
        </div>

        {/* Existing Quotes Grid / Table */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Received Vendor Quotes ({slot.quotes.length})
          </h3>

          {slot.quotes.length === 0 ? (
            <div className="p-6 rounded-xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-400">
              No quotes added for this slot yet. Record your first vendor proposal below.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slot.quotes.map((quote) => {
                const variance = quote.quotedPrice - slot.estimatedQuote;
                const isOver = variance > 0;

                return (
                  <div
                    key={quote.id}
                    className={`p-4 rounded-xl border transition-all relative ${
                      quote.isFinalized
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                        : 'bg-stone-900/60 border-stone-800'
                    }`}
                  >
                    {/* Finalized Banner */}
                    {quote.isFinalized && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mb-2">
                        <Award className="w-3.5 h-3.5" aria-hidden="true" />
                        Finalized & Awarded Vendor
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-stone-100">{quote.vendorName}</h4>
                        <div className="text-lg font-mono font-bold text-gold-300 mt-1">
                          {formatINR(quote.quotedPrice)}
                        </div>
                      </div>

                      {/* Variance Tag */}
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        isOver
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {variance === 0 ? 'Exact Budget' : `${isOver ? '+' : ''}${formatINR(variance)}`}
                      </span>
                    </div>

                    {quote.notes && (
                      <p className="text-xs text-stone-400 mt-2 bg-stone-950/40 p-2 rounded-lg border border-stone-800/80">
                        {quote.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-800/60">
                      <button
                        type="button"
                        onClick={() => onDeleteQuote(slot.id, quote.id)}
                        aria-label={`Delete quote from ${quote.vendorName}`}
                        className="text-stone-500 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>

                      {!quote.isFinalized ? (
                        <button
                          type="button"
                          onClick={() => onFinalizeQuote(slot.id, quote.id)}
                          aria-label={`Award contract to ${quote.vendorName}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Finalize Vendor
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Real Vendor Quote Form */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-900/90 border border-stone-800">
          <h3 className="text-xs font-semibold text-stone-200 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-gold-400" aria-hidden="true" />
            Add Real Vendor Proposal
          </h3>

          <form onSubmit={handleCreateQuote} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="vendor-name-input" className="block text-xs font-semibold text-stone-400 mb-1">
                  Vendor / Business Name
                </label>
                <input
                  id="vendor-name-input"
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Heritage Lens Studio"
                  className="glass-input w-full px-3 py-2 text-xs text-stone-100 rounded-lg"
                  required
                />
              </div>

              <div>
                <label htmlFor="vendor-price-input" className="block text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3 text-gold-400" aria-hidden="true" />
                  Quoted Price (Integer INR)
                </label>
                <input
                  id="vendor-price-input"
                  type="number"
                  step="1000"
                  min="0"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 75000"
                  className="glass-input w-full px-3 py-2 text-xs font-mono text-stone-100 rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="vendor-notes-input" className="block text-xs font-semibold text-stone-400 mb-1">
                Proposal Deliverables & Payment Terms
              </label>
              <input
                id="vendor-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Includes drone coverage, 3 albums, 25% advance on booking"
                className="glass-input w-full px-3 py-2 text-xs text-stone-100 rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Record Quote
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
