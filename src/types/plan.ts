/**
 * Celebration Planner — Domain Type Authority (src/types/plan.ts)
 * 
 * SINGLE SOURCE OF TRUTH for all domain models.
 * Conforms strictly to Prompt Wars Virtual Challenge 5 specification.
 */

export type EventFunctionName =
  | 'Haldi'
  | 'Mehndi'
  | 'Sangeet'
  | 'Wedding'
  | 'Reception'
  | 'General';

export type BudgetCategoryKey =
  | 'venue'
  | 'catering'
  | 'decor'
  | 'photo_video'
  | 'entertainment'
  | 'invites'
  | 'transport'
  | 'misc';

export type ScalingType = 'fixed' | 'per_guest' | 'step';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface BudgetCategory {
  id: string;
  key: BudgetCategoryKey;
  label: string;
  priorityWeight: PriorityLevel; // User values: high prioritizes protection, low gets reduced first
  estimated: number;             // Integer INR
  actual?: number;               // Integer INR, optional committed spend
  paid: number;                  // Integer INR paid to date
  scalingType: ScalingType;
  stepSize?: number;             // Default 100 for venue, 50 for transport
  stepRate?: number;             // Default 0.25 for venue, 0.15 for transport
  source: 'user' | 'ai';
  isLocked: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  deadline: string;             // YYYY-MM-DD
  timeSlot?: string;            // 24h format "HH:mm" (e.g. "09:30", "18:00")
  priority: PriorityLevel;
  assignee: string;
  done: boolean;
  eventFunction: EventFunctionName;
  dependsOnTaskId?: string;     // Prerequisite task ID for DAG dependency tracking
  source: 'user' | 'ai';
  isLocked: boolean;
}

export interface VendorQuote {
  id: string;
  vendorName: string;           // User-entered only (never hallucinated by AI)
  quotedPrice: number;          // Integer INR
  notes?: string;
  isFinalized?: boolean;
}

export interface VendorSlot {
  id: string;
  categoryKey: BudgetCategoryKey;
  type: string;                 // Archetype only (e.g. "Candid Photographer")
  estimatedQuote: number;       // Integer INR
  status: 'pending' | 'confirmed';
  quotes: VendorQuote[];        // Real quotes entered by user
  source: 'user' | 'ai';
  isLocked: boolean;
}

export interface EventFunctionSchedule {
  name: EventFunctionName;
  date: string;                 // YYYY-MM-DD
  time?: string;
}

export interface Tombstone {
  id: string;
  matchKey: string;             // Normalized key (lowercase, trimmed, punctuation stripped)
  label: string;                // Original human-readable title or type
}

export interface WeddingPlan {
  id: string;
  title: string;
  city: string;
  eventStyle: string;           // e.g. "Traditional Intimate", "Destination Multi-Day"
  guestCount: number;
  totalBudget: number;          // Integer INR
  accessibilityNeeds: string[]; // e.g. ["Elderly Ground-Floor Seating", "Wheelchair Accessible Venue", "Pure Vegetarian Jain Option"]
  functions: EventFunctionSchedule[];
  budget: BudgetCategory[];     // Strictly the 8 invariant categories
  tasks: TaskItem[];
  vendors: VendorSlot[];
  ideas: { id: string; title: string; description: string; category: string }[];
  tombstones: Tombstone[];      // Structured tombstones for AI merges
  updatedAt: string;
}

export interface BudgetSummary {
  totalEstimated: number;       // Σ(estimated)
  totalPlannedOrActual: number; // Σ(actual ?? estimated)
  totalPaid: number;            // Σ(paid)
  totalDue: number;             // Σ(actual ?? estimated) - Σ(paid)
  remainingBudget: number;      // totalBudget - Σ(actual ?? estimated)
  isOverBudget: boolean;        // remainingBudget < 0
  overBudgetAmount: number;     // Math.max(0, Σ(actual ?? estimated) - totalBudget)
}
