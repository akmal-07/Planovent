/**
 * Celebration Planner — Non-Destructive Merge Engine (src/lib/mergeEngine.ts)
 * 
 * STRICT ARCHITECTURAL BOUNDARY:
 * Pure TypeScript only. Zero React imports, zero browser DOM.
 * 
 * CORE MERGE INVARIANTS:
 * 1. Locked budget categories ignore AI changes during refinement.
 * 2. actual and paid amounts survive refinement untouched.
 * 3. Locked tasks and source: 'user' tasks survive refinement untouched.
 * 4. Deleted tasks/vendor slots (deletedIds) are never resurrected by AI refinement.
 * 5. User-entered VendorQuote[] inside VendorSlot survive AI refinement untouched.
 */

import type {
  WeddingPlan,
  BudgetCategory,
  TaskItem,
  VendorSlot,
} from '../types/plan';
import type { AiGeneratedPlan } from '../schemas/geminiSchema';
import { BUDGET_CATEGORY_KEYS } from './calculations';

/**
 * Normalizes text strings for duplicate/tombstone matching (lowercase, trimmed, collapsed spaces)
 */
export function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Converts a freshly generated AI payload into a complete initial WeddingPlan
 */
export function hydrateInitialPlan(aiData: AiGeneratedPlan): WeddingPlan {
  const budget: BudgetCategory[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const alloc = aiData.budgetAllocations.find((a) => a.key === key);
    return {
      id: `cat-${key}`,
      key,
      label: alloc?.label || key,
      priorityWeight: alloc?.priorityWeight || 'medium',
      estimated: alloc ? Math.round(alloc.estimated) : 50000,
      actual: undefined,
      paid: 0,
      scalingType: alloc?.scalingType || 'fixed',
      stepSize: key === 'venue' ? 100 : key === 'transport' ? 50 : undefined,
      stepRate: key === 'venue' ? 0.25 : key === 'transport' ? 0.15 : undefined,
      source: 'ai',
      isLocked: false,
    };
  });

  const tasks: TaskItem[] = aiData.tasks.map((t, idx) => ({
    id: t.id || `task-ai-${idx + 1}`,
    title: t.title,
    deadline: t.deadline,
    timeSlot: t.timeSlot,
    priority: t.priority,
    assignee: t.assignee || 'Unassigned',
    done: false,
    eventFunction: t.eventFunction,
    dependsOnTaskId: t.dependsOnTaskId,
    source: 'ai',
    isLocked: false,
  }));

  const vendors: VendorSlot[] = aiData.vendors.map((v, idx) => ({
    id: v.id || `vslot-ai-${idx + 1}`,
    categoryKey: v.categoryKey,
    type: v.type,
    estimatedQuote: Math.round(v.estimatedQuote),
    status: 'pending',
    quotes: [], // Never hallucinate quotes
    source: 'ai',
    isLocked: false,
  }));

  return {
    id: `plan-${Date.now()}`,
    title: aiData.title,
    city: aiData.city,
    eventStyle: aiData.eventStyle,
    guestCount: Math.round(aiData.guestCount),
    totalBudget: Math.round(aiData.totalBudget),
    accessibilityNeeds: [...aiData.accessibilityNeeds],
    functions: aiData.functions.map((fn) => ({
      name: fn.name,
      date: fn.date,
      time: fn.time,
    })),
    budget,
    tasks,
    vendors,
    ideas: aiData.ideas.map((idea, idx) => ({
      id: idea.id || `idea-${idx + 1}`,
      title: idea.title,
      description: idea.description,
      category: idea.category,
    })),
    deletedIds: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Non-destructive merge of an incoming AI refinement into an existing WeddingPlan.
 * Preserves user locks, quotes, paid/actual amounts, and deleted items.
 */
export function mergeRefinedPlan(
  currentPlan: WeddingPlan,
  aiData: AiGeneratedPlan
): WeddingPlan {
  const deletedSet = new Set(currentPlan.deletedIds.map(normalizeKey));

  // 1. Budget Merge Invariant
  const mergedBudget: BudgetCategory[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const existingCat = currentPlan.budget.find((b) => b.key === key);
    const aiAlloc = aiData.budgetAllocations.find((a) => a.key === key);

    if (!existingCat) {
      return {
        id: `cat-${key}`,
        key,
        label: aiAlloc?.label || key,
        priorityWeight: aiAlloc?.priorityWeight || 'medium',
        estimated: aiAlloc ? Math.round(aiAlloc.estimated) : 0,
        actual: undefined,
        paid: 0,
        scalingType: aiAlloc?.scalingType || 'fixed',
        source: 'ai',
        isLocked: false,
      };
    }

    // Invariant: If locked, NEVER alter estimated spend or priority!
    if (existingCat.isLocked) {
      return {
        ...existingCat,
      };
    }

    // Unlocked category: Update estimated from AI
    return {
      ...existingCat,
      estimated: aiAlloc ? Math.round(aiAlloc.estimated) : existingCat.estimated,
      priorityWeight: aiAlloc?.priorityWeight || existingCat.priorityWeight,
      scalingType: aiAlloc?.scalingType || existingCat.scalingType,
      // Invariant: Always keep actual and paid untouched
      actual: existingCat.actual,
      paid: existingCat.paid,
      source: existingCat.source,
      isLocked: false,
    };
  });

  // 2. Task Merge Invariant
  // Keep 100% of user-created or locked tasks
  const preservedTasks: TaskItem[] = [];
  const existingUnlockedTasksMap = new Map<string, TaskItem>();

  for (const t of currentPlan.tasks) {
    if (t.isLocked || t.source === 'user') {
      preservedTasks.push(t);
    } else {
      existingUnlockedTasksMap.set(normalizeKey(t.id), t);
      existingUnlockedTasksMap.set(normalizeKey(t.title), t);
    }
  }

  const mergedAiTasks: TaskItem[] = [];
  for (const incoming of aiData.tasks) {
    const normId = normalizeKey(incoming.id);
    const normTitle = normalizeKey(incoming.title);

    // Invariant: Reject if item was deleted by user
    if (deletedSet.has(normId) || deletedSet.has(normTitle)) {
      continue;
    }

    // Check if task already preserved (locked/user)
    const alreadyPreserved = preservedTasks.some(
      (p) => normalizeKey(p.id) === normId || normalizeKey(p.title) === normTitle
    );
    if (alreadyPreserved) {
      continue;
    }

    // Match with existing unlocked AI task
    const matched = existingUnlockedTasksMap.get(normId) || existingUnlockedTasksMap.get(normTitle);

    if (matched) {
      mergedAiTasks.push({
        ...matched,
        title: incoming.title,
        deadline: incoming.deadline,
        timeSlot: incoming.timeSlot || matched.timeSlot,
        priority: incoming.priority,
        assignee: incoming.assignee || matched.assignee,
        eventFunction: incoming.eventFunction,
        dependsOnTaskId: incoming.dependsOnTaskId || matched.dependsOnTaskId,
        done: matched.done, // Invariant: Keep completion status
        source: 'ai',
        isLocked: false,
      });
    } else {
      // New AI Task
      mergedAiTasks.push({
        id: incoming.id || `task-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: incoming.title,
        deadline: incoming.deadline,
        timeSlot: incoming.timeSlot,
        priority: incoming.priority,
        assignee: incoming.assignee || 'Unassigned',
        done: false,
        eventFunction: incoming.eventFunction,
        dependsOnTaskId: incoming.dependsOnTaskId,
        source: 'ai',
        isLocked: false,
      });
    }
  }

  // Combine preserved user/locked tasks + merged AI tasks
  const mergedTasks = [...preservedTasks, ...mergedAiTasks];

  // 3. Vendor Slot Merge Invariant
  const preservedVendors: VendorSlot[] = [];
  const existingUnlockedVendorsMap = new Map<string, VendorSlot>();

  for (const v of currentPlan.vendors) {
    if (v.isLocked || v.source === 'user') {
      preservedVendors.push(v);
    } else {
      existingUnlockedVendorsMap.set(normalizeKey(v.id), v);
      existingUnlockedVendorsMap.set(normalizeKey(v.type), v);
    }
  }

  const mergedAiVendors: VendorSlot[] = [];
  for (const incoming of aiData.vendors) {
    const normId = normalizeKey(incoming.id);
    const normType = normalizeKey(incoming.type);

    // Invariant: Reject deleted slots
    if (deletedSet.has(normId) || deletedSet.has(normType)) {
      continue;
    }

    const alreadyPreserved = preservedVendors.some(
      (p) => normalizeKey(p.id) === normId || normalizeKey(p.type) === normType
    );
    if (alreadyPreserved) {
      continue;
    }

    const matched = existingUnlockedVendorsMap.get(normId) || existingUnlockedVendorsMap.get(normType);

    if (matched) {
      mergedAiVendors.push({
        ...matched,
        categoryKey: incoming.categoryKey,
        type: incoming.type,
        estimatedQuote: Math.round(incoming.estimatedQuote),
        // Invariant: Quotes entered by user and status are NEVER wiped!
        quotes: matched.quotes,
        status: matched.status,
        source: 'ai',
        isLocked: false,
      });
    } else {
      mergedAiVendors.push({
        id: incoming.id || `vslot-ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        categoryKey: incoming.categoryKey,
        type: incoming.type,
        estimatedQuote: Math.round(incoming.estimatedQuote),
        status: 'pending',
        quotes: [],
        source: 'ai',
        isLocked: false,
      });
    }
  }

  const mergedVendors = [...preservedVendors, ...mergedAiVendors];

  // 4. Combined Accessibility Needs
  const combinedAccessibility = Array.from(
    new Set([...currentPlan.accessibilityNeeds, ...aiData.accessibilityNeeds])
  );

  return {
    ...currentPlan,
    title: aiData.title || currentPlan.title,
    city: aiData.city || currentPlan.city,
    eventStyle: aiData.eventStyle || currentPlan.eventStyle,
    guestCount: Math.round(aiData.guestCount || currentPlan.guestCount),
    totalBudget: Math.round(aiData.totalBudget || currentPlan.totalBudget),
    accessibilityNeeds: combinedAccessibility,
    functions: aiData.functions.length > 0
      ? aiData.functions.map((fn) => ({ name: fn.name, date: fn.date, time: fn.time }))
      : currentPlan.functions,
    budget: mergedBudget,
    tasks: mergedTasks,
    vendors: mergedVendors,
    ideas: aiData.ideas.map((idea, idx) => ({
      id: idea.id || `idea-${idx + 1}`,
      title: idea.title,
      description: idea.description,
      category: idea.category,
    })),
    deletedIds: currentPlan.deletedIds,
    updatedAt: new Date().toISOString(),
  };
}
