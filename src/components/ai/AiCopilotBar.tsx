import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Wand2,
  Flame,
  Plus,
} from 'lucide-react';
import type { WeddingPlan } from '../../types/plan';

interface AiCopilotBarProps {
  plan: WeddingPlan;
  isAiLoading: boolean;
  aiError: string | null;
  aiSummary: string | null;
  hasSnapshot: boolean;
  onGenerate: (prompt: string) => Promise<boolean>;
  onRefine: (prompt: string) => Promise<boolean>;
  onSimulateRefine: (prompt: string) => void;
  onUndo: () => void;
  onDismissError: () => void;
  onConvertIdeaToTask: (ideaId: string) => void;
}

const REFINEMENT_CHIPS = [
  'Make catering 100% pure vegetarian & Jain-friendly',
  'Cut total spend by 15% (protect High-Priority categories)',
  'Add a Mehndi ceremony & tasks',
  'Shift ₹50,000 from Decor to Photography',
];

export const AiCopilotBar: React.FC<AiCopilotBarProps> = ({
  plan,
  isAiLoading,
  aiError,
  aiSummary,
  hasSnapshot,
  onGenerate,
  onRefine,
  onSimulateRefine,
  onUndo,
  onDismissError,
  onConvertIdeaToTask,
}) => {
  const [mode, setMode] = useState<'refine' | 'generate'>('refine');
  const [prompt, setPrompt] = useState('');

  const lockedBudgetCount = plan.budget.filter((b) => b.isLocked).length;
  const lockedTaskCount = plan.tasks.filter((t) => t.isLocked || t.source === 'user').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isAiLoading) return;

    if (mode === 'generate') {
      const ok = await onGenerate(prompt.trim());
      if (ok) setPrompt('');
    } else {
      const ok = await onRefine(prompt.trim());
      if (ok) setPrompt('');
    }
  };

  const handleChipClick = (chipText: string) => {
    setPrompt(chipText);
  };

  return (
    <section aria-label="Gemini AI Copilot and Non-Destructive Refinement" className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-stone-800 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-brand-600/10 to-gold-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-500 to-gold-400 p-[1px] shadow-md flex-shrink-0">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center text-gold-400">
                <Wand2 className="w-5 h-5 animate-pulse" aria-hidden="true" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-stone-100">
                  Gemini AI Celebration Copilot
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  @google/genai SDK
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Non-destructive refinement: respects user padlocks and prioritizes trade-offs.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs self-start sm:self-auto" role="group" aria-label="AI Mode">
            <button
              type="button"
              onClick={() => setMode('refine')}
              aria-pressed={mode === 'refine'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'refine'
                  ? 'bg-stone-800 text-gold-300 border border-gold-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Refine Existing Plan
            </button>
            <button
              type="button"
              onClick={() => setMode('generate')}
              aria-pressed={mode === 'generate'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'generate'
                  ? 'bg-stone-800 text-gold-300 border border-gold-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Generate From Scratch
            </button>
          </div>
        </div>

        {/* Lock Protection Shield Notice */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800 text-xs">
          <div className="flex items-center gap-2 text-stone-300">
            <Lock className="w-4 h-4 text-gold-400 flex-shrink-0" aria-hidden="true" />
            <span>
              <strong className="text-stone-100 font-semibold">{lockedBudgetCount} budget categories</strong> and{' '}
              <strong className="text-stone-100 font-semibold">{lockedTaskCount} tasks</strong> are currently locked & protected against AI mutation.
            </span>
          </div>

          {hasSnapshot && (
            <button
              type="button"
              onClick={onUndo}
              aria-label="Undo last AI change"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all text-xs font-semibold self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Undo Last AI Change</span>
            </button>
          )}
        </div>

        {/* Quick Refinement Chips (when in Refine mode) */}
        {mode === 'refine' && (
          <div className="mt-4">
            <span className="text-[11px] font-semibold text-stone-400 block mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
              Quick Refinement Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              {REFINEMENT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-gold-500/30 transition-colors text-left"
                >
                  &ldquo;{chip}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 600))}
              placeholder={
                mode === 'refine'
                  ? 'e.g., Cut total spend by 15% (protect high-priority food & photography), or add a Sufi Qawwali night...'
                  : 'e.g., Plan a 3-day South Indian + Marwari fusion wedding in Bengaluru for 250 guests under ₹12 Lakhs with wheelchair accessibility...'
              }
              rows={3}
              maxLength={600}
              aria-label="AI Prompt instructions"
              className="glass-input w-full p-3.5 text-xs sm:text-sm text-stone-100 rounded-xl resize-none pr-24"
              disabled={isAiLoading}
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-[10px] text-stone-500 font-mono">
                {prompt.length}/600
              </span>
              <button
                type="submit"
                disabled={isAiLoading || !prompt.trim()}
                aria-label={mode === 'refine' ? 'Refine Celebration Plan' : 'Generate Celebration Plan'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-gold-500 hover:from-brand-500 hover:to-gold-400 disabled:opacity-50 text-white shadow-lg transition-all"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'refine' ? 'Refine Plan' : 'Generate'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error Banner with Offline Demo Mode Fallback */}
        {aiError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-semibold block">AI Execution Notice:</strong>
                <span>{aiError}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onSimulateRefine(prompt || 'Simulate priority-aware 15% budget cut')}
                className="px-3 py-1.5 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 font-semibold text-xs transition-colors whitespace-nowrap"
              >
                Simulate Non-Destructive Merge (Demo Mode)
              </button>
              <button
                type="button"
                onClick={onDismissError}
                aria-label="Dismiss error banner"
                className="px-2 py-1.5 text-stone-400 hover:text-stone-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Trade-Off Rationale Banner (aiSummary) */}
        {aiSummary && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-gold-500/10 to-brand-500/10 border border-gold-500/30 text-xs text-stone-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider block">
                Trade-Off Rationale & Priority Analysis:
              </span>
              <p className="mt-0.5 text-stone-300 leading-relaxed">
                {aiSummary}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Personalised Celebration Ideas Section (Rubric Feature) */}
      {plan.ideas && plan.ideas.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-stone-800 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-gold-400" aria-hidden="true" />
            <h3 className="text-base font-serif font-bold text-stone-100">
              Personalised Celebration Concepts & Ideas ({plan.ideas.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.ideas.map((idea) => (
              <div key={idea.id} className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-800 text-stone-300 border border-stone-700 capitalize">
                      {idea.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-100">{idea.title}</h4>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    {idea.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onConvertIdeaToTask(idea.id)}
                    aria-label={`Convert idea "${idea.title}" into celebration task`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                    <span>Convert to Task</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
