/**
 * Celebration Planner — Risk Radar Diagnostic Engine (src/lib/riskEngine.ts)
 * 
 * 100% PURE TYPESCRIPT MODULE (Zero React, Zero Browser/DOM dependencies).
 * Deterministically evaluates timeline, financial, DAG blocker, and vendor gaps:
 * 1. Plan Over-Budget (critical)
 * 2. Category Actual Overrun (>15% over estimated) (warning)
 * 3. Overdue Incomplete Tasks (critical)
 * 4. Blocked Tasks with incomplete prerequisites (warning/critical)
 * 5. Unassigned Incomplete Tasks (warning)
 * 6. Pending Vendors Near Event Date / No Quotes (critical/warning)
 */

import type {
  WeddingPlan,
  RiskItem,
  PlanHealthEvaluation,
} from '../types/plan';
import { isTaskBlocked, computeBudgetSummary, formatINR } from './calculations';

/**
 * Calculates calendar days difference between target date and reference date (YYYY-MM-DD)
 */
function getDaysDifference(targetDateStr: string, referenceDateStr: string): number {
  if (!targetDateStr || !referenceDateStr) return 999;
  const target = new Date(targetDateStr);
  const ref = new Date(referenceDateStr);
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcRef = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.ceil((utcTarget - utcRef) / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates all 6 diagnostic rules against the celebration plan with an injectable reference date.
 */
export function evaluatePlanRisks(
  plan: WeddingPlan,
  referenceDateStr: string
): PlanHealthEvaluation {
  const risks: RiskItem[] = [];
  let scorePenalties = 0;

  // Rule 1: Plan Over-Budget (critical)
  const summary = computeBudgetSummary(plan);
  if (summary.isOverBudget) {
    risks.push({
      id: 'risk-over-budget',
      rule: 'plan_over_budget',
      severity: 'critical',
      title: 'Celebration Deficit Detected',
      description: `Committed and estimated costs exceed total budget by ${formatINR(summary.overBudgetAmount)}. Immediate rebalancing required.`,
      actionType: 'rebalance_budget',
      actionLabel: '1-Click Rebalance',
    });
    scorePenalties += 30;
  }

  // Rule 2: Category Actual Overrun (>15% variance) (warning)
  for (const cat of plan.budget) {
    if (cat.actual !== undefined && cat.actual !== null && cat.estimated > 0) {
      const overrun = cat.actual - cat.estimated;
      const overrunRatio = overrun / cat.estimated;
      if (overrunRatio > 0.15) {
        risks.push({
          id: `risk-overrun-${cat.id}`,
          rule: 'category_overrun',
          severity: 'warning',
          title: `${cat.label} Overrun (+${Math.round(overrunRatio * 100)}%)`,
          description: `Confirmed spend of ${formatINR(cat.actual)} exceeds allocated budget of ${formatINR(cat.estimated)} by ${formatINR(overrun)}.`,
          actionType: 'rebalance_budget',
          actionLabel: 'Adjust Allocation',
          targetId: cat.key,
        });
        scorePenalties += 10;
      }
    }
  }

  // Rule 3: Overdue Incomplete Tasks (critical)
  const overdueTasks = plan.tasks.filter((t) => !t.done && t.deadline < referenceDateStr);
  for (const task of overdueTasks) {
    risks.push({
      id: `risk-overdue-${task.id}`,
      rule: 'overdue_tasks',
      severity: 'critical',
      title: `Overdue Task: "${task.title}"`,
      description: `Target deadline was ${task.deadline}. Assigned lead: ${task.assignee}. Extend deadline or mark completed.`,
      actionType: 'extend_deadline',
      actionLabel: '+7 Days Deadline',
      targetId: task.id,
    });
  }
  scorePenalties += Math.min(35, overdueTasks.length * 15);

  // Rule 4: Blocked Tasks with incomplete prerequisites (warning/critical)
  const blockedTasks = plan.tasks.filter((t) => !t.done && isTaskBlocked(t, plan.tasks));
  for (const task of blockedTasks) {
    const prereq = plan.tasks.find((t) => t.id === task.dependsOnTaskId);
    const prereqTitle = prereq ? prereq.title : 'prerequisite task';
    risks.push({
      id: `risk-blocked-${task.id}`,
      rule: 'blocked_tasks',
      severity: task.priority === 'high' ? 'critical' : 'warning',
      title: `Workflow Blocker: "${task.title}"`,
      description: `Blocked until prerequisite "${prereqTitle}" is completed.`,
      actionType: 'complete_prerequisite',
      actionLabel: 'Complete Prerequisite',
      targetId: task.dependsOnTaskId,
    });
  }
  scorePenalties += Math.min(30, blockedTasks.length * 10);

  // Rule 5: Unassigned Incomplete Tasks (warning)
  const unassignedTasks = plan.tasks.filter(
    (t) =>
      !t.done &&
      (!t.assignee || ['tbd', 'unassigned', 'none', ''].includes(t.assignee.trim().toLowerCase()))
  );
  for (const task of unassignedTasks) {
    risks.push({
      id: `risk-unassigned-${task.id}`,
      rule: 'unassigned_tasks',
      severity: 'warning',
      title: `Unassigned Owner: "${task.title}"`,
      description: `Task has no designated lead or coordinator. Assign an owner to prevent milestone slippage.`,
      actionType: 'assign_owner',
      actionLabel: 'Assign Owner',
      targetId: task.id,
    });
  }
  scorePenalties += Math.min(20, unassignedTasks.length * 5);

  // Rule 6: Pending Vendors Near Event Date (<60 days) or Zero Quotes (critical/warning)
  const earliestDate = plan.functions.length > 0
    ? plan.functions.map((f) => f.date).sort()[0]
    : '2099-12-31';

  const daysToCelebration = getDaysDifference(earliestDate, referenceDateStr);

  for (const vendor of plan.vendors) {
    const isNearEvent = daysToCelebration <= 60;
    const hasNoQuotes = vendor.quotes.length === 0;

    if (vendor.status === 'pending' && (isNearEvent || hasNoQuotes)) {
      const isCritical = daysToCelebration <= 30 || hasNoQuotes;
      risks.push({
        id: `risk-vendor-${vendor.id}`,
        rule: 'pending_vendors',
        severity: isCritical ? 'critical' : 'warning',
        title: `Unconfirmed Slot: ${vendor.type}`,
        description: hasNoQuotes
          ? `No vendor proposals recorded for this archetype. Compare vendor quotes immediately.`
          : `Only ${daysToCelebration} days remaining until celebration and vendor quote is unfinalized.`,
        actionType: 'jump_to_vendors',
        actionLabel: 'Jump to Vendors',
        targetId: vendor.id,
      });
      scorePenalties += isCritical ? 15 : 10;
    }
  }

  // Calculate final bounded health score
  const score = Math.max(0, 100 - scorePenalties);

  // Determine health status
  const criticalCount = risks.filter((r) => r.severity === 'critical').length;
  let status: 'Healthy' | 'Needs Attention' | 'At Risk';

  if (score >= 80 && criticalCount === 0) {
    status = 'Healthy';
  } else if (score >= 50 && criticalCount <= 1) {
    status = 'Needs Attention';
  } else {
    status = 'At Risk';
  }

  return {
    score,
    status,
    risks,
  };
}
