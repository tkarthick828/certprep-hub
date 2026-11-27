import React, { useState, useEffect } from 'react';
import {
  BookOpen, Clock, Award, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Flag, Hash, Layers,
  ArrowLeft, RotateCcw, AlertCircle, Grid,
  Bookmark, Target, Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';
import AuthGate from './AuthGate';
import ForumTab from './ForumTab';
import FooterPolicies from './FooterPolicies';
import { useStudyProgress, getQuestionKey } from './useStudyProgress';

function CertPrepWorkspace({ user }) {
  const [activeTab, setActiveTab] = useState('certs');
  const [catalog, setCatalog] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCert, setSelectedCert] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [practiceFilter, setPracticeFilter] = useState('All'); // 'All' | 'WEAK' | 'MISSED' | 'BOOKMARKED' | domainName
  const [loadingQs, setLoadingQs] = useState(false);

  // Quiz Session State
  const [mode, setMode] = useState(null); // null | 'practice' | 'exam' | 'report'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [flagged, setFlagged] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  const {
    recordAnswer,
    toggleBookmark,
    getExamStats,
    resetExamProgress,
  } = useStudyProgress(user?.id);

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
    setMode('report');
  };

  useEffect(() => {
    if (mode !== 'exam' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          completeSessionAndSave(sessionQuestions, answers, selectedCert);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, secondsLeft, sessionQuestions, answers, selectedCert]);

  const openBlueprint = async (cert) => {
    setSelectedCert(cert);
    setMode(null);
    setPracticeFilter('All');
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

  // Stratified domain sampling so Timed Exam matches exact official examQuestionCount
  const buildExamSet = (bank, cert) => {
    if (bank.length <= cert.examQuestionCount) {
      return [...bank].sort(() => Math.random() - 0.5);
    }

    const picked = [];
    const usedIds = new Set();

    cert.domains.forEach((dom) => {
      const targetForDomain = Math.round((dom.weight / 100) * cert.examQuestionCount);
      const pool = bank
        .filter((q) => q.domain === dom.name)
        .sort(() => Math.random() - 0.5);

      for (const q of pool.slice(0, targetForDomain)) {
        picked.push(q);
        usedIds.add(q.id);
      }
    });

    if (picked.length < cert.examQuestionCount) {
      const remaining = bank
        .filter((q) => !usedIds.has(q.id))
        .sort(() => Math.random() - 0.5);
      picked.push(...remaining.slice(0, cert.examQuestionCount - picked.length));
    }

    return picked.slice(0, cert.examQuestionCount).sort(() => Math.random() - 0.5);
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

  const startSession = (chosenMode, overrideFilter = null) => {
    const activeFilter = overrideFilter ?? practiceFilter;
    if (overrideFilter) setPracticeFilter(overrideFilter);

    setAnswers({});
    setRevealed({});
    setFlagged({});
    setCurrentIndex(0);
    setShowGrid(false);

    if (chosenMode === 'exam') {
      const examSet = buildExamSet(allQuestions, selectedCert);
      setSessionQuestions(examSet);
      const ratio = examSet.length / selectedCert.examQuestionCount;
      const calcSeconds = Math.max(300, Math.round(selectedCert.durationMinutes * 60 * ratio));
      setSecondsLeft(calcSeconds);
    } else {
      const stats = getExamStats(selectedCert.id, allQuestions);
      const filtered = getFilteredPool(activeFilter, stats);
      setSessionQuestions(filtered);
    }

    setMode(chosenMode);
  };

  const handleSelectOption = (q, optId) => {
    if (mode === 'practice' && revealed[q.id]) return;
    setAnswers((prev) => ({ ...prev, [q.id]: optId }));
    if (mode === 'practice') {
      setRevealed((prev) => ({ ...prev, [q.id]: true }));
      const isRight = q.correctAnswers.includes(optId);
      recordAnswer(selectedCert.id, q, isRight, currentIndex);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const categories = ['All', 'Cloud', 'Claude & AI', 'Security'];
  const filteredCatalog =
    selectedCategory === 'All'
      ? catalog
      : catalog.filter((c) => c.category === selectedCategory);

  const computeReport = () => {
    let correct = 0;
    const domainStats = {};
    selectedCert.domains.forEach((d) => {
      domainStats[d.name] = { total: 0, correct: 0, weight: d.weight };
    });

    sessionQuestions.forEach((q) => {
      const isRight = q.correctAnswers.includes(answers[q.id]);
      if (isRight) correct += 1;
      if (!domainStats[q.domain]) {
        domainStats[q.domain] = { total: 0, correct: 0, weight: 0 };
      }
      domainStats[q.domain].total += 1;
      if (isRight) domainStats[q.domain].correct += 1;
    });

    const total = sessionQuestions.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;

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

    return { correct, total, pct, scaledEstimate, passed, domainStats };
  };

  const currentStats = selectedCert
    ? getExamStats(selectedCert.id, allQuestions)
    : null;
  const practicePool =
    selectedCert && currentStats ? getFilteredPool(practiceFilter, currentStats) : [];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div
            onClick={() => {
              setSelectedCert(null);
              setMode(null);
              setActiveTab('certs');
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="bg-emerald-700 text-white p-1.5 rounded-lg shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-stone-900">CertPrep Hub</h1>
              <p className="text-[11px] text-stone-500">Blueprint Practice & Mastery</p>
            </div>
          </div>

          <nav className="flex bg-stone-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => {
                setActiveTab('certs');
                setSelectedCert(null);
                setMode(null);
              }}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'certs'
                  ? 'bg-white text-emerald-800 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Certifications
            </button>
            <button
              onClick={() => {
                setActiveTab('forum');
                setSelectedCert(null);
                setMode(null);
              }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition ${
                activeTab === 'forum'
                  ? 'bg-white text-emerald-800 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5" /> Guidance Forum
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5">
        {activeTab === 'certs' && !selectedCert && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filteredCatalog.map((cert) => {
                const cardStats = getExamStats(cert.id);
                return (
                  <div
                    key={cert.id}
                    onClick={() => openBlueprint(cert)}
                    className="bg-white border border-stone-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-sm transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {cert.provider} • {cert.code}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">{cert.hashtag}</span>
                      </div>
                      <h2 className="font-semibold text-sm text-stone-900 mb-3">{cert.title}</h2>

                      {/* Feature 1 & 2 Card Readiness Indicator */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-stone-500">
                            {cardStats.totalAttempted > 0
                              ? `Mastery: ${cardStats.readiness}% (${cardStats.totalCorrect}/${cardStats.totalAttempted})`
                              : 'Mastery: Not started'}
                          </span>
                          <div className="flex items-center gap-2">
                            {cardStats.missedIds.length > 0 && (
                              <span className="text-rose-700 font-medium">
                                {cardStats.missedIds.length} missed
                              </span>
                            )}
                            {cardStats.bookmarkedIds.length > 0 && (
                              <span className="text-amber-700 font-medium">
                                {cardStats.bookmarkedIds.length} saved
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              cardStats.readiness >= 70 ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${cardStats.readiness}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>
                        {cert.examQuestionCount} Qs • {cert.durationMinutes}m
                      </span>
                      <span className="text-emerald-700 font-semibold flex items-center">
                        Blueprint <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'certs' && selectedCert && !mode && currentStats && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedCert(null)}
                className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Certifications
              </button>

              {currentStats.totalAttempted > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`Reset mastery stats and missed queue for ${selectedCert.code}?`)) {
                      resetExamProgress(selectedCert.id);
                    }
                  }}
                  className="text-[11px] text-stone-400 hover:text-rose-600 transition"
                >
                  Reset Progress
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                {selectedCert.provider} ({selectedCert.code})
              </span>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50/70 px-2 py-0.5 rounded">
                {selectedCert.hashtag}
              </span>
            </div>

            <h2 className="text-lg font-bold text-stone-900 mb-4">{selectedCert.title}</h2>

            <div className="grid grid-cols-3 gap-2 bg-stone-50 border border-stone-200/80 rounded-xl p-3 mb-4 text-center">
              <div>
                <p className="text-[11px] text-stone-500">Duration</p>
                <p className="font-bold text-sm text-stone-800">{selectedCert.durationMinutes} Mins</p>
              </div>
              <div className="border-x border-stone-200">
                <p className="text-[11px] text-stone-500">Exam Sitting</p>
                <p className="font-bold text-sm text-stone-800">{selectedCert.examQuestionCount} Qs</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-500">Pass Mark</p>
                <p className="font-bold text-sm text-emerald-700">{selectedCert.passMarkDisplay}</p>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 mb-5">
              <p className="text-xs font-semibold text-amber-900 mb-0.5">
                Scoring Method: {selectedCert.scoringType}
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">{selectedCert.scoringNote}</p>
            </div>

            {/* Domain Weightage + Per-Domain Mastery Breakdown */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-2.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" /> Syllabus Weightage & Your Mastery
                </span>
                <span className="text-stone-400">Weight • Accuracy</span>
              </div>

              <div className="space-y-3">
                {selectedCert.domains.map((dom) => {
                  const estQs = Math.round((dom.weight / 100) * selectedCert.examQuestionCount);
                  const domProgress = currentStats.domainBreakdown.find(
                    (d) => d.domain === dom.name
                  );
                  const acc = domProgress?.accuracy;

                  return (
                    <div key={dom.name} className="text-xs">
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="text-stone-800 font-medium">{dom.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-stone-500">
                            {dom.weight}% (~{estQs} Qs)
                          </span>
                          {acc !== null && acc !== undefined ? (
                            <span
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                acc >= 70
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {acc}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">New</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            acc !== null && acc !== undefined
                              ? acc >= 70
                                ? 'bg-emerald-600'
                                : 'bg-amber-500'
                              : 'bg-stone-300'
                          }`}
                          style={{
                            width: `${acc !== null && acc !== undefined ? acc : dom.weight}%`,
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
                {/* Quick Smart-Drill Pills (Features 1 & 2) */}
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

                {/* Custom Practice Filter Dropdown */}
                <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs">
                  <span className="text-stone-600 font-medium pl-1">Practice Deck:</span>
                  <select
                    value={practiceFilter}
                    onChange={(e) => setPracticeFilter(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 max-w-[260px]"
                  >
                    <option value="All">All Domains ({allQuestions.length} Qs)</option>
                    <option value="WEAK">
                      Weakest Domains (&lt;70%) ({getFilteredPool('WEAK', currentStats).length} Qs)
                    </option>
                    <option value="MISSED">
                      Missed Questions Queue ({currentStats.missedIds.length} Qs)
                    </option>
                    <option value="BOOKMARKED">
                      Bookmarked Questions ({currentStats.bookmarkedIds.length} Qs)
                    </option>
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

                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    disabled={practicePool.length === 0}
                    onClick={() => startSession('practice')}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-emerald-700 text-emerald-800 font-semibold text-sm py-3 rounded-xl hover:bg-emerald-50 transition disabled:opacity-40"
                  >
                    <BookOpen className="w-4 h-4" /> Practice Mode ({practicePool.length} Qs)
                  </button>
                  <button
                    onClick={() => startSession('exam')}
                    className="flex items-center justify-center gap-2 bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl hover:bg-emerald-800 transition"
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
        )}

        {(mode === 'practice' || mode === 'exam') &&
          sessionQuestions[currentIndex] &&
          currentStats &&
          (() => {
            const q = sessionQuestions[currentIndex];
            const userAns = answers[q.id];
            const isRevealed = mode === 'practice' && revealed[q.id];
            const qKey = getQuestionKey(q, currentIndex);
            const isBookmarked = currentStats.bookmarkedIds.includes(qKey);

            return (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700">
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
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {formatTime(secondsLeft)}
                      </span>
                    )}

                    {/* Feature 2: Bookmark Button */}
                    <button
                      onClick={() => toggleBookmark(selectedCert.id, q, currentIndex)}
                      className={`p-1.5 rounded-md border transition ${
                        isBookmarked
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'border-stone-200 text-stone-400 hover:text-stone-700'
                      }`}
                      title={isBookmarked ? 'Remove bookmark' : 'Save question to Bookmarks'}
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
                      title="Flag in current session"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

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

                <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded mb-3">
                  {q.domain}
                </span>

                <p className="text-sm font-medium text-stone-900 leading-relaxed mb-5">
                  {q.question}
                </p>

                <div className="space-y-2.5 mb-5">
                  {q.options.map((opt) => {
                    const isSelected = userAns === opt.id;
                    const isCorrect = q.correctAnswers.includes(opt.id);

                    let cardStyle = 'border-stone-200 hover:border-emerald-400 bg-white';
                    if (isRevealed) {
                      if (isCorrect)
                        cardStyle = 'border-emerald-600 bg-emerald-50/70 text-emerald-950';
                      else if (isSelected)
                        cardStyle = 'border-rose-400 bg-rose-50/70 text-rose-950';
                      else cardStyle = 'border-stone-200 opacity-60';
                    } else if (isSelected) {
                      cardStyle = 'border-emerald-700 bg-emerald-50/60';
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

                  {currentIndex < sessionQuestions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIndex((i) => i + 1)}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (mode === 'exam') {
                          completeSessionAndSave(sessionQuestions, answers, selectedCert);
                        } else {
                          setMode('report');
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                    >
                      Finish & View Score
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

        {mode === 'report' &&
          (() => {
            const report = computeReport();
            return (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
                <div className="text-center pb-5 mb-5 border-b border-stone-100">
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${
                      report.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.passed ? 'BENCHMARK PASSED' : 'NEEDS MORE PRACTICE'}
                  </span>
                  <h2 className="text-2xl font-extrabold text-stone-900">
                    {report.scaledEstimate ? `Est. ${report.scaledEstimate} ` : ''}({report.pct}% •{' '}
                    {report.correct}/{report.total})
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Target Pass Mark: {selectedCert.passMarkDisplay}
                  </p>
                </div>

                <h3 className="text-xs font-bold text-stone-700 mb-3">Domain-Wise Accuracy</h3>
                <div className="space-y-3 mb-6">
                  {Object.entries(report.domainStats).map(([domName, st]) => {
                    const dPct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
                    return (
                      <div key={domName} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-stone-700 font-medium">{domName}</span>
                          <span className="font-semibold">
                            {st.correct}/{st.total} ({dPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
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
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
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

        {activeTab === 'forum' && <ForumTab catalog={catalog} currentUser={user} />}
      </main>
      <FooterPolicies />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate supabase={supabase}>
      {(user) => <CertPrepWorkspace user={user} />}
    </AuthGate>
  );
}