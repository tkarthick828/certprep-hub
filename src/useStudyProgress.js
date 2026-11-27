import { useState, useEffect, useCallback } from 'react';

const EMPTY_EXAM_DATA = {
  domainStats: {},   // { [domain]: { attempted: number, correct: number } }
  missedIds: [],     // string[]
  bookmarkedIds: [], // string[]
};

export function getQuestionKey(question, fallbackIndex = 0) {
  return String(
    question?.id ??
      question?.question_id ??
      `${question?.domain || 'general'}::${(question?.question || '').slice(0, 48)}::${fallbackIndex}`
  );
}

export function useStudyProgress(userId) {
  const storageKey = userId ? `certprep_progress_${userId}` : 'certprep_progress_guest';
  const [progress, setProgress] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setProgress(saved ? JSON.parse(saved) : {});
    } catch {
      setProgress({});
    }
  }, [storageKey]);

  const updateStorage = useCallback(
    (updater) => {
      setProgress((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          console.error('Failed to save study progress:', err);
        }
        return next;
      });
    },
    [storageKey]
  );

  // Feature 1 + Feature 2: Record answer -> updates domain mastery & missed-questions queue
  const recordAnswer = useCallback(
    (examCode, question, isCorrect, fallbackIndex = 0) => {
      const qKey = getQuestionKey(question, fallbackIndex);
      const domain = question?.domain || 'General';

      updateStorage((prev) => {
        const exam = prev[examCode] || EMPTY_EXAM_DATA;
        const prevDomain = exam.domainStats[domain] || { attempted: 0, correct: 0 };

        const nextDomainStats = {
          ...exam.domainStats,
          [domain]: {
            attempted: prevDomain.attempted + 1,
            correct: prevDomain.correct + (isCorrect ? 1 : 0),
          },
        };

        const missedSet = new Set(exam.missedIds);
        if (isCorrect) {
          missedSet.delete(qKey);
        } else {
          missedSet.add(qKey);
        }

        return {
          ...prev,
          [examCode]: {
            ...exam,
            domainStats: nextDomainStats,
            missedIds: Array.from(missedSet),
          },
        };
      });
    },
    [updateStorage]
  );

  // Feature 2: Toggle bookmark on any question
  const toggleBookmark = useCallback(
    (examCode, question, fallbackIndex = 0) => {
      const qKey = getQuestionKey(question, fallbackIndex);

      updateStorage((prev) => {
        const exam = prev[examCode] || EMPTY_EXAM_DATA;
        const bookmarkSet = new Set(exam.bookmarkedIds);
        if (bookmarkSet.has(qKey)) {
          bookmarkSet.delete(qKey);
        } else {
          bookmarkSet.add(qKey);
        }

        return {
          ...prev,
          [examCode]: {
            ...exam,
            bookmarkedIds: Array.from(bookmarkSet),
          },
        };
      });
    },
    [updateStorage]
  );

  // Feature 1: Compute per-domain mastery & readiness summary for an exam
  const getExamStats = useCallback(
    (examCode, questions = []) => {
      const exam = progress[examCode] || EMPTY_EXAM_DATA;
      const domains =
        questions.length > 0
          ? Array.from(new Set(questions.map((q) => q.domain).filter(Boolean)))
          : Object.keys(exam.domainStats);

      let totalAttempted = 0;
      let totalCorrect = 0;

      const domainBreakdown = domains.map((domain) => {
        const stat = exam.domainStats[domain] || { attempted: 0, correct: 0 };
        totalAttempted += stat.attempted;
        totalCorrect += stat.correct;
        const accuracy =
          stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : null;
        return {
          domain,
          attempted: stat.attempted,
          correct: stat.correct,
          accuracy,
          isWeak: accuracy === null || accuracy < 70,
        };
      });

      const readiness =
        totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

      return {
        readiness,
        totalAttempted,
        totalCorrect,
        domainBreakdown,
        weakDomains: domainBreakdown.filter((d) => d.isWeak).map((d) => d.domain),
        missedIds: exam.missedIds || [],
        bookmarkedIds: exam.bookmarkedIds || [],
      };
    },
    [progress]
  );

  const resetExamProgress = useCallback(
    (examCode) => {
      updateStorage((prev) => {
        const next = { ...prev };
        delete next[examCode];
        return next;
      });
    },
    [updateStorage]
  );

  return {
    recordAnswer,
    toggleBookmark,
    getExamStats,
    resetExamProgress,
  };
}