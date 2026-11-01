import React from 'react';
import { Sparkles, Bot, AlertTriangle, RefreshCw } from 'lucide-react';

interface AiNarrationCardProps {
  commentary: string | null;
  riskAdvice: string | null;
  modelUsed: string | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const AiNarrationCard: React.FC<AiNarrationCardProps> = ({
  commentary,
  riskAdvice,
  modelUsed,
  isLoading,
  error,
  onRefresh,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-stone-800 bg-stone-900/50 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
            <Bot className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-200">
                AI Trade-Off & Risk Commentary
              </h3>
              {modelUsed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {modelUsed}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400">
              Executive trade-off analysis computed by fast model
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh AI Trade-Off Commentary"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 hover:text-gold-300 hover:bg-stone-800/80 border border-stone-700/80 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-gold-400' : ''}`} aria-hidden="true" />
          <span>{isLoading ? 'Analyzing...' : 'Ask AI to Explain'}</span>
        </button>
      </div>

      {isLoading && !commentary && (
        <div className="py-6 flex flex-col items-center justify-center text-center text-stone-400 animate-pulse">
          <Sparkles className="w-6 h-6 text-gold-400 mb-2 animate-spin" aria-hidden="true" />
          <p className="text-xs">Synthesizing trade-offs with fast AI model...</p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-300 text-xs flex items-start gap-2.5 my-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="font-semibold block">AI Commentary Offline:</strong>
            <span>{error}</span>
            <p className="text-[11px] text-stone-400 mt-1">
              Deterministic 0ms simulation numbers and Risk Radar cards remain 100% active.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && !commentary && (
        <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 text-stone-400 text-xs text-center">
          <p>Adjust sliders or click &ldquo;Ask AI to Explain&rdquo; to receive fast-model trade-off commentary.</p>
        </div>
      )}

      {commentary && (
        <div className="space-y-3 pt-2">
          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800/80">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gold-400 mb-1">
              Financial & Priority Trade-Offs
            </span>
            <p className="text-xs text-stone-200 leading-relaxed font-sans">
              {commentary}
            </p>
          </div>

          {riskAdvice && (
            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800/80">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                Strategic Risk Advisory
              </span>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">
                {riskAdvice}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
