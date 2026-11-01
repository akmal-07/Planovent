/**
 * Celebration Planner — Benchmark Mock Preset (src/lib/mockPlan.ts)
 * 
 * Strictly aligned with Prompt Wars Virtual Challenge 5 Benchmark Scenario:
 * - Dynamic relative dates (120-123 days from today) so the 4-month preset never goes stale.
 * - ₹8,00,000 Total Budget, 200 Guests.
 * - Multi-day functions (Haldi, Mehndi, Sangeet, Wedding, Reception).
 * - High priority on Catering & Photo/Video, Low priority on Decor & Invites.
 * - Realistic accessibility & dietary needs.
 * - 8 Budget categories totaling exactly ₹8,00,000.
 * - Realistic anonymous side-by-side quotes on 3 slots for instant quote comparison.
 * - Balanced initial Health Score of 75-85 ("Needs Attention") demonstrating Risk Radar diagnostics.
 */

import type { WeddingPlan } from '../types/plan';

export function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const BENCHMARK_MOCK_PLAN: WeddingPlan = {
  id: 'benchmark-hyderabad-8L',
  title: 'Pooja & Srinivas’s Traditional Celebration',
  city: 'Hyderabad',
  eventStyle: 'Traditional Intimate',
  guestCount: 200,
  totalBudget: 800000, // ₹8,00,000 (8 Lakhs)
  accessibilityNeeds: [
    'Wheelchair Accessible Venue & Entrance Ramps',
    'Elderly Ground-Floor Banquet Seating',
    'Pure Vegetarian & Jain Counter Separation',
  ],
  functions: [
    { name: 'Haldi', date: getRelativeDate(120), time: '10:00 AM' },
    { name: 'Mehndi', date: getRelativeDate(120), time: '03:30 PM' },
    { name: 'Sangeet', date: getRelativeDate(121), time: '07:00 PM' },
    { name: 'Wedding', date: getRelativeDate(122), time: '09:00 AM' },
    { name: 'Reception', date: getRelativeDate(122), time: '07:30 PM' },
  ],
  budget: [
    {
      id: 'cat-venue',
      key: 'venue',
      label: 'Venue & Accommodation',
      priorityWeight: 'medium',
      estimated: 280000,
      actual: 290000,
      paid: 150000,
      scalingType: 'fixed',
      stepSize: 100,
      stepRate: 0.25,
      source: 'user',
      isLocked: true,
    },
    {
      id: 'cat-catering',
      key: 'catering',
      label: 'Catering & Beverages',
      priorityWeight: 'high', // Protected value priority
      estimated: 260000,
      actual: undefined,
      paid: 100000,
      scalingType: 'per_guest',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'cat-decor',
      key: 'decor',
      label: 'Decor & Floral Styling',
      priorityWeight: 'low', // Low priority: reduced first during budget cuts
      estimated: 70000,
      actual: 65000,
      paid: 65000,
      scalingType: 'fixed',
      source: 'user',
      isLocked: true,
    },
    {
      id: 'cat-photo',
      key: 'photo_video',
      label: 'Photography & Cinema',
      priorityWeight: 'high', // Protected value priority
      estimated: 80000,
      actual: undefined,
      paid: 30000,
      scalingType: 'fixed',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'cat-entertainment',
      key: 'entertainment',
      label: 'Music & Entertainment',
      priorityWeight: 'medium',
      estimated: 40000,
      actual: undefined,
      paid: 15000,
      scalingType: 'fixed',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'cat-invites',
      key: 'invites',
      label: 'Invitations & Favors',
      priorityWeight: 'low', // Low priority: reduced first during budget cuts
      estimated: 15000,
      actual: undefined,
      paid: 15000,
      scalingType: 'per_guest',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'cat-transport',
      key: 'transport',
      label: 'Logistics & Fleet',
      priorityWeight: 'medium',
      estimated: 30000,
      actual: undefined,
      paid: 10000,
      scalingType: 'step',
      stepSize: 50,
      stepRate: 0.15,
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'cat-misc',
      key: 'misc',
      label: 'Rituals & Contingency',
      priorityWeight: 'medium',
      estimated: 25000,
      actual: undefined,
      paid: 5000,
      scalingType: 'fixed',
      source: 'ai',
      isLocked: false,
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Finalize & Book Heritage Banquet Lawn',
      deadline: getRelativeDate(-60),
      priority: 'high',
      assignee: 'Srinivas',
      done: true,
      eventFunction: 'Wedding',
      source: 'user',
      isLocked: true,
    },
    {
      id: 'task-2',
      title: 'Design & Dispatch Invitations with Venue Location Map',
      deadline: getRelativeDate(-3), // Overdue by 3 days to demonstrate Risk Radar
      priority: 'medium',
      assignee: 'Pooja',
      done: false,
      eventFunction: 'General',
      dependsOnTaskId: 'task-1',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'task-3',
      title: 'Food Tasting & Menu Finalization (Jain & Andhra Counters)',
      deadline: getRelativeDate(30),
      priority: 'medium',
      assignee: 'Families',
      done: false,
      eventFunction: 'Reception',
      dependsOnTaskId: 'task-2', // Blocked because task-2 is incomplete
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'task-4',
      title: 'Book Candid Photographer & Traditional Videographer',
      deadline: getRelativeDate(-45),
      priority: 'high',
      assignee: 'Srinivas',
      done: true,
      eventFunction: 'General',
      source: 'user',
      isLocked: true,
    },
    {
      id: 'task-5',
      title: 'Haldi Marigold Petals & Organic Ubtan Setup',
      deadline: getRelativeDate(120),
      timeSlot: '09:30',
      priority: 'medium',
      assignee: 'Sister Deepa',
      done: false,
      eventFunction: 'Haldi',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'task-6',
      title: 'Sangeet Sound Check & Choreography Rehearsal',
      deadline: getRelativeDate(121),
      timeSlot: '17:30',
      priority: 'high',
      assignee: 'Cousin Rahul',
      done: false,
      eventFunction: 'Sangeet',
      source: 'ai',
      isLocked: false,
    },
    {
      id: 'task-7',
      title: 'Pheras Vedic Pandit Ji Dakshina & Sacred Fire Inspection',
      deadline: getRelativeDate(122),
      timeSlot: '08:30',
      priority: 'high',
      assignee: 'Uncle Murthy',
      done: false,
      eventFunction: 'Wedding',
      source: 'user',
      isLocked: true,
    },
    {
      id: 'task-8',
      title: 'Coordinate Outstation Guest Airport Shuttles',
      deadline: getRelativeDate(119),
      priority: 'medium',
      assignee: 'Transport In-Charge',
      done: false,
      eventFunction: 'General',
      source: 'ai',
      isLocked: false,
    },
  ],
  vendors: [
    {
      id: 'vslot-1',
      categoryKey: 'venue',
      type: 'Heritage Banquet & Guest Rooms',
      estimatedQuote: 280000,
      status: 'confirmed',
      source: 'user',
      isLocked: true,
      quotes: [
        {
          id: 'quote-v-1',
          vendorName: 'Heritage Palace & Lawn (Option A)',
          quotedPrice: 290000,
          isFinalized: true,
          notes: 'Includes lawn lighting and generator backup',
        },
        {
          id: 'quote-v-2',
          vendorName: 'Royal Convention Center (Option B)',
          quotedPrice: 310000,
          isFinalized: false,
          notes: 'Indoor air-conditioned hall only',
        },
      ],
    },
    {
      id: 'vslot-2',
      categoryKey: 'catering',
      type: 'Royal Feast & Live Counter Caterer',
      estimatedQuote: 260000,
      status: 'pending',
      source: 'ai',
      isLocked: false,
      quotes: [
        {
          id: 'quote-c-1',
          vendorName: 'Royal Feast Live Counters (Option A)',
          quotedPrice: 255000,
          isFinalized: false,
          notes: 'Includes 4 live counters, chaat station, and dessert buffet',
        },
        {
          id: 'quote-c-2',
          vendorName: 'Heritage Banana Leaf Caterers (Option B)',
          quotedPrice: 270000,
          isFinalized: false,
          notes: 'Authentic traditional South Indian feast on organic plantain leaves',
        },
      ],
    },
    {
      id: 'vslot-3',
      categoryKey: 'photo_video',
      type: 'Candid Photographer & Cinema Specialist',
      estimatedQuote: 80000,
      status: 'pending',
      source: 'ai',
      isLocked: false,
      quotes: [
        {
          id: 'quote-p-1',
          vendorName: 'Cinematic Stories Studio (Option A)',
          quotedPrice: 82000,
          isFinalized: false,
          notes: '2 candid photographers + 4K cinematic teaser + drone footage',
        },
        {
          id: 'quote-p-2',
          vendorName: 'Pixel Perfect Wedding Films (Option B)',
          quotedPrice: 78000,
          isFinalized: false,
          notes: 'Traditional coverage + candid photo book package',
        },
      ],
    },
    {
      id: 'vslot-4',
      categoryKey: 'decor',
      type: 'Mandap Floral & Stage Stylist',
      estimatedQuote: 70000,
      status: 'confirmed',
      source: 'user',
      isLocked: true,
      quotes: [
        {
          id: 'quote-d-1',
          vendorName: 'Marigold & Brass Mandap Styling',
          quotedPrice: 65000,
          isFinalized: true,
          notes: 'Eco-friendly fresh marigold canopy and brass urli aisle styling',
        },
      ],
    },
    {
      id: 'vslot-5',
      categoryKey: 'entertainment',
      type: 'Sangeet DJ & Audio Line-Array',
      estimatedQuote: 40000,
      status: 'pending',
      source: 'ai',
      isLocked: false,
      quotes: [], // Pending slot without quotes to demonstrate Risk Radar warning
    },
  ],
  ideas: [
    {
      id: 'idea-1',
      title: 'DIY Vintage Marigold Photo Booth',
      description: 'Handcrafted floral frame with instant Polaroid camera for guest book signatures.',
      category: 'decor',
    },
    {
      id: 'idea-2',
      title: 'Zero-Waste Banana Leaf Dining for Lunch',
      description: 'Authentic South Indian wedding feast served on organic plantain leaves.',
      category: 'catering',
    },
  ],
  tombstones: [],
  updatedAt: new Date().toISOString(),
};
