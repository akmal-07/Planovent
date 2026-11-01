import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Gauge, Sliders, ShieldAlert } from 'lucide-react';
import type {
  WeddingPlan,
  PlanHealthEvaluation,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
} from '../../types/plan';
import { runWhatIfSimulation } from '../../lib/simulator';
import { WhatIfSimulatorPanel } from './WhatIfSimulatorPanel';
import { RiskRadarPanel } from './RiskRadarPanel';
import { AiNarrationCard } from './AiNarrationCard';

interface WhatIfWorkspaceProps {
  plan: WeddingPlan;
  healthEvaluation: PlanHealthEvaluation;
  onApplyScenario: (mode: 'projected' | 'rebalanced', simulation: WhatIfSimulationResult) => void;
  onExtendDeadline: (taskId: string, days?: number) => void;
  onCompletePrerequisite: (taskId: string) => void;
  onAssignOwner: (taskId: string, assignee: string) => void;
  onJumpToVendors: (vendorSlotId?: string) => void;
}

export const WhatIfWorkspace: React.FC<WhatIfWorkspaceProps> = ({
  plan,
  healthEvaluation,
  onApplyScenario,
  onExtendDeadline,
  onCompletePrerequisite,
  onAssignOwner,
  onJumpToVendors,
}) => {
  // Navigation between Simulator & Risk Radar within this workspace
  const [activeSubView, setActiveSubView] = useState<'simulator' | 'risks'>('simulator');

  // Simulator Parameters State
  const [params, setParams] = useState<WhatIfSimulationParams>({
    guestCount: plan.guestCount,
    totalBudget: plan.totalBudget,
    styleMultiplier: 1.0,
    respectLocks: true,
  });

  // Sync parameters if plan changes externally
  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      guestCount: plan.guestCount,
      totalBudget: plan.totalBudget,
    }));
  }, [plan.guestCount, plan.totalBudget]);

  // Deterministic 0ms What-If Elasticity Simulation
  const simulation: WhatIfSimulationResult = useMemo(() => {
    return runWhatIfSimulation(plan, params);
  }, [plan, params]);

  // Fast-Model AI Narration State
  const [commentary, setCommentary] = useState<string | null>(null);
  const [riskAdvice, setRiskAdvice] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [narrateError, setNarrateError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Fetch Fast-Model Narration from /api/narrate
  const fetchNarration = useCallback(async () => {
    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsNarrating(true);
    setNarrateError(null);

    try {
      const res = await fetch('/api/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          guestCount: params.guestCount,
          totalBudget: params.totalBudget,
          styleMultiplier: params.styleMultiplier,
          projectedDelta: simulation.projectedTotal - simulation.currentTotal,
          isOverBudget: simulation.isOverBudget,
          rebalancedCategories: simulation.categories.map((c) => ({
            key: c.key,
            label: c.label,
            priorityWeight: c.priorityWeight,
            currentSpend: c.currentSpend,
            projectedSpend: c.projectedSpend,
            rebalancedSpend: c.rebalancedSpend,
            delta: c.delta,
            isLocked: c.isLocked,
          })),
          topRisks: healthEvaluation.risks.slice(0, 4).map((r) => ({
            id: r.id,
            rule: r.rule,
            severity: r.severity,
            title: r.title,
            description: r.description,
          })),
          tradeOffFacts: simulation.tradeOffFacts,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Narration request failed (${res.status})`);
      }

      if (data.data) {
        setCommentary(data.data.commentary);
        setRiskAdvice(data.data.riskAdvice);
        setModelUsed(data.modelUsed || null);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Narration API failed:', err.message);
        setNarrateError(err.message || 'Fast-model narration unavailable');
      }
    } finally {
      setIsNarrating(false);
    }
  }, [params, simulation, healthEvaluation.risks]);

  // Debounce (800ms) automatic trigger when simulation parameters change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchNarration();
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [params.guestCount, params.totalBudget, params.styleMultiplier, params.respectLocks, fetchNarration]);

  return (
    <div className="space-y-6">
      {/* Subview Selector Bar */}
      <div className="glass-panel rounded-2xl p-2 border border-stone-800 bg-stone-900/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('simulator')}
            aria-pressed={activeSubView === 'simulator'}
            aria-label="View What-If Elasticity Simulator"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubView === 'simulator'
                ? 'bg-stone-800 text-gold-300 border border-gold-500/30 shadow-md shadow-black/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-gold-400" aria-hidden="true" />
            <span>What-If Elasticity Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('risks')}
            aria-pressed={activeSubView === 'risks'}
            aria-label="View Risk Radar Diagnostics"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubView === 'risks'
                ? 'bg-stone-800 text-gold-300 border border-gold-500/30 shadow-md shadow-black/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 border border-transparent'
            }`}
          >
            <ShieldAlert
              className={`w-4 h-4 ${
                healthEvaluation.risks.length > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
              aria-hidden="true"
            />
            <span>Risk Radar</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                healthEvaluation.risks.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {healthEvaluation.risks.length} Risks
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-950/80 border border-stone-800 text-xs text-stone-400">
          <Gauge className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
          <span>Health Score: </span>
          <strong
            className={`font-mono ${
              healthEvaluation.score >= 80
                ? 'text-emerald-400'
                : healthEvaluation.score >= 50
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {healthEvaluation.score}/100
          </strong>
        </div>
      </div>

      {/* AI Fast-Model Narration Card */}
      <AiNarrationCard
        commentary={commentary}
        riskAdvice={riskAdvice}
        modelUsed={modelUsed}
        isLoading={isNarrating}
        error={narrateError}
        onRefresh={fetchNarration}
      />

      {/* Active Subview */}
      {activeSubView === 'simulator' ? (
        <WhatIfSimulatorPanel
          plan={plan}
          simulation={simulation}
          params={params}
          onParamsChange={setParams}
          onApplyScenario={(mode) => onApplyScenario(mode, simulation)}
        />
      ) : (
        <RiskRadarPanel
          evaluation={healthEvaluation}
          onExtendDeadline={onExtendDeadline}
          onCompletePrerequisite={onCompletePrerequisite}
          onAssignOwner={onAssignOwner}
          onApplyRebalance={() => onApplyScenario('rebalanced', simulation)}
          onJumpToVendors={onJumpToVendors}
        />
      )}
    </div>
  );
};
