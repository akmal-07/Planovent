import { describe, it, expect } from 'vitest';
import { evaluatePlanRisks } from '../riskEngine';
import type { WeddingPlan } from '../../types/plan';

describe('riskEngine.ts — Deterministic Risk Radar Diagnostic Engine', () => {
  const createBasePlan = (): WeddingPlan => ({
    id: 'plan-risk-test',
    title: 'Benchmark ₹8L Wedding',
    city: 'Hyderabad',
    eventStyle: 'Traditional Intimate',
    guestCount: 200,
    totalBudget: 800000,
    accessibilityNeeds: [],
    functions: [
      {
        name: 'Wedding',
        date: '2026-12-15',
        time: '10:00 AM',
      },
    ],
    budget: [
      { id: '1', key: 'venue', label: 'Venue', priorityWeight: 'medium', estimated: 280000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '2', key: 'catering', label: 'Catering', priorityWeight: 'high', estimated: 260000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '3', key: 'decor', label: 'Decor', priorityWeight: 'low', estimated: 70000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '4', key: 'photo_video', label: 'Photo/Video', priorityWeight: 'high', estimated: 80000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '5', key: 'entertainment', label: 'Entertainment', priorityWeight: 'medium', estimated: 40000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
      { id: '6', key: 'invites', label: 'Invites', priorityWeight: 'low', estimated: 15000, paid: 0, scalingType: 'per_guest', source: 'user', isLocked: false },
      { id: '7', key: 'transport', label: 'Transport', priorityWeight: 'medium', estimated: 30000, paid: 0, scalingType: 'step', stepSize: 50, stepRate: 0.15, source: 'user', isLocked: false },
      { id: '8', key: 'misc', label: 'Misc', priorityWeight: 'medium', estimated: 25000, paid: 0, scalingType: 'fixed', source: 'user', isLocked: false },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Book Venue',
        deadline: '2026-11-20',
        done: true,
        priority: 'high',
        assignee: 'Uncle Raj',
        eventFunction: 'Wedding',
        source: 'user',
        isLocked: true,
      },
    ],
    vendors: [
      {
        id: 'slot-1',
        categoryKey: 'venue',
        type: 'Heritage Banquet Hall',
        estimatedQuote: 280000,
        status: 'confirmed',
        source: 'user',
        isLocked: true,
        quotes: [
          {
            id: 'q-1',
            vendorName: 'Royal Palace Hall',
            quotedPrice: 280000,
            isFinalized: true,
            notes: 'Includes seating',
          },
        ],
      },
    ],
    ideas: [],
    tombstones: [],
    updatedAt: new Date().toISOString(),
  });

  const fixedRefDate = '2026-10-28';

  it('Rule 1: detects plan over-budget and returns critical risk with rebalance_budget action', () => {
    const plan = createBasePlan();
    // Increase budget spend to ₹9,00,000 on ₹8,00,000 budget
    plan.budget[0].estimated = 380000;

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const overBudgetRisk = evaluation.risks.find((r) => r.rule === 'plan_over_budget');

    expect(overBudgetRisk).toBeDefined();
    expect(overBudgetRisk?.severity).toBe('critical');
    expect(overBudgetRisk?.actionType).toBe('rebalance_budget');
    expect(evaluation.score).toBeLessThan(100);
  });

  it('Rule 2: detects category actual overrun (>15% over estimated) as warning', () => {
    const plan = createBasePlan();
    // Catering estimated 260000, actual 310000 (+19.2% overrun)
    plan.budget[1].actual = 310000;

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const overrunRisk = evaluation.risks.find((r) => r.rule === 'category_overrun' && r.targetId === 'catering');

    expect(overrunRisk).toBeDefined();
    expect(overrunRisk?.severity).toBe('warning');
    expect(overrunRisk?.actionType).toBe('rebalance_budget');
    expect(overrunRisk?.title).toContain('Catering Overrun');
  });

  it('Rule 3: detects overdue incomplete tasks as critical with extend_deadline action', () => {
    const plan = createBasePlan();
    plan.tasks.push({
      id: 'task-overdue-1',
      title: 'Finalize Photographer Contract',
      deadline: '2026-10-20', // Overdue relative to 2026-10-28
      done: false,
      priority: 'high',
      assignee: 'Aunt Priya',
      eventFunction: 'Wedding',
      source: 'user',
      isLocked: true,
    });

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const overdueRisk = evaluation.risks.find((r) => r.rule === 'overdue_tasks' && r.targetId === 'task-overdue-1');

    expect(overdueRisk).toBeDefined();
    expect(overdueRisk?.severity).toBe('critical');
    expect(overdueRisk?.actionType).toBe('extend_deadline');
  });

  it('Rule 4: detects blocked tasks with incomplete prerequisites as workflow blocker', () => {
    const plan = createBasePlan();
    // Task 2 depends on Task 3, which is incomplete
    plan.tasks.push(
      {
        id: 'task-prereq',
        title: 'Select Catering Menu',
        deadline: '2026-11-10',
        done: false,
        priority: 'high',
        assignee: 'Uncle Raj',
        eventFunction: 'Reception',
        source: 'user',
        isLocked: true,
      },
      {
        id: 'task-dependent',
        title: 'Print Menu Cards',
        deadline: '2026-11-15',
        done: false,
        priority: 'high',
        dependsOnTaskId: 'task-prereq',
        assignee: 'Neha',
        eventFunction: 'Reception',
        source: 'user',
        isLocked: true,
      }
    );

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const blockedRisk = evaluation.risks.find((r) => r.rule === 'blocked_tasks' && r.id === 'risk-blocked-task-dependent');

    expect(blockedRisk).toBeDefined();
    expect(blockedRisk?.targetId).toBe('task-prereq');
    expect(blockedRisk?.actionType).toBe('complete_prerequisite');
  });

  it('Rule 5: detects unassigned tasks as warning with assign_owner action', () => {
    const plan = createBasePlan();
    plan.tasks.push({
      id: 'task-unassigned',
      title: 'Order Haldi Garland Decor',
      deadline: '2026-11-25',
      done: false,
      priority: 'medium',
      assignee: 'TBD', // unassigned string
      eventFunction: 'Haldi',
      source: 'user',
      isLocked: true,
    });

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const unassignedRisk = evaluation.risks.find((r) => r.rule === 'unassigned_tasks' && r.targetId === 'task-unassigned');

    expect(unassignedRisk).toBeDefined();
    expect(unassignedRisk?.severity).toBe('warning');
    expect(unassignedRisk?.actionType).toBe('assign_owner');
  });

  it('Rule 6: detects pending vendors with zero quotes or near event date as critical/warning', () => {
    const plan = createBasePlan();
    // Earliest function is 2026-12-15 (48 days from 2026-10-28)
    plan.vendors.push({
      id: 'slot-photo',
      categoryKey: 'photo_video',
      type: 'Candid Wedding Photographer',
      estimatedQuote: 80000,
      status: 'pending',
      source: 'user',
      isLocked: true,
      quotes: [], // zero quotes
    });

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    const vendorRisk = evaluation.risks.find((r) => r.rule === 'pending_vendors' && r.targetId === 'slot-photo');

    expect(vendorRisk).toBeDefined();
    expect(vendorRisk?.severity).toBe('critical'); // 0 quotes or <=30 days
    expect(vendorRisk?.actionType).toBe('jump_to_vendors');
  });

  it('evaluates fully healthy benchmark plan with score 100 and Healthy status', () => {
    const plan = createBasePlan();
    // Change function date to >60 days away so vendor isn't triggered
    plan.functions[0].date = '2027-04-15';

    const evaluation = evaluatePlanRisks(plan, fixedRefDate);
    expect(evaluation.score).toBe(100);
    expect(evaluation.status).toBe('Healthy');
    expect(evaluation.risks).toHaveLength(0);
  });
});
