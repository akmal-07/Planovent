/**
 * Celebration Planner — Family Summary Formatter & Plan Validator (src/lib/summaryFormatter.ts)
 * 
 * 100% PURE TYPESCRIPT MODULE (Zero React, Zero Browser/DOM dependencies).
 * Generates an emoji-structured, WhatsApp-ready wedding brief and provides
 * safe, non-destructive import validation for exported .json celebration plans.
 */

import { z } from 'zod';
import type {
  WeddingPlan,
  TaskItem,
  BudgetCategory,
  VendorSlot,
  Tombstone,
} from '../types/plan';
import {
  computeBudgetSummary,
  formatINR,
  isTaskBlocked,
  BUDGET_CATEGORY_KEYS,
  toMatchKey,
} from './calculations';
import { evaluatePlanRisks } from './riskEngine';
import { sanitizeTaskDependencies } from './mergeEngine';

const EVENT_FUNCTION_NAMES = [
  'Haldi',
  'Mehndi',
  'Sangeet',
  'Wedding',
  'Reception',
  'General',
] as const;

export const WeddingPlanImportSchema = z.object({
  id: z.string().min(1, 'Missing id'),
  title: z.string().min(1, 'Missing title'),
  city: z.string().min(1, 'Missing city'),
  eventStyle: z.string().min(1, 'Missing eventStyle'),
  guestCount: z.number().int('Guest count must be an integer').positive('Guest count must be positive'),
  totalBudget: z.number().int('Total budget must be an integer').nonnegative('Total budget must be non-negative'),
  accessibilityNeeds: z.array(z.string()).default([]),
  functions: z.array(
    z.object({
      name: z.enum(EVENT_FUNCTION_NAMES),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Function date must be YYYY-MM-DD'),
      time: z.string().optional(),
    })
  ),
  budget: z
    .array(
      z.object({
        id: z.string().min(1),
        key: z.enum(BUDGET_CATEGORY_KEYS),
        label: z.string().min(1),
        priorityWeight: z.enum(['high', 'medium', 'low']),
        estimated: z.number().int('Estimated must be integer').nonnegative(),
        actual: z.number().int('Actual must be integer').nonnegative().optional(),
        paid: z.number().int('Paid must be integer').nonnegative(),
        scalingType: z.enum(['fixed', 'per_guest', 'step']),
        stepSize: z.number().positive().optional(),
        stepRate: z.number().positive().optional(),
        isLocked: z.boolean(),
        source: z.enum(['user', 'ai']),
      })
    )
    .superRefine((cats, ctx) => {
      const keys = new Set(cats.map((c) => c.key));
      const missing = BUDGET_CATEGORY_KEYS.filter((k) => !keys.has(k));
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Budget is missing required category: "${missing.join('", "')}". Exactly 8 core categories required.`,
        });
      }
    }),
  tasks: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Task deadline must be YYYY-MM-DD'),
      timeSlot: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']),
      assignee: z.string().min(1, 'Assignee must be specified'),
      done: z.boolean(),
      eventFunction: z.enum(EVENT_FUNCTION_NAMES),
      dependsOnTaskId: z.string().optional(),
      source: z.enum(['user', 'ai']),
      isLocked: z.boolean(),
    })
  ),
  vendors: z.array(
    z.object({
      id: z.string().min(1),
      categoryKey: z.enum(BUDGET_CATEGORY_KEYS),
      type: z.string().min(1),
      estimatedQuote: z.number().int('Estimated quote must be integer').nonnegative(),
      status: z.enum(['pending', 'confirmed']),
      source: z.enum(['user', 'ai']),
      isLocked: z.boolean(),
      quotes: z.array(
        z.object({
          id: z.string().min(1),
          vendorName: z.string().min(1),
          quotedPrice: z.number().int('Quoted price must be integer').nonnegative(),
          notes: z.string().optional(),
          isFinalized: z.boolean().optional(),
        })
      ),
    })
  ),
  ideas: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.string().min(1),
      })
    )
    .default([]),
  tombstones: z
    .array(
      z.object({
        id: z.string().min(1),
        matchKey: z.string().min(1),
        label: z.string().min(1),
      })
    )
    .default([]),
  updatedAt: z.string().optional(),
});

/**
 * Formats a clean, emoji-structured WhatsApp and text brief for family coordination.
 */
export function formatFamilySummaryText(
  plan: WeddingPlan,
  referenceDateStr: string
): string {
  const summary = computeBudgetSummary(plan);
  const health = evaluatePlanRisks(plan, referenceDateStr);

  const lines: string[] = [];

  // Header & Event Basics
  lines.push(`💍 ${plan.title.trim().toUpperCase()} 💍`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📍 City: ${plan.city} | Style: ${plan.eventStyle}`);
  lines.push(`👥 Target Guests: ${plan.guestCount} guests`);
  lines.push('');

  // Multi-day Function Dates
  if (plan.functions.length > 0) {
    lines.push(`📅 CELEBRATION SCHEDULE:`);
    for (const fn of plan.functions) {
      const timeStr = fn.time ? ` (${fn.time})` : '';
      lines.push(`  • ${fn.name}: ${fn.date}${timeStr}`);
    }
    lines.push('');
  }

  // Financial Snapshot
  lines.push(`💰 FINANCIAL OVERVIEW:`);
  lines.push(`  • Total Budget: ${formatINR(plan.totalBudget)}`);
  lines.push(`  • Committed Spend: ${formatINR(summary.totalPlannedOrActual)}`);
  lines.push(`  • Paid to Date: ${formatINR(summary.totalPaid)}`);
  lines.push(`  • Balance Remaining to Pay: ${formatINR(summary.totalDue)}`);
  if (summary.isOverBudget) {
    lines.push(`  ⚠️ STATUS: DEFICIT of ${formatINR(summary.overBudgetAmount)}`);
  } else {
    lines.push(`  🛡️ STATUS: Healthy Buffer of ${formatINR(summary.remainingBudget)}`);
  }
  lines.push('');

  // 8 Budget Categories Breakdown
  lines.push(`🏷️ CATEGORY ALLOCATIONS (8 Core):`);
  for (const cat of plan.budget) {
    const spend = cat.actual !== undefined && cat.actual !== null ? cat.actual : cat.estimated;
    const lockTag = cat.isLocked ? ' [🔒 Locked]' : '';
    lines.push(
      `  • ${cat.label}: ${formatINR(spend)} (${cat.priorityWeight} priority)${lockTag}`
    );
  }
  lines.push('');

  // Next 5 Upcoming Incomplete Tasks
  const incompleteTasks = plan.tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  lines.push(`📋 UPCOMING ACTION ITEMS (Next 5):`);
  if (incompleteTasks.length === 0) {
    lines.push(`  • All scheduled tasks completed! 🎉`);
  } else {
    const nextFive = incompleteTasks.slice(0, 5);
    for (const task of nextFive) {
      let statusTag = '';
      if (task.deadline < referenceDateStr) {
        statusTag = ' [OVERDUE]';
      } else if (isTaskBlocked(task, plan.tasks)) {
        statusTag = ' [BLOCKED]';
      }
      lines.push(`  •${statusTag} ${task.title} (Due: ${task.deadline}) - Lead: ${task.assignee}`);
    }
  }
  lines.push('');

  // Vendor Status & Confirmed Quotes
  const totalSlots = plan.vendors.length;
  const confirmedSlots = plan.vendors.filter((v) => v.status === 'confirmed').length;
  const pendingSlots = totalSlots - confirmedSlots;

  lines.push(`🤝 VENDOR CHECKLIST:`);
  lines.push(`  • Confirmed Slots: ${confirmedSlots} / ${totalSlots} | Pending: ${pendingSlots}`);
  const confirmedQuotesList: string[] = [];
  for (const slot of plan.vendors) {
    const fin = slot.quotes.find((q) => q.isFinalized);
    if (fin) {
      confirmedQuotesList.push(`  • ${slot.type}: ${fin.vendorName} (${formatINR(fin.quotedPrice)})`);
    }
  }
  if (confirmedQuotesList.length > 0) {
    lines.push(`  Confirmed Vendor Partners:`);
    lines.push(...confirmedQuotesList);
  }
  lines.push('');

  // Health Score & Top Risks
  lines.push(`🧭 PLAN HEALTH & RISKS:`);
  lines.push(`  • Health Score: ${health.score}/100 (${health.status})`);
  if (health.risks.length === 0) {
    lines.push(`  • Zero critical blockers. Celebration plan is on track! ✨`);
  } else {
    const topRisks = health.risks.slice(0, 3);
    for (const risk of topRisks) {
      lines.push(`  • [${risk.severity.toUpperCase()}] ${risk.title}: ${risk.description}`);
    }
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Generated by Planovent Celebration Planner`);

  return lines.join('\n');
}

/**
 * Maximum import payload size cap (200KB / 200,000 characters).
 */
export const MAX_IMPORT_JSON_CHARS = 200_000;

/**
 * Validates and sanitizes raw JSON into a typed WeddingPlan using deep Zod validation.
 * Enforces a 200,000 char size limit, rejects malformed schemas (e.g., quotedPrice: "abc"),
 * and repairs circular dependencies via sanitizeTaskDependencies.
 */
export function validateImportedPlanJson(
  rawJson: string
): { ok: true; plan: WeddingPlan } | { ok: false; error: string } {
  if (!rawJson || typeof rawJson !== 'string') {
    return { ok: false, error: 'Empty or invalid JSON string provided.' };
  }

  if (rawJson.length > MAX_IMPORT_JSON_CHARS) {
    return {
      ok: false,
      error: `Import payload exceeds maximum size limit of 200KB (${rawJson.length.toLocaleString('en-IN')} characters).`,
    };
  }

  let data: any;
  try {
    data = JSON.parse(rawJson);
  } catch (err: any) {
    return { ok: false, error: `Invalid JSON syntax: ${err?.message || 'Parse error'}` };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Imported payload must be a JSON object.' };
  }

  // Pre-process legacy tombstones if strings were passed
  if (Array.isArray(data.tombstones)) {
    data.tombstones = data.tombstones.map((item: any) => {
      if (typeof item === 'string') {
        return {
          id: item,
          matchKey: toMatchKey(item),
          label: item,
        };
      }
      if (typeof item === 'object' && item !== null && item.id) {
        const label = String(item.label || item.id);
        return {
          id: String(item.id),
          matchKey: item.matchKey ? String(item.matchKey) : toMatchKey(label),
          label,
        };
      }
      return item;
    });
  }

  const validation = WeddingPlanImportSchema.safeParse(data);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    const pathStr = firstIssue.path.length > 0 ? ` at "${firstIssue.path.join('.')}"` : '';
    return {
      ok: false,
      error: `Validation error${pathStr}: ${firstIssue.message}`,
    };
  }

  const parsedPlan = validation.data;

  // Sanitize task dependencies to break DAG cycles
  const sanitizedTasks = sanitizeTaskDependencies(parsedPlan.tasks as TaskItem[]);

  const finalPlan: WeddingPlan = {
    ...parsedPlan,
    budget: parsedPlan.budget as BudgetCategory[],
    tasks: sanitizedTasks,
    vendors: parsedPlan.vendors as VendorSlot[],
    ideas: parsedPlan.ideas,
    tombstones: parsedPlan.tombstones as Tombstone[],
    updatedAt: parsedPlan.updatedAt || new Date().toISOString(),
  };

  return { ok: true, plan: finalPlan };
}
