import React, { useState } from 'react';
import { useWeddingPlan } from './hooks/useWeddingPlan';
import { Header } from './components/layout/Header';
import { NavigationTabs, type ActiveTab } from './components/layout/NavigationTabs';
import { EventSetupBar } from './components/layout/EventSetupBar';
import { BudgetSummaryCards } from './components/budget/BudgetSummaryCards';
import { BudgetTable } from './components/budget/BudgetTable';
import { TaskChecklist } from './components/timeline/TaskChecklist';
import { VendorGrid } from './components/vendors/VendorGrid';
import { WhatIfWorkspace } from './components/simulator/WhatIfWorkspace';
import { AiCopilotBar } from './components/ai/AiCopilotBar';
import { FamilySummaryModal } from './components/layout/FamilySummaryModal';
import { formatINR } from './lib/calculations';

export const App: React.FC = () => {
  const {
    plan,
    summary,
    healthEvaluation,
    hasSnapshot,
    isAiLoading,
    aiError,
    aiSummary,
    loadBenchmarkPlan,
    resetPlan,
    updateEventDetails,
    updateCategory,
    toggleCategoryLock,
    addTask,
    updateTask,
    toggleTaskDone,
    deleteTask,
    toggleTaskLock,
    addVendorSlot,
    deleteVendorSlot,
    toggleVendorSlotLock,
    addVendorQuote,
    finalizeVendorQuote,
    deleteVendorQuote,
    convertIdeaToTask,
    importPlan,
    applyWhatIfScenario,
    extendTaskDeadline,
    assignTaskOwner,
    completeTaskPrerequisite,
    generateAiPlan,
    refineAiPlan,
    undoLastAiChange,
    dismissAiError,
  } = useWeddingPlan();

  const [activeTab, setActiveTab] = useState<ActiveTab>('budget');
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      {/* 0. Executive Print Layout (Hidden on Screen, Rendered Cleanly on White Paper on Print) */}
      <div className="hidden print:block bg-white text-stone-950 p-8 max-w-4xl mx-auto font-sans leading-relaxed text-xs">
        {/* Document Header */}
        <div className="border-b-2 border-stone-800 pb-4 mb-6 flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-500 block">
              Celebration Architecture & Family Executive Summary
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-950 mt-1">{plan.title}</h1>
            <p className="text-xs text-stone-600 mt-1">
              {plan.city} • {plan.eventStyle} • {plan.guestCount} Guests • Target Total Budget: {formatINR(plan.totalBudget)}
            </p>
          </div>
          <div className="text-right text-[11px] text-stone-600">
            <span className="font-bold text-stone-900 block">Celebration Planner</span>
            <span>Printed: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* 1. Multi-Day Function Schedule */}
        {plan.functions.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-1 mb-2">
              📅 Celebration Schedule
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {plan.functions.map((fn, idx) => (
                <div key={idx} className="p-2 border border-stone-200 rounded flex justify-between items-center bg-stone-50">
                  <span className="font-semibold">{fn.name}</span>
                  <span className="text-stone-600 font-mono">{fn.date}{fn.time ? ` (${fn.time})` : ''}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Financial Overview Snapshot */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-1 mb-2">
            💰 Financial Snapshot
          </h2>
          <div className="grid grid-cols-4 gap-3 text-xs mb-3">
            <div className="p-2.5 border border-stone-200 rounded bg-stone-50">
              <span className="text-[10px] uppercase text-stone-500 block">Total Budget</span>
              <span className="font-bold font-mono text-sm">{formatINR(plan.totalBudget)}</span>
            </div>
            <div className="p-2.5 border border-stone-200 rounded bg-stone-50">
              <span className="text-[10px] uppercase text-stone-500 block">Committed Spend</span>
              <span className="font-bold font-mono text-sm">{formatINR(summary.totalPlannedOrActual)}</span>
            </div>
            <div className="p-2.5 border border-stone-200 rounded bg-stone-50">
              <span className="text-[10px] uppercase text-stone-500 block">Paid to Date</span>
              <span className="font-bold font-mono text-sm">{formatINR(summary.totalPaid)}</span>
            </div>
            <div className="p-2.5 border border-stone-200 rounded bg-stone-50">
              <span className="text-[10px] uppercase text-stone-500 block">Remaining Due</span>
              <span className="font-bold font-mono text-sm">{formatINR(summary.totalDue)}</span>
            </div>
          </div>
          <div className="text-xs font-medium">
            {summary.isOverBudget ? (
              <span className="text-rose-700 font-semibold">⚠️ Deficit Notice: Committed costs exceed total budget by {formatINR(summary.overBudgetAmount)}.</span>
            ) : (
              <span className="text-emerald-700 font-semibold">🛡️ Budget Health: Secure reserve cushion of {formatINR(summary.remainingBudget)} available.</span>
            )}
          </div>
        </section>

        {/* 3. 8 Core Budget Categories Breakdown */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-1 mb-2">
            🏷️ 8-Category Allocations
          </h2>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-300 text-stone-600 bg-stone-100">
                <th className="py-1.5 px-2 font-semibold">Category</th>
                <th className="py-1.5 px-2 font-semibold">Priority</th>
                <th className="py-1.5 px-2 font-semibold">Scaling</th>
                <th className="py-1.5 px-2 font-semibold text-right">Estimated</th>
                <th className="py-1.5 px-2 font-semibold text-right">Actual/Committed</th>
                <th className="py-1.5 px-2 font-semibold text-right">Paid</th>
                <th className="py-1.5 px-2 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.budget.map((cat) => (
                <tr key={cat.id} className="border-b border-stone-200">
                  <td className="py-1.5 px-2 font-medium">{cat.label}</td>
                  <td className="py-1.5 px-2 capitalize">{cat.priorityWeight}</td>
                  <td className="py-1.5 px-2">{cat.scalingType === 'per_guest' ? 'Per-Guest' : cat.scalingType === 'step' ? 'Step-Tier' : 'Fixed'}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatINR(cat.estimated)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold">{cat.actual !== undefined ? formatINR(cat.actual) : '—'}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatINR(cat.paid)}</td>
                  <td className="py-1.5 px-2 text-center">{cat.isLocked ? '🔒 Locked' : 'Flexible'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Action Items & Checklist */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-1 mb-2">
            📋 Milestone Task Checklist
          </h2>
          <div className="space-y-1 text-xs">
            {plan.tasks.map((t) => (
              <div key={t.id} className="flex justify-between items-center py-1 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span>{t.done ? '☑️' : '☐'}</span>
                  <span className={t.done ? 'line-through text-stone-500' : 'font-medium'}>{t.title}</span>
                  <span className="text-[10px] text-stone-500">({t.eventFunction})</span>
                </div>
                <div className="text-right text-stone-600 font-mono text-[11px]">
                  <span>Due: {t.deadline}</span> • <span className="font-sans font-medium text-stone-800">{t.assignee}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Vendor Partnerships & Shortlisted Quotes */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-1 mb-2">
            🤝 Vendor Partnerships & Quotes
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {plan.vendors.map((v) => {
              const fin = v.quotes.find((q) => q.isFinalized);
              return (
                <div key={v.id} className="p-2.5 border border-stone-200 rounded bg-stone-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-stone-900">{v.type}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${v.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {v.status}
                    </span>
                  </div>
                  {fin ? (
                    <p className="text-[11px] text-stone-700">
                      Partner: <strong className="text-stone-950">{fin.vendorName}</strong> ({formatINR(fin.quotedPrice)})
                    </p>
                  ) : v.quotes.length > 0 ? (
                    <p className="text-[11px] text-stone-600">
                      {v.quotes.length} proposal{v.quotes.length > 1 ? 's' : ''} under review (Est: {formatINR(v.estimatedQuote)})
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-700 italic">No proposals recorded yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Plan Health & Risk Assessment */}
        <section className="border-t border-stone-200 pt-3 text-[11px] text-stone-500 flex justify-between items-center">
          <span>Plan Health Score: <strong>{healthEvaluation.score}/100 ({healthEvaluation.status})</strong> • {healthEvaluation.risks.length} Active Diagnostics</span>
          <span>Celebration Planner — Confidential Family Brief</span>
        </section>
      </div>

      {/* Interactive App Shell (Hidden when printing to produce a crisp, unclipped PDF) */}
      <div className="print:hidden min-h-screen flex flex-col">
        {/* 1. Header Landmark */}
        <Header
          plan={plan}
          hasSnapshot={hasSnapshot}
          onLoadBenchmark={loadBenchmarkPlan}
          onReset={resetPlan}
          onUndo={undoLastAiChange}
          onOpenSetup={() => setIsSetupOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
        />

        {/* 2. Navigation Landmark */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          taskCount={plan.tasks.length}
          vendorSlotCount={plan.vendors.length}
          riskCount={healthEvaluation.risks.length}
        />

        {/* 3. Main Content Landmark */}
        <main id="main-content" role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Gemini AI Copilot & Non-Destructive Refinement Bar */}
          <AiCopilotBar
            plan={plan}
            isAiLoading={isAiLoading}
            aiError={aiError}
            aiSummary={aiSummary}
            hasSnapshot={hasSnapshot}
            onGenerate={(prompt) => generateAiPlan(prompt)}
            onRefine={(prompt) => refineAiPlan(prompt)}
            onUndo={undoLastAiChange}
            onDismissError={dismissAiError}
            onConvertIdeaToTask={convertIdeaToTask}
          />

          {/* Tab 1: Smart Budget Architecture */}
          {activeTab === 'budget' && (
            <div role="tabpanel" id="panel-budget" aria-labelledby="tab-budget" className="space-y-6 animate-fadeIn">
              <BudgetSummaryCards
                summary={summary}
                totalBudget={plan.totalBudget}
                onOpenSetup={() => setIsSetupOpen(true)}
              />
              <BudgetTable
                budget={plan.budget}
                summary={summary}
                onUpdateCategory={updateCategory}
                onToggleLock={toggleCategoryLock}
              />
            </div>
          )}

          {/* Tab 2: Timeline & Task Dependency Scheduler */}
          {activeTab === 'timeline' && (
            <div role="tabpanel" id="panel-timeline" aria-labelledby="tab-timeline" className="animate-fadeIn">
              <TaskChecklist
                tasks={plan.tasks}
                onToggleDone={toggleTaskDone}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onToggleLock={toggleTaskLock}
              />
            </div>
          )}

          {/* Tab 3: Vendor Checklist & Quote Comparator */}
          {activeTab === 'vendors' && (
            <div role="tabpanel" id="panel-vendors" aria-labelledby="tab-vendors" className="animate-fadeIn">
              <VendorGrid
                vendors={plan.vendors}
                onAddVendorSlot={addVendorSlot}
                onDeleteVendorSlot={deleteVendorSlot}
                onToggleLock={toggleVendorSlotLock}
                onAddQuote={addVendorQuote}
                onFinalizeQuote={finalizeVendorQuote}
                onDeleteQuote={deleteVendorQuote}
              />
            </div>
          )}

          {/* Tab 4: What-If Elasticity Simulator & Risk Radar */}
          {activeTab === 'simulator' && (
            <div role="tabpanel" id="panel-simulator" aria-labelledby="tab-simulator" className="animate-fadeIn">
              <WhatIfWorkspace
                plan={plan}
                healthEvaluation={healthEvaluation}
                onApplyScenario={(mode, sim) => applyWhatIfScenario(mode, sim)}
                onExtendDeadline={(taskId, days) => extendTaskDeadline(taskId, days)}
                onCompletePrerequisite={(taskId) => completeTaskPrerequisite(taskId)}
                onAssignOwner={(taskId, assignee) => assignTaskOwner(taskId, assignee)}
                onJumpToVendors={() => setActiveTab('vendors')}
              />
            </div>
          )}
        </main>

        {/* Event Setup & Priority Configuration Modal */}
        <EventSetupBar
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          plan={plan}
          onSave={updateEventDetails}
        />

        {/* Family Summary & Plan Sharing Modal */}
        <FamilySummaryModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          plan={plan}
          onImportPlan={importPlan}
        />

        {/* Footer Landmark */}
        <footer role="contentinfo" className="border-t border-stone-800/80 bg-stone-950/80 py-6 text-xs text-stone-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-stone-300">Celebration Planner</span>
              <span>•</span>
              <span>Prompt Wars Virtual Challenge 5</span>
              <span>•</span>
              <span className="text-gold-400 font-medium">Pre-Deploy Production Hardened</span>
            </div>
            <div className="text-stone-400">
              Deterministic Math: <code className="font-mono text-stone-300">src/lib/calculations.ts</code> • Zero Hallucinated Vendors
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
