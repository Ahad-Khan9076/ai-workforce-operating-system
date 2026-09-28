import { describe, it, expect } from 'vitest';
import { gradeObjectiveAssessment } from './assessment-grader.js';

describe('gradeObjectiveAssessment', () => {
  it('grades multiple choice and true/false objectively', () => {
    const result = gradeObjectiveAssessment(
      [
        { id: 'q1', correctAnswer: 'a' },
        { id: 'q2', correctAnswer: 'true' },
      ],
      { q1: 'a', q2: 'false' },
      70,
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(1);
  });

  it('passes when score meets threshold', () => {
    const result = gradeObjectiveAssessment(
      [{ id: 'q1', correctAnswer: 'yes' }],
      { q1: 'yes' },
      70,
    );
    expect(result.passed).toBe(true);
  });
});
