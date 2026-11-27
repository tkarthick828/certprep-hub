import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Clock, Award, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Flag, Hash, Layers,
  ArrowLeft, RotateCcw, AlertCircle, Grid,
  Bookmark, Target, Sparkles, LogIn, LogOut,
  BookOpenCheck, CheckSquare, User, Search,
  ShieldCheck, ExternalLink, Flame, Calendar,
  Share2, Check, Keyboard, Scale
} from 'lucide-react';
import { supabase } from './supabaseClient';
import AuthGate from './AuthGate';
import ForumTab from './ForumTab';
import StudyGuidesTab from './StudyGuidesTab';
import CompareTab from './CompareTab';
import ProfileTab from './ProfileTab';
import FooterPolicies from './FooterPolicies';
import { useStudyProgress, getQuestionKey } from './useStudyProgress';

function CertPrepWorkspace({ user, requireAuth, signOut }) {
  const [activeTab, setActiveTab] = useState('certs'); // 'certs' | 'guides' | 'compare' | 'forum' | 'profile'
  const [catalog, setCatalog] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [practiceFilter, setPracticeFilter] = useState('All'); // 'All' | 'WEAK' | 'MISSED' | 'BOOKMARKED' | domainName
  const [practiceCount, setPracticeCount] = useState('10'); // '10' | '20' | '30' | '50' | 'ALL'
  const [loadingQs, setLoadingQs] = useState(false);

  // Goal Editor State (Logged-in sidebar)
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalCertId, setGoalCertId] = useState('ccdv-f');
  const [goalDate, setGoalDate] = useState('');
  const [goalDaily, setGoalDaily] = useState('15');

  // Quiz Session State
  const [mode, setMode] = useState(null); // null | 'practice' | 'exam' | 'report'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [copiedScore, setCopiedScore] = useState(false);

  const latestAnswersRef = useRef({});
  latestAnswersRef.current = answers;

  const {
    recordAnswer,
    toggleBookmark,
    getExamStats,
    getDailyMetrics,
    setStudyGoal,
    resetExamProgress,
  } = useStudyProgress(user, supabase);

  const dailyMetrics = user ? getDailyMetrics() : null;

  useEffect(() => {
    if (dailyMetrics?.goal) {
      setGoalCertId(dailyMetrics.goal.certId || 'ccdv-f');
      setGoalDate(dailyMetrics.goal.examDate || '');
      setGoalDaily(String(dailyMetrics.goal.dailyTarget || 15));
    }
  }, [dailyMetrics?.goal?.certId, dailyMetrics?.goal?.examDate, dailyMetrics?.goal?.dailyTarget]);

  // Automatically leave My Profile if the user signs out
  useEffect(() => {
    if (!user && activeTab === 'profile') {
      setActiveTab('certs');
    }
  }, [user, activeTab]);

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((res) => res.json())
      .then((data) => setCatalog(data))
      .catch((err) => console.error('Failed to load catalog:', err));
  }, []);

  const completeSessionAndSave = (qs, ansMap, cert) => {
    if (!cert) return;
    qs.forEach((q, idx) => {
      if (ansMap[q.id] !== undefined) {
        const isRight = q.correctAnswers.includes(ansMap[q.id]);
        recordAnswer(cert.id, q, isRight, idx);
      }
    });
    setConfirmFinish(false);
    setCopiedScore(false);
    setMode('report');
  };

  useEffect(() => {
    if (mode !== 'exam' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          completeSessionAndSave(sessionQuestions, latestAnswersRef.current, selectedCert);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, sessionQuestions, selectedCert]);

  const handleSelectOption = (q, optId) => {
    if (mode === 'practice' && revealed[q.id]) return;
    setAnswers((prev) => ({ ...prev, [q.id]: optId }));
    if (mode === 'practice') {
      setRevealed((prev) => ({ ...prev, [q.id]: true }));
      const isRight = q.correctAnswers.includes(optId);
      recordAnswer(selectedCert.id, q, isRight, currentIndex);
    }
  };

  // Desktop Keyboard Shortcuts during active Practice / Timed Exam
  useEffect(() => {
    if ((mode !== 'practice' && mode !== 'exam') || confirmFinish) return;
    const activeQ = sessionQuestions[currentIndex];
    if (!activeQ || !selectedCert) return;

    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const optionMap = { a: 0, '1': 0, b: 1, '2': 1, c: 2, '3': 2, d: 3, '4': 3 };

      if (key in optionMap) {
        const opt = activeQ.options?.[optionMap[key]];
        if (opt) {
          e.preventDefault();
          handleSelectOption(activeQ, opt.id);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < sessionQuestions.length - 1) {
          e.preventDefault();
          setCurrentIndex((i) => i + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex((i) => i - 1);
        }
      } else if (key === 's') {
        e.preventDefault();
        toggleBookmark(selectedCert.id, activeQ, currentIndex);
      } else if (key === 'f') {
        e.preventDefault();
        setFlagged((p) => ({ ...p, [activeQ.id]: !p[activeQ.id] }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, confirmFinish, sessionQuestions, currentIndex, selectedCert, revealed]);

  const openBlueprint = async (cert) => {
    setActiveTab('certs');
    setSelectedCert(cert);
    setMode(null);
    setPracticeFilter('All');
    setConfirmFinish(false);
    setLoadingQs(true);
    try {
      const res = await fetch(`/data/${cert.id}.json`);
      if (!res.ok) throw new Error('Not generated yet');
      const data = await res.json();
      setAllQuestions(data.questions || []);
    } catch {
      setAllQuestions([]);
    } finally {
      setLoadingQs(false);
    }
  };

  // Unbiased Fisher-Yates shuffle
  const shuffleArray = (items) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Stratified domain sampling so Timed Exam matches exact official examQuestionCount
  const buildExamSet = (bank, cert) => {
    if (bank.length <= cert.examQuestionCount) {
      return shuffleArray(bank);
    }

    const picked = [];
    const usedIds = new Set();

    cert.domains.forEach((dom) => {
      const targetForDomain = Math.round((dom.weight / 100) * cert.examQuestionCount);
      const pool = shuffleArray(bank.filter((q) => q.domain === dom.name));

      for (const q of pool.slice(0, targetForDomain)) {
        picked.push(q);
        usedIds.add(q.id);
      }
    });

    if (picked.length < cert.examQuestionCount) {
      const remaining = shuffleArray(bank.filter((q) => !usedIds.has(q.id)));
      picked.push(...remaining.slice(0, cert.examQuestionCount - picked.length));
    }

    return shuffleArray(picked.slice(0, cert.examQuestionCount));
  };

  const getFilteredPool = (filterKey, stats) => {
    if (filterKey === 'All') return allQuestions;
    if (filterKey === 'WEAK') {
      const weakSet = new Set(stats.weakDomains);
      return allQuestions.filter((q) => weakSet.has(q.domain));
    }
    if (filterKey === 'MISSED') {
      const missedSet = new Set(stats.missedIds);
      return allQuestions.filter((q, idx) => missedSet.has(getQuestionKey(q, idx)));
    }
    if (filterKey === 'BOOKMARKED') {
      const bookmarkedSet = new Set(stats.bookmarkedIds);
      return allQuestions.filter((q, idx) => bookmarkedSet.has(getQuestionKey(q, idx)));
    }
    return allQuestions.filter((q) => q.domain === filterKey);
  };

  const launchSession = (chosenMode, overrideFilter = null) => {
    const activeFilter = overrideFilter ?? practiceFilter;
    if (overrideFilter) setPracticeFilter(overrideFilter);

    setAnswers({});
    setRevealed({});
    setFlagged({});
    setCurrentIndex(0);
    setShowGrid(false);
    setConfirmFinish(false);
    setCopiedScore(false);

    if (chosenMode === 'exam') {
      const examSet = buildExamSet(allQuestions, selectedCert);
      setSessionQuestions(examSet);
      const ratio = examSet.length / selectedCert.examQuestionCount;
      const calcSeconds = Math.max(300, Math.round(selectedCert.durationMinutes * 60 * ratio));
      setSecondsLeft(calcSeconds);
    } else {
      const stats = getExamStats(selectedCert.id, allQuestions);
      const filtered = shuffleArray(getFilteredPool(activeFilter, stats));
      const limit =
        practiceCount === 'ALL'
          ? filtered.length
          : Math.min(Number(practiceCount), filtered.length);
      setSessionQuestions(filtered.slice(0, limit));
    }

    setMode(chosenMode);
  };

  const startSession = (chosenMode, overrideFilter = null) => {
    requireAuth(() => launchSession(chosenMode, overrideFilter));
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    setStudyGoal({
      certId: goalCertId,
      examDate: goalDate,
      dailyTarget: Math.max(5, Math.min(100, Number(goalDaily) || 15)),
    });
    setEditingGoal(false);
  };

  const categories = ['All', 'Cloud', 'Claude & AI', 'Security'];
  const filteredCatalog = catalog.filter((c) => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.provider.toLowerCase().includes(q) ||
      c.hashtag.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Aggregate Readiness Across All Catalog Exams (used only when logged in)
  const aggregateStats = user
    ? catalog.reduce(
        (acc, cert) => {
          const st = getExamStats(cert.id);
          acc.attempted += st.totalAttempted;
          acc.correct += st.totalCorrect;
          acc.missed += st.missedIds.length;
          acc.bookmarked += st.bookmarkedIds.length;
          return acc;
        },
        { attempted: 0, correct: 0, missed: 0, bookmarked: 0 }
      )
    : { attempted: 0, correct: 0, missed: 0, bookmarked: 0 };

  const overallAccuracy =
    aggregateStats.attempted > 0
      ? Math.round((aggregateStats.correct / aggregateStats.attempted) * 100)
      : 0;

  const computeReport = () => {
    let correct = 0;
    let attempted = 0;
    const domainStats = {};
    selectedCert.domains.forEach((d) => {
      domainStats[d.name] = { total: 0, attempted: 0, correct: 0, weight: d.weight };
    });

    sessionQuestions.forEach((q) => {
      const userChoice = answers[q.id];
      const wasAnswered = userChoice !== undefined;
      const isRight = wasAnswered && q.correctAnswers.includes(userChoice);
      if (wasAnswered) attempted += 1;
      if (isRight) correct += 1;

      if (!domainStats[q.domain]) {
        domainStats[q.domain] = { total: 0, attempted: 0, correct: 0, weight: 0 };
      }
      domainStats[q.domain].total += 1;
      if (wasAnswered) domainStats[q.domain].attempted += 1;
      if (isRight) domainStats[q.domain].correct += 1;
    });

    const total = sessionQuestions.length;
    const scoreBase = mode === 'practice' && attempted > 0 ? attempted : total;
    const pct = scoreBase ? Math.round((correct / scoreBase) * 100) : 0;

    let scaledEstimate = null;
    let passed = pct >= 70;
    if (selectedCert.scoringType.includes('100–1000')) {
      scaledEstimate = 100 + Math.round((pct / 100) * 900);
      const passThreshold = selectedCert.passMarkDisplay.includes('720') ? 720 : 700;
      passed = scaledEstimate >= passThreshold;
    } else if (selectedCert.scoringType.includes('100–900')) {
      scaledEstimate = 100 + Math.round((pct / 100) * 800);
      passed = scaledEstimate >= 750;
    }

    return { correct, attempted, total, pct, scaledEstimate, passed, domainStats };
  };

  const handleCopyScorecard = async (report) => {
    const denom = report.attempted > 0 ? report.attempted : report.total;
    const summary = [
      `CertPrep Hub — ${selectedCert.title} (${selectedCert.code})`,
      `Status: ${report.passed ? 'BENCHMARK PASSED' : 'PRACTICE IN PROGRESS'}`,
      `Score: ${report.pct}% (${report.correct}/${denom})${
        report.scaledEstimate ? ` • Est. Scaled Score: ${report.scaledEstimate}` : ''
      }`,
      `Practice free at: ${window.location.origin}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopiedScore(true);
      setTimeout(() => setCopiedScore(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const currentStats = selectedCert
    ? getExamStats(selectedCert.id, allQuestions)
    : null;
  const practicePool =
    selectedCert && currentStats ? getFilteredPool(practiceFilter, currentStats) : [];
  const effectivePracticeCount =
    practiceCount === 'ALL'
      ? practicePool.length
      : Math.min(Number(practiceCount), practicePool.length);

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const completedCerts =
    user && Array.isArray(user.user_metadata?.completed_certs)
      ? user.user_metadata.completed_certs
      : [];
  const targetCertObj = dailyMetrics?.goal?.certId
    ? catalog.find((c) => c.id === dailyMetrics.goal.certId)
    : null;

  // Unified styling for all top navigation menu tabs
 // Unified styling for all top navigation menu tabs
  const navTabClass = (tabKey) =>
    `px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer focus:outline-none ${
      activeTab === tabKey
        ? 'bg-white text-emerald-950 font-bold shadow-xs'
        : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-[#EFECE6] text-stone-900 font-sans flex flex-col">
      {/* Deep Forest Emerald Top Navigation Bar */}
      {/* Deep Forest Emerald Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-emerald-950 text-white border-b border-emerald-900 px-4 sm:px-6 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 shrink-0">
            <div
              onClick={() => {
                setSelectedCert(null);
                setMode(null);
                setActiveTab('certs');
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="bg-emerald-500 text-emerald-950 p-1.5 rounded-xl shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base leading-tight text-white block tracking-tight">
                  CertPrep Hub
                </span>
                <span className="text-[11px] text-emerald-300/90 block">
                  Cloud, AI & Security Exam Portal
                </span>
              </div>
            </div>

            {/* Compact Desktop Header Search */}
            <div className="hidden md:flex items-center relative w-44 xl:w-56">
              <Search className="w-3.5 h-3.5 text-emerald-300/80 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'certs' || selectedCert) {
                    setActiveTab('certs');
                    setSelectedCert(null);
                    setMode(null);
                  }
                }}
                placeholder="Search exams..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-emerald-900/90 border border-emerald-800 text-white placeholder-emerald-300/70 rounded-lg focus:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Unified Single-Row Menu Bar */}
            <nav className="flex bg-emerald-900/90 border border-emerald-800/90 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => {
                  setActiveTab('certs');
                  setSelectedCert(null);
                  setMode(null);
                }}
                className={navTabClass('certs')}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certifications</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('guides');
                  setSelectedCert(null);
                  setMode(null);
                }}
                className={navTabClass('guides')}
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Study Guides</span>
                <span className="sm:hidden">Guides</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('compare');
                  setSelectedCert(null);
                  setMode(null);
                }}
                className={navTabClass('compare')}
              >
                <Scale className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('forum');
                  setSelectedCert(null);
                  setMode(null);
                }}
                className={navTabClass('forum')}
              >
                <Hash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guidance Forum</span>
                <span className="sm:hidden">Forum</span>
              </button>

              {/* My Profile Tab: Shown ONLY when logged in */}
              {user && (
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setSelectedCert(null);
                    setMode(null);
                  }}
                  className={navTabClass('profile')}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Profile</span>
                  {completedCerts.length > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeTab === 'profile'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-700/80 text-emerald-100'
                      }`}
                    >
                      {completedCerts.length}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {user ? (
              <div className="flex items-center gap-2 pl-2.5 border-l border-emerald-800 text-xs shrink-0">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setSelectedCert(null);
                    setMode(null);
                  }}
                  className="hidden xl:inline font-medium text-emerald-100 hover:text-white max-w-[110px] truncate focus:outline-none"
                  title={displayName}
                >
                  {displayName}
                </button>
                <button
                  onClick={signOut}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-900/90 border border-emerald-800 text-emerald-100 hover:bg-emerald-800 hover:text-white flex items-center gap-1 font-medium whitespace-nowrap transition focus:outline-none"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => requireAuth()}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition shadow-xs focus:outline-none"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-14 flex-1">
        {/* FULL-WIDTH WEBSITE CATALOG PORTAL */}
        {activeTab === 'certs' && !selectedCert && (
          <div className="space-y-6">
            {/* Rich Emerald-Teal Gradient Hero Banner */}
            <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-emerald-800">
              <div className="grid lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-emerald-950/60 text-amber-300 border border-emerald-700/80">
                    2026 Blueprint-Weighted Exam Platform
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Master Cloud, AI & Security Certifications with Scenario Practice
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                    Train with 1,167 original blueprint-weighted scenarios, timed exam simulations, quick-revision concept cards, and community pass debriefs.
                  </p>

                  {/* Search Bar */}
                  <div className="pt-1 max-w-md relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a certification (e.g., CCDV-F, SAA-C03, Azure)..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white text-stone-900 placeholder-stone-400 border border-emerald-700 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>

                {/* Right Translucent Glass Snapshot Card */}
                <div className="lg:col-span-5 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {user ? `${displayName}'s Readiness Overview` : 'Platform Highlights'}
                    </span>
                    {user && dailyMetrics ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full">
                        <Flame className="w-3 h-3 text-amber-900 fill-amber-700" />
                        {dailyMetrics.streak}d Streak
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-200">
                        9 Active Tracks
                      </span>
                    )}
                  </div>

                  {user ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-emerald-300">
                          {aggregateStats.attempted > 0 ? `${overallAccuracy}%` : '—'}
                        </p>
                        <p className="text-[11px] text-emerald-100/80">Avg Accuracy</p>
                      </div>
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-white">
                          {dailyMetrics?.todayCount || 0}/{dailyMetrics?.dailyTarget || 15}
                        </p>
                        <p className="text-[11px] text-emerald-100/80">Today's Goal</p>
                      </div>
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-amber-300">
                          {completedCerts.length}
                        </p>
                        <p className="text-[11px] text-emerald-100/80">Earned Certs</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-emerald-300">9</p>
                        <p className="text-[11px] text-emerald-100/80">Exam Tracks</p>
                      </div>
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-white">1,167</p>
                        <p className="text-[11px] text-emerald-100/80">Original Qs</p>
                      </div>
                      <div className="bg-emerald-950/60 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-lg sm:text-xl font-extrabold text-amber-300">100%</p>
                        <p className="text-[11px] text-emerald-100/80">Free Access</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Two-Column Desktop Portal: Left Sidebar (3 cols) + Exam Grid (9 cols) */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Left Desktop Sidebar with Unified Dark-Emerald Panel Headers */}
              <aside className="lg:col-span-3 space-y-4">
                <div className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-emerald-900 text-white px-4 py-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider">
                      Filter by Track
                    </h2>
                  </div>
                  <div className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto">
                    {categories.map((cat) => {
                      const count =
                        cat === 'All'
                          ? catalog.length
                          : catalog.filter((c) => c.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                            selectedCategory === cat
                              ? 'bg-emerald-700 text-white font-semibold shadow-2xs'
                              : 'bg-stone-50 text-stone-700 hover:bg-emerald-50 hover:text-emerald-900'
                          }`}
                        >
                          <span>{cat}</span>
                          <span
                            className={`ml-2 text-[11px] px-1.5 py-0.2 rounded-full ${
                              selectedCategory === cat
                                ? 'bg-emerald-900 text-emerald-100'
                                : 'bg-stone-200/80 text-stone-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Personal Widgets: Shown ONLY when logged in */}
                {user && dailyMetrics ? (
                  <>
                    {/* Exam Countdown & Daily Target Card */}
                    <div className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Exam Target & Goal
                        </h3>
                        <button
                          onClick={() => setEditingGoal((v) => !v)}
                          className="text-[11px] font-semibold text-amber-300 hover:underline"
                        >
                          {editingGoal ? 'Cancel' : dailyMetrics.goal ? 'Edit' : '+ Set'}
                        </button>
                      </div>

                      <div className="p-4">
                        {editingGoal ? (
                          <form onSubmit={handleSaveGoal} className="space-y-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                                Target Exam
                              </label>
                              <select
                                value={goalCertId}
                                onChange={(e) => setGoalCertId(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50"
                              >
                                {catalog.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.code} — {c.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                                Exam Date (Optional)
                              </label>
                              <input
                                type="date"
                                value={goalDate}
                                onChange={(e) => setGoalDate(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-stone-600 mb-1">
                                Daily Question Goal
                              </label>
                              <select
                                value={goalDaily}
                                onChange={(e) => setGoalDaily(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs bg-stone-50"
                              >
                                <option value="10">10 questions / day</option>
                                <option value="15">15 questions / day</option>
                                <option value="20">20 questions / day</option>
                                <option value="30">30 questions / day</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition"
                            >
                              Save Study Goal
                            </button>
                          </form>
                        ) : (
                          <div className="space-y-3 text-xs">
                            {targetCertObj ? (
                              <div
                                onClick={() => openBlueprint(targetCertObj)}
                                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer hover:border-emerald-400 transition"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-emerald-950">
                                    {targetCertObj.code}
                                  </span>
                                  {dailyMetrics.daysLeft !== null && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                                      <Calendar className="w-3 h-3" /> {dailyMetrics.daysLeft}d left
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-emerald-800 truncate mt-0.5">
                                  {targetCertObj.title}
                                </p>
                              </div>
                            ) : (
                              <p className="text-stone-500 leading-relaxed">
                                Set your target exam date to track a daily countdown.
                              </p>
                            )}

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-stone-600 font-medium">Today's Progress</span>
                                <span className="font-bold text-stone-900">
                                  {dailyMetrics.todayCount} / {dailyMetrics.dailyTarget} Qs
                                </span>
                              </div>
                              <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round(
                                        (dailyMetrics.todayCount / dailyMetrics.dailyTarget) * 100
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Your Study Queue */}
                    <div className="hidden lg:block bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-emerald-900 text-white px-4 py-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Your Study Queue
                        </h3>
                      </div>
                      <div className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-600">Questions Practiced</span>
                          <span className="font-bold text-stone-900">
                            {aggregateStats.attempted}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-600">Mistakes to Review</span>
                          <span className="font-bold text-rose-700">{aggregateStats.missed}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="text-stone-600">Bookmarked Scenarios</span>
                          <span className="font-bold text-amber-700">
                            {aggregateStats.bookmarked}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* My Credentials */}
                    <div className="hidden lg:block bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
                      <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          My Credentials
                        </h3>
                        <button
                          onClick={() => setActiveTab('profile')}
                          className="text-[11px] font-semibold text-amber-300 hover:underline"
                        >
                          Manage
                        </button>
                      </div>

                      <div className="p-4">
                        {completedCerts.length > 0 ? (
                          <div className="space-y-2">
                            {completedCerts.slice(0, 3).map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1"
                              >
                                <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                                  <span className="truncate">{c.name}</span>
                                </div>
                                {c.credlyUrl && (
                                  <a
                                    href={c.credlyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline"
                                  >
                                    Verify Credly <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-stone-500 space-y-2">
                            <p className="leading-relaxed">
                              Showcase your passed exams and Credly badge links on your profile.
                            </p>
                            <button
                              onClick={() => setActiveTab('profile')}
                              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold transition"
                            >
                              + Add Completed Cert
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="hidden lg:block bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-emerald-900 text-white px-4 py-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        How It Works
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <ul className="space-y-2 text-xs text-stone-600 leading-relaxed">
                        <li>
                          <strong className="text-stone-800">1. Review Concepts:</strong> Scan crisp
                          topic cards in Study Guides.
                        </li>
                        <li>
                          <strong className="text-stone-800">2. Practice & Mock:</strong> Choose 10–50
                          practice drills or full timed exams.
                        </li>
                        <li>
                          <strong className="text-stone-800">3. Track Mastery:</strong> Sign in to
                          save domain scores, streaks, and Credly badges.
                        </li>
                      </ul>
                      <button
                        onClick={() => requireAuth()}
                        className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
                      >
                        Sign In to Track Progress
                      </button>
                    </div>
                  </div>
                )}
              </aside>

              {/* Main 3-Column Certification Grid */}
              <div className="lg:col-span-9">
                <div className="flex items-center justify-between mb-3 text-xs text-stone-600">
                  <span>
                    Showing <strong className="text-stone-900">{filteredCatalog.length}</strong>{' '}
                    certification tracks
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-emerald-800 font-semibold hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>

                {filteredCatalog.length === 0 ? (
                  <div className="bg-white border border-stone-300/80 rounded-2xl p-8 text-center text-xs text-stone-500">
                    No certifications matched "{searchQuery}".
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCatalog.map((cert) => {
                      const cardStats = user ? getExamStats(cert.id) : null;
                      return (
                        <div
                          key={cert.id}
                          onClick={() => openBlueprint(cert)}
                          className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden hover:border-emerald-600 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                        >
                          <div>
                            {/* Unified Emerald Accent Top Bar */}
                            <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600" />

                            {/* Unified Tinted Card Header */}
                            <div className="bg-emerald-50/75 border-b border-emerald-100/90 px-4 py-2.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-800 text-white">
                                {cert.provider} • {cert.code}
                              </span>
                              <span className="text-[11px] text-emerald-900/70 font-mono font-medium">
                                {cert.hashtag}
                              </span>
                            </div>

                            <div className="p-4 pb-3">
                              <h2 className="font-bold text-sm text-stone-900 group-hover:text-emerald-900 transition leading-snug mb-3">
                                {cert.title}
                              </h2>

                              {/* Domain Mastery Bar: Shown only when user is logged in */}
                              {user && cardStats && (
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-stone-600 font-medium">
                                      {cardStats.totalAttempted > 0
                                        ? `Mastery: ${cardStats.readiness}% (${cardStats.totalCorrect}/${cardStats.totalAttempted})`
                                        : 'Mastery: Not started'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {cardStats.missedIds.length > 0 && (
                                        <span className="text-rose-700 font-semibold">
                                          {cardStats.missedIds.length} missed
                                        </span>
                                      )}
                                      {cardStats.bookmarkedIds.length > 0 && (
                                        <span className="text-amber-700 font-semibold">
                                          {cardStats.bookmarkedIds.length} saved
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        cardStats.readiness >= 70 ? 'bg-emerald-600' : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${cardStats.readiness}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-stone-50 px-4 py-2.5 border-t border-stone-200/70 flex items-center justify-between text-xs text-stone-600">
                            <span className="font-medium">
                              {cert.examQuestionCount} Qs • {cert.durationMinutes}m
                            </span>
                            <span className="text-emerald-800 font-bold flex items-center group-hover:translate-x-0.5 transition-transform">
                              Open Blueprint <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPARE & ROADMAPS TAB */}
        {activeTab === 'compare' && (
          <div className="max-w-6xl mx-auto">
            <CompareTab catalog={catalog} onSelectCert={openBlueprint} />
          </div>
        )}

        {/* FOCUSED READER CONTAINER FOR BLUEPRINT, QUIZ, REPORT, GUIDES, FORUM & PROFILE */}
        {activeTab !== 'compare' && (
          <div className="max-w-3xl mx-auto">
            {activeTab === 'certs' && selectedCert && !mode && currentStats && (
              <div className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-sm">
                {/* Rich Emerald Blueprint Top Banner */}
                <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setSelectedCert(null)}
                      className="text-xs text-emerald-100 hover:text-white flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Certifications
                    </button>

                    {user && currentStats.totalAttempted > 0 && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Reset mastery stats and missed queue for ${selectedCert.code}?`
                            )
                          ) {
                            resetExamProgress(selectedCert.id);
                          }
                        }}
                        className="text-[11px] text-emerald-200 hover:text-amber-300 transition"
                      >
                        Reset Progress
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-amber-300 border border-emerald-700">
                      {selectedCert.provider} ({selectedCert.code})
                    </span>
                    <span className="text-xs font-mono text-emerald-100 bg-white/10 px-2 py-0.5 rounded">
                      {selectedCert.hashtag}
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {selectedCert.title}
                  </h2>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2 bg-stone-100/80 border border-stone-200 rounded-xl p-3 mb-4 text-center">
                    <div>
                      <p className="text-[11px] text-stone-500">Duration</p>
                      <p className="font-bold text-sm text-stone-900">
                        {selectedCert.durationMinutes} Mins
                      </p>
                    </div>
                    <div className="border-x border-stone-200">
                      <p className="text-[11px] text-stone-500">Exam Sitting</p>
                      <p className="font-bold text-sm text-stone-900">
                        {selectedCert.examQuestionCount} Qs
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-stone-500">Pass Mark</p>
                      <p className="font-bold text-sm text-emerald-800">
                        {selectedCert.passMarkDisplay}
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                    <p className="text-xs font-semibold text-amber-950 mb-0.5">
                      Scoring Method: {selectedCert.scoringType}
                    </p>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      {selectedCert.scoringNote}
                    </p>
                  </div>

                  {/* Domain Weightage + Per-Domain Mastery Breakdown */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-700" />
                        {user
                          ? 'Syllabus Weightage & Your Mastery'
                          : 'Syllabus Weightage & Question Split'}
                      </span>
                      <span className="text-stone-400">{user ? 'Weight • Accuracy' : 'Est. Qs'}</span>
                    </div>

                    <div className="space-y-3">
                      {selectedCert.domains.map((dom) => {
                        const estQs = Math.round((dom.weight / 100) * selectedCert.examQuestionCount);
                        const domProgress = user
                          ? currentStats.domainBreakdown.find((d) => d.domain === dom.name)
                          : null;
                        const acc = domProgress?.accuracy;

                        return (
                          <div key={dom.name} className="text-xs">
                            <div className="flex justify-between items-center gap-2 mb-1">
                              <span className="text-stone-800 font-medium">{dom.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-stone-500">
                                  {dom.weight}% (~{estQs} Qs)
                                </span>
                                {user &&
                                  (acc !== null && acc !== undefined ? (
                                    <span
                                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                        acc >= 70
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {acc}%
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-stone-400">New</span>
                                  ))}
                              </div>
                            </div>
                            <div className="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  user && acc !== null && acc !== undefined
                                    ? acc >= 70
                                      ? 'bg-emerald-600'
                                      : 'bg-amber-500'
                                    : 'bg-emerald-700'
                                }`}
                                style={{
                                  width: `${
                                    user && acc !== null && acc !== undefined ? acc : dom.weight
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {loadingQs ? (
                    <p className="text-center text-xs text-stone-500 py-3">Loading question bank...</p>
                  ) : allQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {/* Smart-Drill Shortcut Pills (Logged-in users) */}
                      {user &&
                        (currentStats.weakDomains.length > 0 ||
                          currentStats.missedIds.length > 0 ||
                          currentStats.bookmarkedIds.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {currentStats.weakDomains.length > 0 && (
                              <button
                                onClick={() => startSession('practice', 'WEAK')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
                              >
                                <Target className="w-3.5 h-3.5 text-amber-700" />
                                Drill Weakest Domains ({getFilteredPool('WEAK', currentStats).length} Qs)
                              </button>
                            )}

                            {currentStats.missedIds.length > 0 && (
                              <button
                                onClick={() => startSession('practice', 'MISSED')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                                Review Mistakes ({currentStats.missedIds.length} Qs)
                              </button>
                            )}

                            {currentStats.bookmarkedIds.length > 0 && (
                              <button
                                onClick={() => startSession('practice', 'BOOKMARKED')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-semibold transition"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                Bookmarked ({currentStats.bookmarkedIds.length} Qs)
                              </button>
                            )}
                          </div>
                        )}

                      {/* Practice Deck & Number of Questions Selectors */}
                      <div className="grid sm:grid-cols-2 gap-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                            Practice Topic / Deck
                          </label>
                          <select
                            value={practiceFilter}
                            onChange={(e) => setPracticeFilter(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-800"
                          >
                            <option value="All">All Domains ({allQuestions.length} Qs)</option>
                            {user && (
                              <>
                                <option value="WEAK">
                                  Weakest Domains (&lt;70%) (
                                  {getFilteredPool('WEAK', currentStats).length} Qs)
                                </option>
                                <option value="MISSED">
                                  Missed Questions Queue ({currentStats.missedIds.length} Qs)
                                </option>
                                <option value="BOOKMARKED">
                                  Bookmarked Questions ({currentStats.bookmarkedIds.length} Qs)
                                </option>
                              </>
                            )}
                            {selectedCert.domains.map((d) => {
                              const count = allQuestions.filter((q) => q.domain === d.name).length;
                              return (
                                <option key={d.name} value={d.name}>
                                  {d.name} ({count} Qs)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                            Number of Questions (Practice)
                          </label>
                          <select
                            value={practiceCount}
                            onChange={(e) => setPracticeCount(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-800"
                          >
                            <option value="10">10 Questions (Quick Drill)</option>
                            <option value="20">20 Questions (Standard Set)</option>
                            <option value="30">30 Questions (Deep Practice)</option>
                            <option value="50">50 Questions (Extended)</option>
                            <option value="ALL">All Questions ({practicePool.length} Qs)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          disabled={effectivePracticeCount === 0}
                          onClick={() => startSession('practice')}
                          className="flex items-center justify-center gap-2 bg-white border-2 border-emerald-700 text-emerald-800 font-bold text-sm py-3 rounded-xl hover:bg-emerald-50 transition disabled:opacity-40"
                        >
                          <BookOpen className="w-4 h-4" /> Practice Mode ({effectivePracticeCount} Qs)
                        </button>
                        <button
                          onClick={() => startSession('exam')}
                          className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl hover:bg-emerald-800 transition shadow-xs"
                        >
                          <Clock className="w-4 h-4" /> Timed Exam (
                          {Math.min(allQuestions.length, selectedCert.examQuestionCount)} Qs)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-100 text-stone-600 text-xs p-3.5 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Run{' '}
                        <code className="bg-white px-1.5 py-0.5 rounded">
                          py pipeline/generate_bank.py --exam {selectedCert.id} --count 130
                        </code>{' '}
                        to populate this question bank.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVE PRACTICE OR TIMED EXAM SESSION */}
            {(mode === 'practice' || mode === 'exam') &&
              sessionQuestions[currentIndex] &&
              currentStats &&
              (() => {
                const q = sessionQuestions[currentIndex];
                const userAns = answers[q.id];
                const isRevealed = mode === 'practice' && revealed[q.id];
                const qKey = getQuestionKey(q, currentIndex);
                const isBookmarked = currentStats.bookmarkedIds.includes(qKey);
                const answeredCount = Object.keys(answers).length;
                const progressPct = Math.round(
                  ((currentIndex + 1) / sessionQuestions.length) * 100
                );

                return (
                  <div className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-sm">
                    {/* Top Progress Strip */}
                    <div className="w-full bg-stone-200 h-1.5">
                      <div
                        className="bg-emerald-600 h-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="p-5">
                      {/* Top Session Bar with Midway Finish Test Button */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            Q {currentIndex + 1} / {sessionQuestions.length}
                          </span>
                          <button
                            onClick={() => setShowGrid((g) => !g)}
                            className="px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-1"
                          >
                            <Grid className="w-3.5 h-3.5" /> Map
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {mode === 'exam' && (
                            <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {formatTime(secondsLeft)}
                            </span>
                          )}

                          <button
                            onClick={() => toggleBookmark(selectedCert.id, q, currentIndex)}
                            className={`p-1.5 rounded-md border transition ${
                              isBookmarked
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'border-stone-200 text-stone-400 hover:text-stone-700'
                            }`}
                            title={
                              isBookmarked
                                ? 'Remove bookmark (Shortcut: S)'
                                : 'Save question to Bookmarks (Shortcut: S)'
                            }
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`}
                            />
                          </button>

                          <button
                            onClick={() => setFlagged((p) => ({ ...p, [q.id]: !p[q.id] }))}
                            className={`p-1.5 rounded-md border transition ${
                              flagged[q.id]
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'border-stone-200 text-stone-400 hover:text-stone-700'
                            }`}
                            title="Flag in current session (Shortcut: F)"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          {/* Midway Finish Test Button */}
                          <button
                            onClick={() => {
                              if (answeredCount === sessionQuestions.length) {
                                completeSessionAndSave(sessionQuestions, answers, selectedCert);
                              } else {
                                setConfirmFinish(true);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-white font-semibold flex items-center gap-1 transition"
                            title="End test now and view your score"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Finish Test</span>
                          </button>
                        </div>
                      </div>

                      {/* Inline Confirmation Banner for Midway Finish */}
                      {confirmFinish && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-amber-950 font-medium">
                            Finish test early? You have answered{' '}
                            <strong>
                              {answeredCount} of {sessionQuestions.length}
                            </strong>{' '}
                            questions.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmFinish(false)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-medium hover:bg-stone-50"
                            >
                              Continue Test
                            </button>
                            <button
                              onClick={() =>
                                completeSessionAndSave(sessionQuestions, answers, selectedCert)
                              }
                              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                            >
                              Yes, Score Now
                            </button>
                          </div>
                        </div>
                      )}

                      {showGrid && (
                        <div className="grid grid-cols-10 gap-1.5 p-3 mb-4 bg-stone-50 border border-stone-200 rounded-xl">
                          {sessionQuestions.map((item, idx) => {
                            const isAnswered = Boolean(answers[item.id]);
                            const isFlag = Boolean(flagged[item.id]);
                            const isCurr = idx === currentIndex;
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setCurrentIndex(idx);
                                  setShowGrid(false);
                                }}
                                className={`h-7 rounded text-[11px] font-semibold border transition ${
                                  isCurr
                                    ? 'ring-2 ring-emerald-700 border-emerald-700 bg-white'
                                    : isFlag
                                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                                    : isAnswered
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-white border-stone-200 text-stone-600'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <span className="inline-block text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2.5 py-0.5 rounded mb-3">
                        {q.domain}
                      </span>

                      <p className="text-sm font-medium text-stone-900 leading-relaxed mb-5">
                        {q.question}
                      </p>

                      <div className="space-y-2.5 mb-5">
                        {q.options.map((opt) => {
                          const isSelected = userAns === opt.id;
                          const isCorrect = q.correctAnswers.includes(opt.id);

                          let cardStyle =
                            'border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/30 bg-white';
                          if (isRevealed) {
                            if (isCorrect)
                              cardStyle = 'border-emerald-600 bg-emerald-50/80 text-emerald-950';
                            else if (isSelected)
                              cardStyle = 'border-rose-400 bg-rose-50/80 text-rose-950';
                            else cardStyle = 'border-stone-200 opacity-60';
                          } else if (isSelected) {
                            cardStyle = 'border-emerald-700 bg-emerald-50/70';
                          }

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectOption(q, opt.id)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs leading-relaxed transition flex items-start gap-3 ${cardStyle}`}
                            >
                              <span className="font-bold shrink-0 mt-0.5">{opt.id}.</span>
                              <span className="flex-1">{opt.text}</span>
                              {isRevealed && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                              )}
                              {isRevealed && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isRevealed && (
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-5 text-xs space-y-2">
                          <p className="font-bold text-emerald-800">
                            Why {q.correctAnswers.join(', ')} is correct:
                          </p>
                          <p className="text-stone-700 leading-relaxed">{q.explanation}</p>
                          {q.wrongOptionNotes && (
                            <div className="pt-2 border-t border-stone-200/80 space-y-1 text-stone-600">
                              <p className="font-semibold text-stone-700">Why other options fail:</p>
                              {Object.entries(q.wrongOptionNotes).map(([key, note]) => (
                                <p key={key}>
                                  <strong>{key}:</strong> {note}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                        <button
                          disabled={currentIndex === 0}
                          onClick={() => setCurrentIndex((i) => i - 1)}
                          className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium disabled:opacity-40 flex items-center gap-1 hover:bg-stone-50"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </button>

                        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400">
                          <Keyboard className="w-3.5 h-3.5" />
                          Keys:{' '}
                          <kbd className="px-1 py-0.2 bg-stone-100 rounded border border-stone-200">
                            A–D
                          </kbd>{' '}
                          Answer •{' '}
                          <kbd className="px-1 py-0.2 bg-stone-100 rounded border border-stone-200">
                            ←/→
                          </kbd>{' '}
                          Nav •{' '}
                          <kbd className="px-1 py-0.2 bg-stone-100 rounded border border-stone-200">
                            S
                          </kbd>{' '}
                          Save
                        </span>

                        {currentIndex < sessionQuestions.length - 1 ? (
                          <button
                            onClick={() => setCurrentIndex((i) => i + 1)}
                            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              completeSessionAndSave(sessionQuestions, answers, selectedCert)
                            }
                            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                          >
                            Finish & View Score
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* SCORE REPORT */}
            {mode === 'report' &&
              (() => {
                const report = computeReport();
                return (
                  <div className="bg-white border border-stone-300/80 rounded-2xl p-5 shadow-sm">
                    <div className="text-center pb-5 mb-5 border-b border-stone-100">
                      <span
                        className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${
                          report.passed
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {report.passed ? 'BENCHMARK PASSED' : 'NEEDS MORE PRACTICE'}
                      </span>
                      <h2 className="text-2xl font-extrabold text-stone-900">
                        {report.scaledEstimate ? `Est. ${report.scaledEstimate} ` : ''}(
                        {report.pct}% • {report.correct}/
                        {report.attempted > 0 ? report.attempted : report.total} answered)
                      </h2>
                      <p className="text-xs text-stone-500 mt-1">
                        Attempted {report.attempted} of {report.total} questions • Target Pass Mark:{' '}
                        {selectedCert.passMarkDisplay}
                      </p>

                      <div className="mt-3">
                        <button
                          onClick={() => handleCopyScorecard(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold transition"
                        >
                          {copiedScore ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Copied Scorecard!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Copy / Share Scorecard</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-stone-700 mb-3">Domain-Wise Accuracy</h3>
                    <div className="space-y-3 mb-6">
                      {Object.entries(report.domainStats).map(([domName, st]) => {
                        const denom = st.attempted > 0 ? st.attempted : st.total;
                        const dPct = denom ? Math.round((st.correct / denom) * 100) : 0;
                        return (
                          <div key={domName} className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-stone-700 font-medium">{domName}</span>
                              <span className="font-semibold">
                                {st.correct}/{denom} ({dPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-stone-200/70 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  dPct >= 70 ? 'bg-emerald-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${dPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        onClick={() => setMode(null)}
                        className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        Back to Blueprint
                      </button>
                      <button
                        onClick={() => {
                          const allRevealed = {};
                          sessionQuestions.forEach((q) => {
                            allRevealed[q.id] = true;
                          });
                          setRevealed(allRevealed);
                          setCurrentIndex(0);
                          setMode('practice');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Review Explanations
                      </button>
                      {currentStats?.missedIds.length > 0 && (
                        <button
                          onClick={() => startSession('practice', 'MISSED')}
                          className="flex-1 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Drill Mistakes (
                          {currentStats.missedIds.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* INTERACTIVE STUDY GUIDES TAB */}
            {activeTab === 'guides' && (
              <StudyGuidesTab catalog={catalog} onSelectCert={openBlueprint} />
            )}

            {/* GUIDANCE FORUM TAB */}
            {activeTab === 'forum' && (
              <ForumTab catalog={catalog} currentUser={user} requireAuth={requireAuth} />
            )}

            {/* PROFILE MANAGEMENT TAB (Only rendered when logged in) */}
            {user && activeTab === 'profile' && (
              <ProfileTab user={user} catalog={catalog} onRequireAuth={requireAuth} />
            )}
          </div>
        )}
      </main>
      <FooterPolicies />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate supabase={supabase}>
      {({ user, requireAuth, signOut }) => (
        <CertPrepWorkspace user={user} requireAuth={requireAuth} signOut={signOut} />
      )}
    </AuthGate>
  );
}