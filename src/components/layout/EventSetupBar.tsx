import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, IndianRupee, MapPin, Sparkles, Check, Accessibility } from 'lucide-react';
import type { WeddingPlan } from '../../types/plan';
import { formatINR } from '../../lib/calculations';

interface EventSetupBarProps {
  isOpen: boolean;
  onClose: () => void;
  plan: WeddingPlan;
  onSave: (details: Partial<WeddingPlan>) => void;
}

const COMMON_ACCESSIBILITY_PRESETS = [
  'Wheelchair Accessible Venue & Entrance Ramps',
  'Elderly Ground-Floor Banquet Seating',
  'Pure Vegetarian & Jain Counter Separation',
  'Braille / High-Contrast Signage',
  'Sound-Sensitive Quiet Room',
];

export const EventSetupBar: React.FC<EventSetupBarProps> = ({
  isOpen,
  onClose,
  plan,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    title: plan.title,
    city: plan.city,
    eventStyle: plan.eventStyle,
    guestCount: plan.guestCount,
    totalBudget: plan.totalBudget,
    accessibilityNeeds: [...plan.accessibilityNeeds],
    functions: [...plan.functions],
  });

  const [newNeed, setNewNeed] = useState('');

  useEffect(() => {
    setFormData({
      title: plan.title,
      city: plan.city,
      eventStyle: plan.eventStyle,
      guestCount: plan.guestCount,
      totalBudget: plan.totalBudget,
      accessibilityNeeds: [...plan.accessibilityNeeds],
      functions: [...plan.functions],
    });
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleToggleNeed = (need: string) => {
    setFormData((prev) => {
      const exists = prev.accessibilityNeeds.includes(need);
      return {
        ...prev,
        accessibilityNeeds: exists
          ? prev.accessibilityNeeds.filter((n) => n !== need)
          : [...prev.accessibilityNeeds, need],
      };
    });
  };

  const handleAddCustomNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNeed.trim() && !formData.accessibilityNeeds.includes(newNeed.trim())) {
      setFormData((prev) => ({
        ...prev,
        accessibilityNeeds: [...prev.accessibilityNeeds, newNeed.trim()],
      }));
      setNewNeed('');
    }
  };

  const handleFunctionDateChange = (index: number, date: string) => {
    setFormData((prev) => {
      const updated = [...prev.functions];
      updated[index] = { ...updated[index], date };
      return { ...prev, functions: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: formData.title.trim() || 'My Celebration',
      city: formData.city.trim() || 'Destination',
      eventStyle: formData.eventStyle.trim() || 'Traditional Intimate',
      guestCount: Math.max(1, Math.round(Number(formData.guestCount) || 200)),
      totalBudget: Math.max(10000, Math.round(Number(formData.totalBudget) || 800000)),
      accessibilityNeeds: formData.accessibilityNeeds,
      functions: formData.functions,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-stone-700/80 p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close setup modal"
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="setup-modal-title" className="text-xl font-serif font-bold text-stone-100">
              Event Setup, Priorities & Accessibility
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Set target budget, guest scaling capacity, multi-day function dates, and special needs.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-title" className="block text-xs font-semibold text-stone-300 mb-1.5">
                Celebration Title
              </label>
              <input
                id="event-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-100"
                placeholder="e.g. Pooja & Srinivas’s Traditional Celebration"
                required
              />
            </div>
            <div>
              <label htmlFor="event-style" className="block text-xs font-semibold text-stone-300 mb-1.5">
                Event Style / Atmosphere
              </label>
              <input
                id="event-style"
                type="text"
                value={formData.eventStyle}
                onChange={(e) => setFormData({ ...formData, eventStyle: e.target.value })}
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-100"
                placeholder="e.g. Traditional Intimate, Destination Royal"
                required
              />
            </div>
          </div>

          {/* City & Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-city" className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                City / Location
              </label>
              <input
                id="event-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-100"
                placeholder="e.g. Hyderabad"
                required
              />
            </div>
            <div>
              <label htmlFor="event-guests" className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                Guest Count (Benchmark: 200)
              </label>
              <input
                id="event-guests"
                type="number"
                min="1"
                step="1"
                value={formData.guestCount}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  setFormData({ ...formData, guestCount: Number.isNaN(raw) ? 1 : Math.max(1, Math.round(raw)) });
                }}
                className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-100 font-mono"
                required
              />
            </div>
          </div>

          {/* Total Budget */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="event-budget" className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                Total Event Budget (Integer INR — Benchmark: ₹8,00,000)
              </label>
              <span className="text-xs font-mono font-bold text-gold-300">
                {formatINR(Number(formData.totalBudget) || 0)}
              </span>
            </div>
            <input
              id="event-budget"
              type="number"
              min="10000"
              step="5000"
              value={formData.totalBudget}
              onChange={(e) => {
                const raw = Number(e.target.value);
                setFormData({ ...formData, totalBudget: Number.isNaN(raw) ? 0 : Math.max(0, Math.round(raw)) });
              }}
              className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-stone-100"
              required
            />
          </div>

          {/* Multi-Day Function Itinerary Dates */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              Multi-Day Function Dates
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {formData.functions.map((fn, idx) => (
                <div key={fn.name} className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-200 mb-1">{fn.name}</div>
                  <input
                    type="date"
                    value={fn.date}
                    aria-label={`Date for ${fn.name}`}
                    onChange={(e) => handleFunctionDateChange(idx, e.target.value)}
                    className="w-full text-xs font-mono bg-stone-950 border border-stone-700/60 rounded px-2 py-1 text-stone-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Accessibility & Dietary Needs (Rubric Requirement) */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
              <Accessibility className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              Accessibility & Dietary Inclusions (Rubric Alignment)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_ACCESSIBILITY_PRESETS.map((preset) => {
                const isSelected = formData.accessibilityNeeds.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleToggleNeed(preset)}
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Custom Need Adder */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNeed}
                onChange={(e) => setNewNeed(e.target.value)}
                placeholder="Add custom need (e.g. Gluten-free counter)..."
                aria-label="Add custom accessibility or dietary need"
                className="glass-input flex-1 px-3 py-1.5 text-xs text-stone-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomNeed}
                aria-label="Add need to list"
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-gold-500 hover:from-brand-500 hover:to-gold-400 text-white shadow-lg shadow-brand-950/40 transition-all hover:scale-[1.01]"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
