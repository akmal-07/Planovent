/**
 * Celebration Planner — Non-Destructive Merge Engine (src/lib/mergeEngine.ts)
 * 
 * STRICT ARCHITECTURAL BOUNDARY:
 * Pure TypeScript only. Zero React imports, zero browser DOM.
 * 
 * CORE MERGE INVARIANTS:
 * 1. Largest-Remainder budget allocation via sharePercent (exact integer rupees, sum equals totalBudget).
 * 2. Locked budget categories ignore AI changes during refinement.
 * 3. actual and paid amounts survive refinement untouched.
 * 4. Locked tasks and source: 'user' tasks survive refinement untouched.
 * 5. Structured tombstones (id & matchKey) strictly prevent deleted items from resurrecting.
 * 6. User-entered VendorQuote[] inside VendorSlot survive AI refinement untouched.
 * 7. Task dependency DAG is sanitized (dangling dependencies dropped, cycles detected & broken).
 */

import type {
  WeddingPlan,
  BudgetCategory,
  TaskItem,
  VendorSlot,
  Tombstone,
} from '../types/plan';
import type { AiGeneratedPlan } from '../schemas/geminiSchema';
import {
  BUDGET_CATEGORY_KEYS,
  allocateBudgetBySharePercent,
  toMatchKey,
  type CategoryAllocationInput,
} from './calculations';

/**
 * Normalizes text strings for duplicate/tombstone matching (lowercase, trimmed, punctuation stripped)
 */
export function normalizeKey(str: string): string {
  return toMatchKey(str);
}

/**
 * Sanitizes task dependencies:
 * 1. Drops any dependsOnTaskId that self-references or does not exist in the task set.
 * 2. Detects and breaks circular dependency cycles (A -> B -> A, etc.) by clearing the cycle-closing edge.
 */
export function sanitizeTaskDependencies(tasks: TaskItem[]): TaskItem[] {
  const taskMap = new Map<string, TaskItem>();
  for (const t of tasks) {
    taskMap.set(t.id, { ...t });
  }

  // 1. Remove dangling or self-referential dependencies
  for (const t of taskMap.values()) {
    if (t.dependsOnTaskId) {
      if (t.dependsOnTaskId === t.id || !taskMap.has(t.dependsOnTaskId)) {
        t.dependsOnTaskId = undefined;
      }
    }
  }

  // 2. Cycle detection using 3-color DFS
  // 0 = unvisited, 1 = visiting (in active call stack), 2 = visited
  const state = new Map<string, 0 | 1 | 2>();
  for (const id of taskMap.keys()) {
    state.set(id, 0);
  }

  function dfs(taskId: string): void {
    state.set(taskId, 1);
    const task = taskMap.get(taskId);
    if (task && task.dependsOnTaskId) {
      const prereqId = task.dependsOnTaskId;
      const prereqState = state.get(prereqId);

      if (prereqState === 1) {
        // Circular cycle detected! Break cycle by clearing dependency on this edge
        task.dependsOnTaskId = undefined;
      } else if (prereqState === 0) {
        dfs(prereqId);
      }
    }
    state.set(taskId, 2);
  }

  for (const id of taskMap.keys()) {
    if (state.get(id) === 0) {
      dfs(id);
    }
  }

  return tasks.map((t) => taskMap.get(t.id) || t);
}

/**
 * Converts a freshly generated AI payload into a complete initial WeddingPlan
 * using Largest-Remainder rupee allocation.
 */
export function hydrateInitialPlan(aiData: AiGeneratedPlan): WeddingPlan {
  const allocationInputs: CategoryAllocationInput[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const alloc = aiData.budgetAllocations.find((a) => a.key === key);
    return {
      key,
      isLocked: false,
      lockedSpend: 0,
      sharePercent: alloc?.sharePercent ?? 12,
    };
  });

  const allocatedBudget = allocateBudgetBySharePercent(aiData.totalBudget, allocationInputs);

  const budget: BudgetCategory[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const alloc = aiData.budgetAllocations.find((a) => a.key === key);
    return {
      id: `cat-${key}`,
      key,
      label: alloc?.label || key,
      priorityWeight: alloc?.priorityWeight || 'medium',
      estimated: allocatedBudget[key] ?? 0,
      actual: undefined,
      paid: 0,
      scalingType: alloc?.scalingType || 'fixed',
      stepSize: key === 'venue' ? 100 : key === 'transport' ? 50 : undefined,
      stepRate: key === 'venue' ? 0.25 : key === 'transport' ? 0.15 : undefined,
      source: 'ai',
      isLocked: false,
    };
  });

  const rawTasks: TaskItem[] = aiData.tasks.map((t, idx) => ({
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

  const tasks = sanitizeTaskDependencies(rawTasks);

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
    tombstones: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Non-destructive merge of an incoming AI refinement into an existing WeddingPlan.
 * Preserves user locks, quotes, paid/actual amounts, and structured tombstones.
 */
export function mergeRefinedPlan(
  currentPlan: WeddingPlan,
  aiData: AiGeneratedPlan
): WeddingPlan {
  // Support both structured tombstones and legacy deletedIds safely
  const tombstones: Tombstone[] = currentPlan.tombstones || [];
  const tombstoneMatchKeys = new Set(tombstones.map((t) => t.matchKey));
  const tombstoneIds = new Set(tombstones.map((t) => t.id));

  // Legacy deletedIds fallback
  if ((currentPlan as any).deletedIds) {
    for (const legacyId of (currentPlan as any).deletedIds) {
      tombstoneIds.add(legacyId);
      tombstoneMatchKeys.add(normalizeKey(legacyId));
    }
  }

  // 1. Budget Merge Invariant using Largest-Remainder allocation
  const allocationInputs: CategoryAllocationInput[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const existingCat = currentPlan.budget.find((b) => b.key === key);
    const aiAlloc = aiData.budgetAllocations.find((a) => a.key === key);

    const isLocked = existingCat?.isLocked ?? false;
    const lockedSpend = isLocked && existingCat ? existingCat.estimated : 0;
    const sharePercent = aiAlloc?.sharePercent ?? 12;

    return {
      key,
      isLocked,
      lockedSpend,
      sharePercent,
    };
  });

  const allocatedBudget = allocateBudgetBySharePercent(
    currentPlan.totalBudget,
    allocationInputs
  );

  const mergedBudget: BudgetCategory[] = BUDGET_CATEGORY_KEYS.map((key) => {
    const existingCat = currentPlan.budget.find((b) => b.key === key);
    const aiAlloc = aiData.budgetAllocations.find((a) => a.key === key);

    if (!existingCat) {
      return {
        id: `cat-${key}`,
        key,
        label: aiAlloc?.label || key,
        priorityWeight: aiAlloc?.priorityWeight || 'medium',
        estimated: allocatedBudget[key] ?? 0,
        actual: undefined,
        paid: 0,
        scalingType: aiAlloc?.scalingType || 'fixed',
        source: 'ai',
        isLocked: false,
      };
    }

    // Invariant: If locked, preserve existing category completely
    if (existingCat.isLocked) {
      return {
        ...existingCat,
      };
    }

    // Unlocked category: Apply largest-remainder allocated budget
    return {
      ...existingCat,
      estimated: allocatedBudget[key] ?? existingCat.estimated,
      priorityWeight: aiAlloc?.priorityWeight || existingCat.priorityWeight,
      scalingType: aiAlloc?.scalingType || existingCat.scalingType,
      actual: existingCat.actual,
      paid: existingCat.paid,
      source: existingCat.source,
      isLocked: false,
    };
  });

  // 2. Task Merge Invariant
  const preservedTasks: TaskItem[] = [];
  const existingUnlockedTasksMap = new Map<string, TaskItem>();

  for (const t of currentPlan.tasks) {
    if (t.isLocked || t.source === 'user') {
      preservedTasks.push(t);
    } else {
      existingUnlockedTasksMap.set(t.id, t);
      existingUnlockedTasksMap.set(normalizeKey(t.title), t);
    }
  }

  const mergedAiTasks: TaskItem[] = [];
  for (const incoming of aiData.tasks) {
    const normKey = normalizeKey(incoming.title);

    // Invariant: Strictly reject any tombstoned task by ID or matchKey
    if (tombstoneIds.has(incoming.id) || tombstoneMatchKeys.has(normKey)) {
      continue;
    }

    // Check if task already preserved (user/locked)
    const alreadyPreserved = preservedTasks.some(
      (p) => p.id === incoming.id || normalizeKey(p.title) === normKey
    );
    if (alreadyPreserved) {
      continue;
    }

    const matched = existingUnlockedTasksMap.get(incoming.id) || existingUnlockedTasksMap.get(normKey);

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
        done: matched.done, // Retain completion status
        source: 'ai',
        isLocked: false,
      });
    } else {
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

  // Combine and sanitize dependencies (break cycles, drop dangling)
  const mergedTasks = sanitizeTaskDependencies([...preservedTasks, ...mergedAiTasks]);

  // 3. Vendor Slot Merge Invariant
  const preservedVendors: VendorSlot[] = [];
  const existingUnlockedVendorsMap = new Map<string, VendorSlot>();

  for (const v of currentPlan.vendors) {
    if (v.isLocked || v.source === 'user') {
      preservedVendors.push(v);
    } else {
      existingUnlockedVendorsMap.set(v.id, v);
      existingUnlockedVendorsMap.set(normalizeKey(v.type), v);
    }
  }

  const mergedAiVendors: VendorSlot[] = [];
  for (const incoming of aiData.vendors) {
    const normKey = normalizeKey(incoming.type);

    // Invariant: Strictly reject tombstoned vendor slots
    if (tombstoneIds.has(incoming.id) || tombstoneMatchKeys.has(normKey)) {
      continue;
    }

    const alreadyPreserved = preservedVendors.some(
      (p) => p.id === incoming.id || normalizeKey(p.type) === normKey
    );
    if (alreadyPreserved) {
      continue;
    }

    const matched = existingUnlockedVendorsMap.get(incoming.id) || existingUnlockedVendorsMap.get(normKey);

    if (matched) {
      mergedAiVendors.push({
        ...matched,
        categoryKey: incoming.categoryKey,
        type: incoming.type,
        estimatedQuote: Math.round(incoming.estimatedQuote),
        // Preserve quotes and status
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

  // 4. Accessibility Needs Union
  const combinedAccessibility = Array.from(
    new Set([...currentPlan.accessibilityNeeds, ...aiData.accessibilityNeeds])
  );

  return {
    ...currentPlan,
    title: aiData.title || currentPlan.title,
    city: aiData.city || currentPlan.city,
    eventStyle: aiData.eventStyle || currentPlan.eventStyle,
    guestCount: Math.round(aiData.guestCount || currentPlan.guestCount),
    totalBudget: Math.round(currentPlan.totalBudget), // Preserve current user totalBudget
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
    tombstones,
    updatedAt: new Date().toISOString(),
  };
}
