import { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_EXAM_DATA = {
  domainStats: {},   // { [domain]: { attempted: number, correct: number } }
  missedIds: [],     // string[]
  bookmarkedIds: [], // string[]
};

const EMPTY_ROOT = {
  exams: {},
  dailyLog: {}, // { 'YYYY-MM-DD': number }
  goal: null,   // { certId: string, examDate: string, dailyTarget: number }
};

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeProgressData(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ROOT };

  if (raw.exams && typeof raw.exams === 'object') {
    return {
      exams: raw.exams || {},
      dailyLog: raw.dailyLog || {},
      goal: raw.goal || null,
    };
  }

  // Migrate legacy flat format { [examCode]: { domainStats, missedIds, bookmarkedIds } }
  const exams = {};
  Object.entries(raw).forEach(([key, val]) => {
    if (
      val &&
      typeof val === 'object' &&
      ('domainStats' in val || 'missedIds' in val || 'bookmarkedIds' in val)
    ) {
      exams[key] = {
        domainStats: val.domainStats || {},
        missedIds: val.missedIds || [],
        bookmarkedIds: val.bookmarkedIds || [],
      };
    }
  });

  return { exams, dailyLog: {}, goal: null };
}

function mergeProgressData(localRaw, cloudRaw) {
  const local = normalizeProgressData(localRaw);
  const cloud = normalizeProgressData(cloudRaw);

  const allExamCodes = new Set([
    ...Object.keys(local.exams),
    ...Object.keys(cloud.exams),
  ]);

  const mergedExams = {};
  allExamCodes.forEach((code) => {
    const lExam = local.exams[code] || EMPTY_EXAM_DATA;
    const cExam = cloud.exams[code] || EMPTY_EXAM_DATA;

    const lTotal = Object.values(lExam.domainStats).reduce((s, d) => s + (d.attempted || 0), 0);
    const cTotal = Object.values(cExam.domainStats).reduce((s, d) => s + (d.attempted || 0), 0);
    const primary = lTotal >= cTotal ? lExam : cExam;

    mergedExams[code] = {
      domainStats: primary.domainStats,
      missedIds: Array.from(new Set([...(lExam.missedIds || []), ...(cExam.missedIds || [])])),
      bookmarkedIds: Array.from(
        new Set([...(lExam.bookmarkedIds || []), ...(cExam.bookmarkedIds || [])])
      ),
    };
  });

  const mergedDaily = { ...cloud.dailyLog };
  Object.entries(local.dailyLog).forEach(([day, count]) => {
    mergedDaily[day] = Math.max(mergedDaily[day] || 0, count || 0);
  });

  // Keep only the last 45 days in dailyLog to keep metadata compact
  const recentKeys = Object.keys(mergedDaily).sort().slice(-45);
  const trimmedDaily = {};
  recentKeys.forEach((k) => {
    trimmedDaily[k] = mergedDaily[k];
  });

  return {
    exams: mergedExams,
    dailyLog: trimmedDaily,
    goal: local.goal || cloud.goal || null,
  };
}

export function getQuestionKey(question, fallbackIndex = 0) {
  return String(
    question?.id ??
      question?.question_id ??
      `${question?.domain || 'general'}::${(question?.question || '').slice(0, 48)}::${fallbackIndex}`
  );
}

export function useStudyProgress(user, supabaseClient = null) {
  const userId = typeof user === 'string' ? user : user?.id;
  const storageKey = userId ? `certprep_progress_${userId}` : 'certprep_progress_guest';
  const [progress, setProgress] = useState(EMPTY_ROOT);
  const syncTimerRef = useRef(null);

  // Load local progress & merge cloud progress when logged in
  useEffect(() => {
    let localParsed = EMPTY_ROOT;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) localParsed = normalizeProgressData(JSON.parse(saved));
    } catch {
      localParsed = EMPTY_ROOT;
    }

    const cloudRaw = typeof user === 'object' ? user?.user_metadata?.study_progress : null;
    if (cloudRaw) {
      const merged = mergeProgressData(localParsed, cloudRaw);
      setProgress(merged);
      try {
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch {
        // Ignore quota errors
      }
    } else {
      setProgress(localParsed);
    }
  }, [storageKey, userId]);

  const scheduleCloudSync = useCallback(
    (nextData) => {
      if (!userId || !supabaseClient) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        supabaseClient.auth
          .updateUser({ data: { study_progress: nextData } })
          .catch((err) => console.error('Cloud progress sync failed:', err));
      }, 2000);
    },
    [userId, supabaseClient]
  );

  const updateStorage = useCallback(
    (updater) => {
      setProgress((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          console.error('Failed to save study progress:', err);
        }
        scheduleCloudSync(next);
        return next;
      });
    },
    [storageKey, scheduleCloudSync]
  );

  // Record answer -> updates domain mastery, missed queue, and daily study streak
  const recordAnswer = useCallback(
    (examCode, question, isCorrect, fallbackIndex = 0) => {
      const qKey = getQuestionKey(question, fallbackIndex);
      const domain = question?.domain || 'General';
      const todayKey = getLocalDateKey();

      updateStorage((prev) => {
        const exam = prev.exams[examCode] || EMPTY_EXAM_DATA;
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
          exams: {
            ...prev.exams,
            [examCode]: {
              ...exam,
              domainStats: nextDomainStats,
              missedIds: Array.from(missedSet),
            },
          },
          dailyLog: {
            ...prev.dailyLog,
            [todayKey]: (prev.dailyLog[todayKey] || 0) + 1,
          },
        };
      });
    },
    [updateStorage]
  );

  // Toggle bookmark on any question
  const toggleBookmark = useCallback(
    (examCode, question, fallbackIndex = 0) => {
      const qKey = getQuestionKey(question, fallbackIndex);

      updateStorage((prev) => {
        const exam = prev.exams[examCode] || EMPTY_EXAM_DATA;
        const bookmarkSet = new Set(exam.bookmarkedIds);
        if (bookmarkSet.has(qKey)) {
          bookmarkSet.delete(qKey);
        } else {
          bookmarkSet.add(qKey);
        }

        return {
          ...prev,
          exams: {
            ...prev.exams,
            [examCode]: {
              ...exam,
              bookmarkedIds: Array.from(bookmarkSet),
            },
          },
        };
      });
    },
    [updateStorage]
  );

  // Update Exam Countdown & Daily Target Goal
  const setStudyGoal = useCallback(
    (newGoal) => {
      updateStorage((prev) => ({
        ...prev,
        goal: newGoal,
      }));
    },
    [updateStorage]
  );

  // Compute per-domain mastery & readiness summary for an exam
  const getExamStats = useCallback(
    (examCode, questions = []) => {
      const exam = progress.exams[examCode] || EMPTY_EXAM_DATA;
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
    [progress.exams]
  );

  // Compute Daily Goal & Streak Metrics
  const getDailyMetrics = useCallback(() => {
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const todayCount = progress.dailyLog[todayKey] || 0;
    const dailyTarget = progress.goal?.dailyTarget || 15;

    // Streak calculation (includes yesterday if user hasn't practiced yet today)
    let streak = 0;
    const cursor = new Date(today);
    if (todayCount === 0) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      const k = getLocalDateKey(cursor);
      if ((progress.dailyLog[k] || 0) > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    let daysLeft = null;
    if (progress.goal?.examDate) {
      const targetEnd = new Date(`${progress.goal.examDate}T23:59:59`);
      const diffMs = targetEnd.getTime() - today.getTime();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      todayCount,
      dailyTarget,
      streak,
      goal: progress.goal,
      daysLeft,
    };
  }, [progress.dailyLog, progress.goal]);

  const resetExamProgress = useCallback(
    (examCode) => {
      updateStorage((prev) => {
        const nextExams = { ...prev.exams };
        delete nextExams[examCode];
        return {
          ...prev,
          exams: nextExams,
        };
      });
    },
    [updateStorage]
  );

  return {
    recordAnswer,
    toggleBookmark,
    getExamStats,
    getDailyMetrics,
    setStudyGoal,
    resetExamProgress,
  };
}