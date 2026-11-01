/**
 * Celebration Planner — useWeddingPlan Hook (src/hooks/useWeddingPlan.ts)
 * 
 * REACTIVE PRESENTATION BOUNDARY:
 * State management with localStorage persistence, automatic lock triggers on edit,
 * deletedIds tombstone tracking, derived calculations, and Gemini AI orchestration with 1-click snapshot rollback.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  WeddingPlan,
  BudgetCategory,
  TaskItem,
  VendorSlot,
  VendorQuote,
  BudgetSummary,
} from '../types/plan';
import {
  computeBudgetSummary,
  updateWithAutoLock,
} from '../lib/calculations';
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
    deletedIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function useWeddingPlan() {
  const [plan, setPlan] = useState<WeddingPlan>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
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
    createSnapshot();
    setPlan({
      ...BENCHMARK_MOCK_PLAN,
      updatedAt: new Date().toISOString(),
    });
    setAiSummary('Loaded Challenge 5 benchmark scenario: ₹8,00,000 / 200 guests over 4 months.');
  }, [createSnapshot]);

  // Reset to Blank Plan
  const resetPlan = useCallback(() => {
    createSnapshot();
    setPlan(createBlankPlan());
    setAiSummary(null);
  }, [createSnapshot]);

  // Update Event Top Details
  const updateEventDetails = useCallback(
    (details: Partial<Pick<WeddingPlan, 'title' | 'city' | 'eventStyle' | 'guestCount' | 'totalBudget' | 'accessibilityNeeds' | 'functions'>>) => {
      setPlan((prev) => ({
        ...prev,
        ...details,
        totalBudget: details.totalBudget !== undefined ? Math.round(details.totalBudget) : prev.totalBudget,
        guestCount: details.guestCount !== undefined ? Math.max(1, Math.round(details.guestCount)) : prev.guestCount,
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  // Update Category (Auto-Lock Invariant)
  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<BudgetCategory>) => {
      setPlan((prev) => {
        const updatedBudget = prev.budget.map((item) => {
          if (item.id !== categoryId) return item;
          const patched = updateWithAutoLock(item, {
            ...updates,
            estimated: updates.estimated !== undefined ? Math.round(updates.estimated) : item.estimated,
            actual: updates.actual !== undefined && updates.actual !== null ? Math.round(updates.actual) : updates.actual,
            paid: updates.paid !== undefined ? Math.round(updates.paid) : item.paid,
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
    []
  );

  // Toggle Category Lock
  const toggleCategoryLock = useCallback((categoryId: string) => {
    setPlan((prev) => ({
      ...prev,
      budget: prev.budget.map((item) =>
        item.id === categoryId ? { ...item, isLocked: !item.isLocked } : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add Task
  const addTask = useCallback((taskData: Omit<TaskItem, 'id' | 'source' | 'isLocked'>) => {
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
  }, []);

  // Update Task (Auto-Lock Invariant)
  const updateTask = useCallback((taskId: string, updates: Partial<TaskItem>) => {
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId
          ? updateWithAutoLock(task, { ...updates, source: 'user' })
          : task
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Toggle Task Completion
  const toggleTaskDone = useCallback((taskId: string) => {
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Delete Task (Tombstone invariant)
  const deleteTask = useCallback((taskId: string) => {
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
      deletedIds: prev.deletedIds.includes(taskId)
        ? prev.deletedIds
        : [...prev.deletedIds, taskId],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Toggle Task Lock
  const toggleTaskLock = useCallback((taskId: string) => {
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, isLocked: !t.isLocked } : t
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add Vendor Slot
  const addVendorSlot = useCallback(
    (slotData: Omit<VendorSlot, 'id' | 'source' | 'isLocked' | 'quotes'>) => {
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
    []
  );

  // Delete Vendor Slot
  const deleteVendorSlot = useCallback((slotId: string) => {
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((v) => v.id !== slotId),
      deletedIds: prev.deletedIds.includes(slotId)
        ? prev.deletedIds
        : [...prev.deletedIds, slotId],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Toggle Vendor Slot Lock
  const toggleVendorSlotLock = useCallback((slotId: string) => {
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) =>
        v.id === slotId ? { ...v, isLocked: !v.isLocked } : v
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Add Vendor Quote
  const addVendorQuote = useCallback(
    (slotId: string, quoteData: Omit<VendorQuote, 'id' | 'isFinalized'>) => {
      setPlan((prev) => {
        const quoteId = `quote-${Date.now()}`;
        const newQuote: VendorQuote = {
          ...quoteData,
          id: quoteId,
          quotedPrice: Math.round(quoteData.quotedPrice),
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
    []
  );

  // Finalize Quote & Sync Actual Spend
  const finalizeVendorQuote = useCallback((slotId: string, quoteId: string) => {
    setPlan((prev) => {
      const slot = prev.vendors.find((s) => s.id === slotId);
      if (!slot) return prev;

      const chosen = slot.quotes.find((q) => q.id === quoteId);
      if (!chosen) return prev;

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

      const updatedBudget = prev.budget.map((cat) => {
        if (cat.key !== slot.categoryKey) return cat;
        return updateWithAutoLock(cat, {
          actual: chosen.quotedPrice,
          source: 'user',
        });
      });

      return {
        ...prev,
        vendors: updatedVendors,
        budget: updatedBudget,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Delete Quote
  const deleteVendorQuote = useCallback((slotId: string, quoteId: string) => {
    setPlan((prev) => ({
      ...prev,
      vendors: prev.vendors.map((slot) => {
        if (slot.id !== slotId) return slot;
        const quotes = slot.quotes.filter((q) => q.id !== quoteId);
        return updateWithAutoLock(slot, {
          quotes,
          status: quotes.some((q) => q.isFinalized) ? 'confirmed' : 'pending',
          source: 'user',
        });
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Convert Idea to Task (Rubric Feature)
  const convertIdeaToTask = useCallback((ideaId: string) => {
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
  }, []);

  // AI Operation 1: Generate New Plan via Serverless /api/generate
  const generateAiPlan = useCallback(
    async (userPrompt: string, context?: { city?: string; guestCount?: number; totalBudget?: number }): Promise<boolean> => {
      setIsAiLoading(true);
      setAiError(null);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userPrompt,
            city: context?.city || plan.city,
            guestCount: context?.guestCount || plan.guestCount,
            totalBudget: context?.totalBudget || plan.totalBudget,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
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
        setAiError(err.message || 'Failed to generate plan via Gemini');
        return false;
      } finally {
        setIsAiLoading(false);
      }
    },
    [plan, createSnapshot]
  );

  // AI Operation 2: Refine Existing Plan Non-Destructively via /api/refine
  const refineAiPlan = useCallback(
    async (userPrompt: string): Promise<boolean> => {
      setIsAiLoading(true);
      setAiError(null);

      try {
        const res = await fetch('/api/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userPrompt,
            currentPlan: plan,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
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
        setAiError(err.message || 'Failed to refine plan via Gemini');
        return false;
      } finally {
        setIsAiLoading(false);
      }
    },
    [plan, createSnapshot]
  );

  // Fallback Simulation (Demo Mode when API key not configured)
  const simulateLocalRefinement = useCallback((userPrompt: string) => {
    createSnapshot();

    // Priority-aware simulated adjustment:
    // If user mentions "veg" or "jain", add dietary tag and note
    const lower = userPrompt.toLowerCase();
    let updatedAccessibility = [...plan.accessibilityNeeds];
    if (lower.includes('veg') || lower.includes('jain')) {
      if (!updatedAccessibility.includes('100% Pure Vegetarian & Jain Counters')) {
        updatedAccessibility.push('100% Pure Vegetarian & Jain Counters');
      }
    }

    // If user mentions cut or 15%, reduce low priority categories by 15% and protect high priority
    const cutRequested = lower.includes('cut') || lower.includes('15') || lower.includes('reduce');
    const factor = cutRequested ? 0.85 : 1.0;

    const mockAiPlan: AiGeneratedPlan = {
      title: plan.title,
      city: plan.city,
      eventStyle: plan.eventStyle,
      guestCount: plan.guestCount,
      totalBudget: Math.round(plan.totalBudget * (cutRequested ? 0.90 : 1.0)),
      accessibilityNeeds: updatedAccessibility,
      functions: plan.functions,
      budgetAllocations: plan.budget.map((c) => ({
        key: c.key,
        label: c.label,
        // Shield high priority from heavy cut; apply full cut to low priority
        estimated: Math.round(c.estimated * (c.priorityWeight === 'low' ? factor : c.priorityWeight === 'medium' ? 0.95 : 1.0)),
        priorityWeight: c.priorityWeight,
        scalingType: c.scalingType,
        rationale: c.priorityWeight === 'high' ? 'Shielded from budget reduction' : 'Reduced to meet target constraint',
      })),
      tasks: [
        ...plan.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          timeSlot: t.timeSlot,
          priority: t.priority,
          assignee: t.assignee,
          eventFunction: t.eventFunction,
          dependsOnTaskId: t.dependsOnTaskId,
        })),
        {
          id: `task-sim-${Date.now()}`,
          title: lower.includes('veg') ? 'Finalize Pure Veg & Jain Live Chaat Vendors' : 'Review Revised Category Allocations',
          deadline: plan.functions[0]?.date || '2026-11-01',
          priority: 'high',
          assignee: 'Coordinator',
          eventFunction: 'Wedding',
        },
      ],
      vendors: plan.vendors.map((v) => ({
        id: v.id,
        categoryKey: v.categoryKey,
        type: v.type,
        estimatedQuote: Math.round(v.estimatedQuote * (cutRequested ? 0.95 : 1.0)),
      })),
      ideas: [
        { id: 'sim-idea-1', title: 'Local Artisan Floral Canopies', description: 'Procure marigold and jasmine directly from local mandis to save 20%.', category: 'decor' },
        { id: 'sim-idea-2', title: 'Interactive Live Jalebi Counter', description: 'Fresh saffron jalebi with rabri live station during Sangeet.', category: 'catering' },
      ],
      aiSummary: cutRequested
        ? 'Simulated trade-off: Reduced flexible low-priority items (Decor & Invites) by 15% while protecting High-Priority Food & Photography allocations.'
        : `Applied non-destructive refinement for: "${userPrompt}". Preserved all locked items and user quotes intact.`,
    };

    const merged = mergeRefinedPlan(plan, mockAiPlan);
    setPlan(merged);
    setAiError(null);
    setAiSummary(mockAiPlan.aiSummary);
  }, [plan, createSnapshot]);

  return {
    plan,
    summary,
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
    // AI Operations
    generateAiPlan,
    refineAiPlan,
    simulateLocalRefinement,
    undoLastAiChange,
    dismissAiError: () => setAiError(null),
    setPlanDirectly: setPlan,
  };
}
