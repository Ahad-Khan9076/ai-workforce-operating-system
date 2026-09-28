export interface GradableQuestion {
  id: string;
  correctAnswer: string;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
}

export function gradeObjectiveAssessment(
  questions: GradableQuestion[],
  answers: Record<string, string>,
  passingScore: number,
): GradeResult {
  const total = questions.length;
  if (total === 0) {
    return { score: 0, passed: false, correctCount: 0, total: 0 };
  }

  let correctCount = 0;
  for (const q of questions) {
    const given = (answers[q.id] ?? '').trim().toLowerCase();
    const expected = q.correctAnswer.trim().toLowerCase();
    if (given === expected) correctCount += 1;
  }

  const score = Math.round((correctCount / total) * 10000) / 100;
  return {
    score,
    passed: score >= passingScore,
    correctCount,
    total,
  };
}
