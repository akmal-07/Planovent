/**
 * Celebration Planner — useWeddingPlan Hook (src/hooks/useWeddingPlan.ts)
 * 
 * REACTIVE PRESENTATION BOUNDARY:
 * State management with localStorage persistence, automatic lock triggers on edit,
 * structured tombstones tracking, derived calculations, and Gemini AI orchestration
 * with 25s timeout and 1-click snapshot rollback.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  WeddingPlan,
  BudgetCategory,
  TaskItem,
  VendorSlot,
  VendorQuote,
  BudgetSummary,
  PlanHealthEvaluation,
  WhatIfSimulationResult,
} from '../types/plan';
import {
  computeBudgetSummary,
  updateWithAutoLock,
  toMatchKey,
  formatINR,
} from '../lib/calculations';
import { evaluatePlanRisks } from '../lib/riskEngine';
import { BENCHMARK_MOCK_PLAN } from '../lib/mockPlan';
import { hydrateInitialPlan, mergeRefinedPlan } from '../lib/mergeEngine';
import type { AiGeneratedPlan } from '../schemas/geminiSchema';

const STORAGE_KEY = 'celebration_planner_v1';
const SNAPSHOT_KEY = 'celebration_planner_snapshot_v1';

export function createBlankPlan(): WeddingPlan {
  return {
    id: `plan-${Date.now()}`,
    title: 'Pooja & Srinivas’s Traditional Celebration',
    city: 'Hyderabad',
    eventStyle: 'Traditional Intimate',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: [
      'Wheelchair Accessible Venue & Entrance Ramps',
      'Elderly Ground-Floor Banquet Seating',
      'Pure Vegetarian & Jain Counter Separation',
    ],
    functions: [
      { name: 'Haldi', date: '2026-11-12', time: '10:00 AM' },
      { name: 'Mehndi', date: '2026-11-12', time: '03:30 PM' },
      { name: 'Sangeet', date: '2026-11-13', time: '07:00 PM' },
      { name: 'Wedding', date: '2026-11-14', time: '09:00 AM' },
      { name: 'Reception', date: '2026-11-14', time: '07:30 PM' },
    ],
    budget: [
      { id: 'cat-venue', key: 'venue', label: 'Venue & Accommodation', priorityWeight: 'medium', estimated: 280000, paid: 0, scalingType: 'fixed', stepSize: 100, stepRate: 0.25, source: 'user', isLocked: false },
      { id: 'cat-catering', key: 'catering', label: 'Catering & Beverages', priorityWeight: 'high', estimated: 260000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: 'cat-decor', key: 'decor', label: 'Decor & Floral Styling', priorityWeight: 'low', estimated: 70000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: 'cat-photo', key: 'photo_video', label: 'Photography & Cinema', priorityWeight: 'high', estimated: 80000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: 'cat-entertainment', key: 'entertainment', label: 'Music & Entertainment', priorityWeight: 'medium', estimated: 40000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: 'cat-invites', key: 'invites', label: 'Invitations & Favors', priorityWeight: 'low', estimated: 15000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: 'cat-transport', key: 'transport', label: 'Logistics & Fleet', priorityWeight: 'medium', estimated: 30000, paid: 0, scalingType: 'step', stepSize: 50, stepRate: 0.15, source: 'user', isLocked: false },
      { id: 'cat-misc', key: 'misc', label: 'Rituals & Contingency', priorityWeight: 'medium', estimated: 25000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
    ],
    tasks: [],
    vendors: [],
    ideas: [],
    tombstones: [],
    updatedAt: new Date().toISOString(),
  };
}

export function useWeddingPlan() {
  const [plan, setPlan] = useState<WeddingPlan>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Safely migrate legacy plans with deletedIds -> structured tombstones
        if (!Array.isArray(parsed.tombstones)) {
          const legacyDeleted: string[] = Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [];
          parsed.tombstones = legacyDeleted.map((id) => ({
            id,
            matchKey: toMatchKey(id),
            label: id,
          }));
        }
        delete parsed.deletedIds;
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved plan from localStorage', e);
    }
    return BENCHMARK_MOCK_PLAN;
  });

  const [lastSnapshot, setLastSnapshot] = useState<WeddingPlan | null>(() => {
    try {
      const savedSnapshot = sessionStorage.getItem(SNAPSHOT_KEY);
      return savedSnapshot ? JSON.parse(savedSnapshot) : null;
    } catch {
      return null;
    }
  });

  // AI Orchestration State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {
      console.error('Failed to sync plan to localStorage', e);
    }
  }, [plan]);

  // Derived deterministic calculations (0ms client math)
  const summary: BudgetSummary = useMemo(() => {
    return computeBudgetSummary(plan);
  }, [plan]);

  // Derived deterministic risk evaluation (0ms client math)
  const healthEvaluation: PlanHealthEvaluation = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return evaluatePlanRisks(plan, todayStr);
  }, [plan]);

  // Clear snapshot on any manual user edit
  const clearSnapshot = useCallback(() => {
    setLastSnapshot(null);
    try {
      sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Snapshot manager
  const createSnapshot = useCallback(() => {
    setLastSnapshot(plan);
    try {
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(plan));
    } catch {
      // ignore
    }
  }, [plan]);

  // Rollback to last snapshot (1-Click Undo)
  const undoLastAiChange = useCallback(() => {
    if (!lastSnapshot) return;
    setPlan(lastSnapshot);
    setLastSnapshot(null);
    setAiError(null);
    setAiSummary('Restored previous plan state via transactional undo.');
    try {
      sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      // ignore
    }
  }, [lastSnapshot]);

  // Load Benchmark Example
  const loadBenchmarkPlan = useCallback(() => {
    clearSnapshot();
    setPlan({
      ...BENCHMARK_MOCK_PLAN,
      updatedAt: new Date().toISOString(),
    });
    setAiSummary('Loaded Challenge 5 benchmark scenario: ₹8,00,000 / 200 guests over 4 months.');
  }, [clearSnapshot]);

  // Reset to Blank Plan
  const resetPlan = useCallback(() => {
    clearSnapshot();
    setPlan(createBlankPlan());
    setAiSummary(null);
  }, [clearSnapshot]);

  // Update Event Top Details
  const updateEventDetails = useCallback(
    (details: Partial<Pick<WeddingPlan, 'title' | 'city' | 'eventStyle' | 'guestCount' | 'totalBudget' | 'accessibilityNeeds' | 'functions'>>) => {
      clearSnapshot();
      setPlan((prev) => ({
        ...prev,
        ...details,
        totalBudget: details.totalBudget !== undefined
          ? Math.max(0, Math.round(Number.isNaN(details.totalBudget) ? 0 : details.totalBudget))
          : prev.totalBudget,
        guestCount: details.guestCount !== undefined
          ? Math.max(1, Math.round(Number.isNaN(details.guestCount) ? 1 : details.guestCount))
          : prev.guestCount,
        updatedAt: new Date().toISOString(),
      }));
    },
    [clearSnapshot]
  );

  // Update Category (Auto-Lock Invariant)
  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<BudgetCategory>) => {
      clearSnapshot();
      setPlan((prev) => {
        const updatedBudget = prev.budget.map((item) => {
          if (item.id !== categoryId) return item;
          const patched = updateWithAutoLock(item, {
            ...updates,
            estimated: updates.estimated !== undefined
              ? Math.max(0, Math.round(Number.isNaN(updates.estimated) ? 0 : updates.estimated))
              : item.estimated,
            actual: updates.actual !== undefined && updates.actual !== null
              ? Math.max(0, Math.round(Number.isNaN(updates.actual) ? 0 : updates.actual))
              : updates.actual,
            paid: updates.paid !== undefined
              ? Math.max(0, Math.round(Number.isNaN(updates.paid) ? 0 : updates.paid))
              : item.paid,
            source: 'user',
          });
          return patched;
        });

        return {
          ...prev,
          budget: updatedBudget,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [clearSnapshot]
  );

  // Toggle Category Lock
  const toggleCategoryLock = useCallback((categoryId: string) => {
    clearSnapshot();
    setPlan((prev) => ({
      ...prev,
      budget: prev.budget.map((item) =>
        item.id === categoryId ? { ...item, isLocked: !item.isLocked } : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [clearSnapshot]);

  // Add Task
  const addTask = useCallback((taskData: Omit<TaskItem, 'id' | 'source' | 'isLocked'>) => {
    clearSnapshot();
    setPlan((prev) => {
      const newTask: TaskItem = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        source: 'user',
        isLocked: true,
      };
      return {
        ...prev,
        tasks: [newTask, ...prev.tasks],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Update Task (Auto-Lock Invariant)
  const updateTask = useCallback((taskId: string, updates: Partial<TaskItem>) => {
    clearSnapshot();
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId
          ? updateWithAutoLock(task, { ...updates, source: 'user' })
          : task
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [clearSnapshot]);

  // Toggle Task Completion
  const toggleTaskDone = useCallback((taskId: string) => {
    clearSnapshot();
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [clearSnapshot]);

  // Delete Task (Tombstone invariant with structured matchKey)
  const deleteTask = useCallback((taskId: string) => {
    clearSnapshot();
    setPlan((prev) => {
      const taskToDelete = prev.tasks.find((t) => t.id === taskId);
      const label = taskToDelete?.title || taskId;
      const matchKey = toMatchKey(label);
      const alreadyTombstoned = prev.tombstones.some((t) => t.id === taskId || t.matchKey === matchKey);
      const updatedTombstones = alreadyTombstoned
        ? prev.tombstones
        : [...prev.tombstones, { id: taskId, matchKey, label }];

      return {
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
        tombstones: updatedTombstones,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Toggle Task Lock
  const toggleTaskLock = useCallback((taskId: string) => {
    clearSnapshot();
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, isLocked: !t.isLocked } : t
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [clearSnapshot]);

  // Add Vendor Slot
  const addVendorSlot = useCallback(
    (slotData: Omit<VendorSlot, 'id' | 'source' | 'isLocked' | 'quotes'>) => {
      clearSnapshot();
      setPlan((prev) => {
        const newSlot: VendorSlot = {
          ...slotData,
          id: `vslot-${Date.now()}`,
          quotes: [],
          source: 'user',
          isLocked: true,
        };
        return {
          ...prev,
          vendors: [newSlot, ...prev.vendors],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [clearSnapshot]
  );

  // Delete Vendor Slot (Tombstone invariant with structured matchKey)
  const deleteVendorSlot = useCallback((slotId: string) => {
    clearSnapshot();
    setPlan((prev) => {
      const slotToDelete = prev.vendors.find((v) => v.id === slotId);
      const label = slotToDelete?.type || slotId;
      const matchKey = toMatchKey(label);
      const alreadyTombstoned = prev.tombstones.some((t) => t.id === slotId || t.matchKey === matchKey);
      const updatedTombstones = alreadyTombstoned
        ? prev.tombstones
        : [...prev.tombstones, { id: slotId, matchKey, label }];

      return {
        ...prev,
        vendors: prev.vendors.filter((v) => v.id !== slotId),
        tombstones: updatedTombstones,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Toggle Vendor Slot Lock
  const toggleVendorSlotLock = useCallback((slotId: string) => {
    clearSnapshot();
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) =>
        v.id === slotId ? { ...v, isLocked: !v.isLocked } : v
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, [clearSnapshot]);

  // Add Vendor Quote
  const addVendorQuote = useCallback(
    (slotId: string, quoteData: Omit<VendorQuote, 'id' | 'isFinalized'>) => {
      clearSnapshot();
      setPlan((prev) => {
        const quoteId = `quote-${Date.now()}`;
        const newQuote: VendorQuote = {
          ...quoteData,
          id: quoteId,
          quotedPrice: Math.max(0, Math.round(Number.isNaN(quoteData.quotedPrice) ? 0 : quoteData.quotedPrice)),
          isFinalized: false,
        };

        return {
          ...prev,
          vendors: prev.vendors.map((slot) => {
            if (slot.id !== slotId) return slot;
            return updateWithAutoLock(slot, {
              quotes: [...slot.quotes, newQuote],
              source: 'user',
            });
          }),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [clearSnapshot]
  );

  // Finalize Quote & Sync Actual Spend Guardrail
  const finalizeVendorQuote = useCallback((slotId: string, quoteId: string) => {
    clearSnapshot();
    setPlan((prev) => {
      const targetSlot = prev.vendors.find((s) => s.id === slotId);
      if (!targetSlot) return prev;

      const chosenQuote = targetSlot.quotes.find((q) => q.id === quoteId);
      if (!chosenQuote) return prev;

      // 1. Mark chosen quote as finalized in target slot
      const updatedVendors = prev.vendors.map((s) => {
        if (s.id !== slotId) return s;
        return updateWithAutoLock(s, {
          status: 'confirmed' as const,
          source: 'user',
          quotes: s.quotes.map((q) => ({
            ...q,
            isFinalized: q.id === quoteId,
          })),
        });
      });

      // 2. Sum finalized quotes across all vendor slots sharing categoryKey
      const categoryKey = targetSlot.categoryKey;
      const categoryFinalizedSum = updatedVendors
        .filter((s) => s.categoryKey === categoryKey)
        .reduce((sum, s) => {
          const fin = s.quotes.find((q) => q.isFinalized);
          return sum + (fin ? fin.quotedPrice : 0);
        }, 0);

      // 3. Only auto-update category.actual if category is NOT locked
      const updatedBudget = prev.budget.map((cat) => {
        if (cat.key !== categoryKey) return cat;
        if (cat.isLocked) {
          // Category is manually locked: protect user's manual override
          return cat;
        }
        return {
          ...cat,
          actual: categoryFinalizedSum > 0 ? categoryFinalizedSum : undefined,
        };
      });

      return {
        ...prev,
        vendors: updatedVendors,
        budget: updatedBudget,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Delete Quote
  const deleteVendorQuote = useCallback((slotId: string, quoteId: string) => {
    clearSnapshot();
    setPlan((prev) => {
      const targetSlot = prev.vendors.find((s) => s.id === slotId);
      if (!targetSlot) return prev;

      const updatedVendors = prev.vendors.map((slot) => {
        if (slot.id !== slotId) return slot;
        const quotes = slot.quotes.filter((q) => q.id !== quoteId);
        return updateWithAutoLock(slot, {
          quotes,
          status: quotes.some((q) => q.isFinalized) ? 'confirmed' : 'pending',
          source: 'user',
        });
      });

      // Recalculate finalized sum for unlocked categories
      const categoryKey = targetSlot.categoryKey;
      const categoryFinalizedSum = updatedVendors
        .filter((s) => s.categoryKey === categoryKey)
        .reduce((sum, s) => {
          const fin = s.quotes.find((q) => q.isFinalized);
          return sum + (fin ? fin.quotedPrice : 0);
        }, 0);

      const updatedBudget = prev.budget.map((cat) => {
        if (cat.key !== categoryKey || cat.isLocked) return cat;
        return {
          ...cat,
          actual: categoryFinalizedSum > 0 ? categoryFinalizedSum : undefined,
        };
      });

      return {
        ...prev,
        vendors: updatedVendors,
        budget: updatedBudget,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Convert Idea to Task (Rubric Feature)
  const convertIdeaToTask = useCallback((ideaId: string) => {
    clearSnapshot();
    setPlan((prev) => {
      const idea = prev.ideas.find((i) => i.id === ideaId);
      if (!idea) return prev;

      const newTask: TaskItem = {
        id: `task-idea-${Date.now()}`,
        title: idea.title,
        deadline: prev.functions[0]?.date || new Date().toISOString().split('T')[0],
        priority: 'medium',
        assignee: 'Unassigned',
        done: false,
        eventFunction: 'General',
        source: 'user',
        isLocked: true,
      };

      return {
        ...prev,
        tasks: [newTask, ...prev.tasks],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [clearSnapshot]);

  // Apply What-If Scenario (Saves snapshot for 1-click Undo)
  const applyWhatIfScenario = useCallback(
    (mode: 'projected' | 'rebalanced', simulation: WhatIfSimulationResult) => {
      createSnapshot();
      setPlan((prev) => {
        const resultMap = new Map(simulation.categories.map((c) => [c.key, c]));
        const updatedBudget = prev.budget.map((cat) => {
          const res = resultMap.get(cat.key);
          if (!res) return cat;
          const newEstimated = mode === 'projected' ? res.projectedSpend : res.rebalancedSpend;
          return {
            ...cat,
            estimated: newEstimated,
          };
        });

        return {
          ...prev,
          guestCount: simulation.params.guestCount,
          totalBudget: simulation.params.totalBudget,
          budget: updatedBudget,
          updatedAt: new Date().toISOString(),
        };
      });

      setAiSummary(
        `Applied ${mode === 'projected' ? 'Projected' : 'Priority-Rebalanced'} scenario: ${simulation.params.guestCount} guests, ${formatINR(simulation.params.totalBudget)}.`
      );
    },
    [createSnapshot]
  );

  // 1-Click Action Fix: Extend Task Deadline
  const extendTaskDeadline = useCallback(
    (taskId: string, days: number = 7) => {
      clearSnapshot();
      setPlan((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const current = new Date(task.deadline || new Date().toISOString().split('T')[0]);
          const extended = new Date(current.getTime() + days * 86400000);
          const newDeadline = extended.toISOString().split('T')[0];
          return updateWithAutoLock(task, {
            deadline: newDeadline,
            source: 'user',
          });
        }),
        updatedAt: new Date().toISOString(),
      }));
    },
    [clearSnapshot]
  );

  // 1-Click Action Fix: Assign Task Owner
  const assignTaskOwner = useCallback(
    (taskId: string, assignee: string) => {
      clearSnapshot();
      setPlan((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? updateWithAutoLock(task, { assignee: assignee.trim(), source: 'user' })
            : task
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [clearSnapshot]
  );

  // 1-Click Action Fix: Complete Task Prerequisite
  const completeTaskPrerequisite = useCallback(
    (prereqTaskId: string) => {
      clearSnapshot();
      setPlan((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === prereqTaskId
            ? updateWithAutoLock(task, { done: true, source: 'user' })
            : task
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [clearSnapshot]
  );

  // Import Full Plan from Validated Backup JSON (Transactional snapshot saved for Undo)
  const importPlan = useCallback(
    (importedPlan: WeddingPlan) => {
      createSnapshot();
      setPlan({
        ...importedPlan,
        updatedAt: new Date().toISOString(),
      });
      setAiSummary(`Imported celebration plan: "${importedPlan.title}".`);
    },
    [createSnapshot]
  );

  // AI Operation 1: Generate New Plan via Serverless /api/generate with 25s timeout
  const generateAiPlan = useCallback(
    async (userPrompt: string, context?: { city?: string; guestCount?: number; totalBudget?: number }): Promise<boolean> => {
      setIsAiLoading(true);
      setAiError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: userPrompt,
            city: context?.city || plan.city,
            guestCount: context?.guestCount || plan.guestCount,
            totalBudget: context?.totalBudget || plan.totalBudget,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || `API error (${res.status})`);
        }

        if (data.data) {
          createSnapshot();
          const hydrated = hydrateInitialPlan(data.data as AiGeneratedPlan);
          setPlan(hydrated);
          setAiSummary(data.data.aiSummary || 'Generated fresh AI celebration plan.');
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('generateAiPlan error:', err);
        if (err.name === 'AbortError') {
          setAiError('Generation timed out after 25 seconds. Please check your network or try again.');
        } else {
          setAiError(err.message || 'Failed to generate plan via Gemini');
        }
        return false;
      } finally {
        clearTimeout(timeoutId);
        setIsAiLoading(false);
      }
    },
    [plan, createSnapshot]
  );

  // AI Operation 2: Refine Existing Plan Non-Destructively via /api/refine with 25s timeout
  const refineAiPlan = useCallback(
    async (userPrompt: string): Promise<boolean> => {
      setIsAiLoading(true);
      setAiError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const res = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: userPrompt,
            currentPlan: plan,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || `API error (${res.status})`);
        }

        if (data.data) {
          createSnapshot();
          const merged = mergeRefinedPlan(plan, data.data as AiGeneratedPlan);
          setPlan(merged);
          setAiSummary(data.data.aiSummary || 'Refined plan non-destructively.');
          return true;
        }
        return false;
      } catch (err: any) {
        console.error('refineAiPlan error:', err);
        if (err.name === 'AbortError') {
          setAiError('Refinement timed out after 25 seconds. Please try again.');
        } else {
          setAiError(err.message || 'Failed to refine plan via Gemini');
        }
        return false;
      } finally {
        clearTimeout(timeoutId);
        setIsAiLoading(false);
      }
    },
    [plan, createSnapshot]
  );

  return {
    plan,
    summary,
    healthEvaluation,
    hasSnapshot: lastSnapshot !== null,
    isAiLoading,
    aiError,
    aiSummary,
    // Operations
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
    // What-If & Risk Radar Operations
    applyWhatIfScenario,
    extendTaskDeadline,
    assignTaskOwner,
    completeTaskPrerequisite,
    // AI Operations
    generateAiPlan,
    refineAiPlan,
    undoLastAiChange,
    dismissAiError: () => setAiError(null),
    setPlanDirectly: setPlan,
  };
}

