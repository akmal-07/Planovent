import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  UserCheck,
  Store,
  Layers,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { PlanHealthEvaluation, RiskItem } from '../../types/plan';

interface RiskRadarPanelProps {
  evaluation: PlanHealthEvaluation;
  onExtendDeadline: (taskId: string, days?: number) => void;
  onCompletePrerequisite: (taskId: string) => void;
  onAssignOwner: (taskId: string, assignee: string) => void;
  onApplyRebalance: () => void;
  onJumpToVendors: (vendorSlotId?: string) => void;
}

export const RiskRadarPanel: React.FC<RiskRadarPanelProps> = ({
  evaluation,
  onExtendDeadline,
  onCompletePrerequisite,
  onAssignOwner,
  onApplyRebalance,
  onJumpToVendors,
}) => {
  const [inlineAssignee, setInlineAssignee] = useState<Record<string, string>>({});
  const [activeInlineTaskId, setActiveInlineTaskId] = useState<string | null>(null);

  const getStatusBadge = (status: PlanHealthEvaluation['status']) => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Healthy & On Track
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Needs Attention
          </span>
        );
      case 'At Risk':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            Critical Risks Detected
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: RiskItem['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Info
          </span>
        );
    }
  };

  const getRuleIcon = (rule: RiskItem['rule']) => {
    switch (rule) {
      case 'plan_over_budget':
      case 'category_overrun':
        return <Layers className="w-4 h-4 text-rose-400" aria-hidden="true" />;
      case 'overdue_tasks':
        return <Clock className="w-4 h-4 text-rose-400" aria-hidden="true" />;
      case 'blocked_tasks':
        return <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />;
      case 'unassigned_tasks':
        return <UserCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />;
      case 'pending_vendors':
        return <Store className="w-4 h-4 text-gold-400" aria-hidden="true" />;
    }
  };

  const handleActionClick = (risk: RiskItem) => {
    switch (risk.actionType) {
      case 'extend_deadline':
        if (risk.targetId) onExtendDeadline(risk.targetId, 7);
        break;
      case 'complete_prerequisite':
        if (risk.targetId) onCompletePrerequisite(risk.targetId);
        break;
      case 'assign_owner':
        if (risk.targetId) {
          setActiveInlineTaskId(activeInlineTaskId === risk.targetId ? null : risk.targetId);
        }
        break;
      case 'rebalance_budget':
        onApplyRebalance();
        break;
      case 'jump_to_vendors':
        onJumpToVendors(risk.targetId);
        break;
      default:
        break;
    }
  };

  const submitAssignOwner = (taskId: string) => {
    const name = inlineAssignee[taskId]?.trim() || 'Wedding Coordinator';
    onAssignOwner(taskId, name);
    setActiveInlineTaskId(null);
  };

  return (
    <section aria-label="Risk Radar Diagnostic Panel" className="space-y-5">
      {/* Health Score Overview Header */}
      <div className="glass-panel rounded-2xl p-6 border border-stone-800 bg-stone-900/60 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-800">
          <div className="flex items-center gap-4">
            {/* Visual Circular Gauge */}
            <div className="relative w-16 h-16 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center shrink-0 shadow-inner">
              <span
                className={`text-2xl font-mono font-black ${
                  evaluation.score >= 80
                    ? 'text-emerald-400'
                    : evaluation.score >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {evaluation.score}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-stone-500 font-semibold">
                Score
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-serif font-bold text-stone-100">
                  Risk Radar Diagnostic Engine
                </h2>
                {getStatusBadge(evaluation.status)}
              </div>
              <p className="text-xs text-stone-400">
                Evaluating DAG blockers, financial overruns, overdue dates, and vendor gaps deterministically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-stone-950/80 border border-stone-800 text-right">
              <span className="block text-[10px] uppercase font-semibold text-stone-500">
                Active Risks
              </span>
              <span className="text-sm font-mono font-bold text-stone-200">
                {evaluation.risks.length} Detected
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Gauge */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-stone-400 mb-1.5">
            <span>Overall Plan Health Index</span>
            <span className="font-mono">{evaluation.score} / 100</span>
          </div>
          <div className="h-2 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                evaluation.score >= 80
                  ? 'bg-emerald-500'
                  : evaluation.score >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, evaluation.score))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Risks List */}
      <div className="space-y-3">
        {evaluation.risks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 border border-emerald-500/30 bg-emerald-950/10 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-serif font-bold text-emerald-200">
              Zero Operational Blockers
            </h3>
            <p className="text-xs text-stone-300 max-w-md mx-auto">
              All categories are within budget, all tasks have designated owners with valid future deadlines, and vendor quotes are confirmed.
            </p>
          </div>
        ) : (
          evaluation.risks.map((risk) => (
            <div
              key={risk.id}
              className={`glass-panel rounded-xl p-4 border transition-all ${
                risk.severity === 'critical'
                  ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60'
                  : 'border-stone-800 bg-stone-900/50 hover:border-stone-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 shrink-0 mt-0.5">
                    {getRuleIcon(risk.rule)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-stone-100">
                        {risk.title}
                      </span>
                      {getSeverityBadge(risk.severity)}
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {risk.description}
                    </p>
                  </div>
                </div>

                {/* 1-Click Action Button */}
                <div className="self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleActionClick(risk)}
                    aria-label={`Fix risk: ${risk.actionLabel}`}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                      risk.severity === 'critical'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
                        : 'bg-stone-800 hover:bg-gold-500 hover:text-stone-950 text-gold-300 border border-gold-500/30'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{risk.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Inline Owner Assignment Input */}
              {risk.actionType === 'assign_owner' && activeInlineTaskId === risk.targetId && (
                <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center gap-2 animate-fadeIn">
                  <label htmlFor={`assignee-input-${risk.targetId}`} className="sr-only">
                    Lead Assignee Name
                  </label>
                  <input
                    id={`assignee-input-${risk.targetId}`}
                    type="text"
                    placeholder="Enter coordinator name (e.g. Uncle Murthy)"
                    value={inlineAssignee[risk.targetId || ''] || ''}
                    onChange={(e) =>
                      setInlineAssignee((prev) => ({
                        ...prev,
                        [risk.targetId || '']: e.target.value,
                      }))
                    }
                    className="flex-1 bg-stone-950/80 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-gold-400"
                  />
                  <button
                    type="button"
                    onClick={() => risk.targetId && submitAssignOwner(risk.targetId)}
                    aria-label="Confirm Lead Assignee"
                    className="px-3 py-1.5 bg-gold-500 text-stone-950 font-semibold rounded-lg text-xs hover:bg-gold-400 transition-colors"
                  >
                    Save Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInlineTaskId(null)}
                    aria-label="Cancel owner assignment"
                    className="px-2 py-1.5 text-stone-400 text-xs hover:text-stone-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
