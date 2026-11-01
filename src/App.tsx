import React, { useState } from 'react';
import { useWeddingPlan } from './hooks/useWeddingPlan';
import { Header } from './components/layout/Header';
import { NavigationTabs, type ActiveTab } from './components/layout/NavigationTabs';
import { EventSetupBar } from './components/layout/EventSetupBar';
import { BudgetSummaryCards } from './components/budget/BudgetSummaryCards';
import { BudgetTable } from './components/budget/BudgetTable';
import { TaskChecklist } from './components/timeline/TaskChecklist';
import { VendorGrid } from './components/vendors/VendorGrid';
import { WhatIfPreview } from './components/simulator/WhatIfPreview';

export const App: React.FC = () => {
  const {
    plan,
    summary,
    hasSnapshot,
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
    undoLastChange,
  } = useWeddingPlan();

  const [activeTab, setActiveTab] = useState<ActiveTab>('budget');
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      {/* 1. Header Landmark */}
      <Header
        plan={plan}
        hasSnapshot={hasSnapshot}
        onLoadBenchmark={loadBenchmarkPlan}
        onReset={resetPlan}
        onUndo={undoLastChange}
        onOpenSetup={() => setIsSetupOpen(true)}
      />

      {/* 2. Navigation Landmark */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        taskCount={plan.tasks.length}
        vendorSlotCount={plan.vendors.length}
      />

      {/* 3. Main Content Landmark */}
      <main id="main-content" role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

        {/* Tab 4: What-If & Risk Radar Preview */}
        {activeTab === 'simulator' && (
          <div role="tabpanel" id="panel-simulator" aria-labelledby="tab-simulator" className="animate-fadeIn">
            <WhatIfPreview plan={plan} summary={summary} />
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

      {/* Footer Landmark */}
      <footer role="contentinfo" className="border-t border-stone-800/80 bg-stone-950/80 py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-300">Celebration Planner</span>
            <span>•</span>
            <span>Prompt Wars Virtual Challenge 5</span>
            <span>•</span>
            <span className="text-gold-400 font-medium">Bit 1 Architecture Locked</span>
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
