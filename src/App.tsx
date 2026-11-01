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
        {/* Printable Executive Summary Header (Only visible on Print / PDF export) */}
        <div className="hidden print:block pb-5 mb-5 border-b border-stone-300">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-serif font-bold text-black">{plan.title}</h1>
              <p className="text-xs text-stone-600 mt-1">
                {plan.city} • {plan.eventStyle} • {plan.guestCount} Guests • Total Budget: ₹{plan.totalBudget.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <span className="font-bold text-stone-800">Celebration Planner Summary</span>
              <p>Printed: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Gemini AI Copilot & Non-Destructive Refinement Bar */}
        <div className="print:hidden">
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
        </div>

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
      <footer role="contentinfo" className="border-t border-stone-800/80 bg-stone-950/80 py-6 text-xs text-stone-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-300">Celebration Planner</span>
            <span>•</span>
            <span>Prompt Wars Virtual Challenge 5</span>
            <span>•</span>
            <span className="text-gold-400 font-medium">Bit 4: Family Summary, 0ms Simulator & Risk Radar</span>
          </div>
          <div className="text-stone-400">
            Deterministic Math: <code className="font-mono text-stone-300">src/lib/calculations.ts</code> • Zero Hallucinated Vendors
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
