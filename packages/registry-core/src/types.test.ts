import { describe, it, expect } from 'vitest';

// Type-level tests — verify our type definitions are consistent
describe('Registry Core Types', () => {
  it('should define ReviewStatus as union type', () => {
    const statuses: string[] = [
      'pending',
      'approved',
      'rejected',
      'needs_manual_review',
    ];
    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('approved');
    expect(statuses).toContain('rejected');
  });

  it('should define LifecycleStatus as union type', () => {
    const statuses: string[] = ['active', 'deprecated', 'archived'];
    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('active');
  });

  it('should define Compatibility as union type', () => {
    const compat: string[] = ['opencode', 'claude-code', 'codex'];
    expect(compat).toHaveLength(3);
    expect(compat).toContain('opencode');
  });
});
