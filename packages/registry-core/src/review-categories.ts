// Skill review categories and criteria definitions
// Based on the skill-evaluator rubric (ISO 25010, OpenSSF, Shneiderman, agent-specific)

export interface ReviewCategory {
  id: string;
  name: string;
  sourceFramework: string;
  criteria: ReviewCriterion[];
}

export interface ReviewCriterion {
  id: string;
  name: string;
  maxScore: number; // Always 4
}

export const REVIEW_CATEGORIES: ReviewCategory[] = [
  {
    id: 'functional-suitability',
    name: 'Functional Suitability',
    sourceFramework: 'ISO 25010',
    criteria: [
      { id: 'completeness', name: 'Completeness', maxScore: 4 },
      { id: 'correctness', name: 'Correctness', maxScore: 4 },
      { id: 'appropriateness', name: 'Appropriateness', maxScore: 4 },
    ],
  },
  {
    id: 'reliability',
    name: 'Reliability',
    sourceFramework: 'ISO 25010',
    criteria: [
      { id: 'fault-tolerance', name: 'Fault Tolerance', maxScore: 4 },
      { id: 'error-reporting', name: 'Error Reporting', maxScore: 4 },
      { id: 'recoverability', name: 'Recoverability', maxScore: 4 },
    ],
  },
  {
    id: 'performance',
    name: 'Performance / Context',
    sourceFramework: 'ISO 25010 + Agent',
    criteria: [
      { id: 'token-cost', name: 'Token Cost', maxScore: 4 },
      { id: 'execution-efficiency', name: 'Execution Efficiency', maxScore: 4 },
    ],
  },
  {
    id: 'usability-ai',
    name: 'Usability — AI Agent',
    sourceFramework: 'Shneiderman, Gerhardt-Powals',
    criteria: [
      { id: 'learnability', name: 'Learnability', maxScore: 4 },
      { id: 'consistency', name: 'Consistency', maxScore: 4 },
      { id: 'feedback', name: 'Feedback', maxScore: 4 },
      { id: 'error-prevention', name: 'Error Prevention', maxScore: 4 },
    ],
  },
  {
    id: 'usability-human',
    name: 'Usability — Human',
    sourceFramework: 'Tognazzini, Norman',
    criteria: [
      { id: 'discoverability', name: 'Discoverability', maxScore: 4 },
      { id: 'forgiveness', name: 'Forgiveness', maxScore: 4 },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    sourceFramework: 'ISO 25010 + OpenSSF',
    criteria: [
      { id: 'credentials', name: 'Credentials', maxScore: 4 },
      { id: 'input-validation', name: 'Input Validation', maxScore: 4 },
      { id: 'data-safety', name: 'Data Safety', maxScore: 4 },
    ],
  },
  {
    id: 'maintainability',
    name: 'Maintainability',
    sourceFramework: 'ISO 25010',
    criteria: [
      { id: 'modularity', name: 'Modularity', maxScore: 4 },
      { id: 'modifiability', name: 'Modifiability', maxScore: 4 },
      { id: 'testability', name: 'Testability', maxScore: 4 },
    ],
  },
  {
    id: 'agent-specific',
    name: 'Agent-Specific',
    sourceFramework: 'Novel',
    criteria: [
      { id: 'trigger-precision', name: 'Trigger Precision', maxScore: 4 },
      { id: 'progressive-disclosure', name: 'Progressive Disclosure', maxScore: 4 },
      { id: 'composability', name: 'Composability', maxScore: 4 },
      { id: 'idempotency', name: 'Idempotency', maxScore: 4 },
      { id: 'escape-hatches', name: 'Escape Hatches', maxScore: 4 },
    ],
  },
];

/** Total maximum score (25 criteria × 4) */
export const MAX_TOTAL_SCORE = 100;

/** Valid review statuses */
export const VALID_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'needs_manual_review',
] as const;

/** Valid finding priorities */
export const VALID_PRIORITIES = ['P0', 'P1', 'P2'] as const;
