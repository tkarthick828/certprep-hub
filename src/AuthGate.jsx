import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, User, AlertCircle, CheckCircle2, X } from 'lucide-react';

// false = public website front door (recommended for AdSense) with login required to take tests or post
// true  = lock the entire site behind a full-screen login wall
export const LOCK_ENTIRE_APP = false;

export default function AuthGate({ supabase, children }) {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingAuth(false);
      if (nextSession?.user) {
        setAuthModalOpen(false);
        setErrorMsg('');
        setInfoMsg('');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Run any queued action (like starting a quiz) immediately after login completes
  useEffect(() => {
    if (session?.user && pendingAction) {
      const fn = pendingAction;
      setPendingAction(null);
      fn();
    }
  }, [session, pendingAction]);

  const requireAuth = (callback = null) => {
    if (session?.user) {
      if (typeof callback === 'function') callback();
      return true;
    }
    if (typeof callback === 'function') {
      setPendingAction(() => callback);
    }
    setErrorMsg('');
    setInfoMsg('');
    setAuthModalOpen(true);
    return false;
  };

  const handleGoogleSSO = async () => {
    if (!supabase) return;
    setErrorMsg('');
    setInfoMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setErrorMsg(error.message);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfoMsg('Password reset link sent. Check your inbox.');
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const displayName = fullName.trim() || email.split('@')[0];
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: displayName } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfoMsg('Account created! Check your inbox to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const renderAuthCard = (isModal = false) => (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative max-w-md w-full mx-auto bg-white border border-stone-200 rounded-2xl shadow-lg p-6 space-y-5"
    >
      {isModal && (
        <button
          type="button"
          onClick={() => {
            setAuthModalOpen(false);
            setPendingAction(null);
          }}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          aria-label="Close sign-in dialog"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 mb-1">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Sign in to CertPrep Hub</h2>
        <p className="text-xs text-stone-500">
          Save your domain mastery progress, review missed questions, and participate in the forum.
        </p>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSSO}
        className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm border border-stone-300 rounded-xl py-2.5 px-4 transition"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-stone-200 w-full" />
        <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-stone-400">
          or with email
        </span>
        <div className="border-t border-stone-200 w-full" />
      </div>

      {mode !== 'reset' && (
        <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-1.5 rounded-lg transition ${
              mode === 'signin' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-1.5 rounded-lg transition ${
              mode === 'signup' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{infoMsg}</span>
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {mode !== 'reset' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-stone-700">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="text-[11px] text-emerald-700 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl transition"
        >
          {submitting
            ? 'Please wait...'
            : mode === 'signup'
            ? 'Create Free Account'
            : mode === 'reset'
            ? 'Send Reset Link'
            : 'Sign In'}
        </button>

        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => setMode('signin')}
            className="w-full text-xs text-stone-500 hover:text-stone-800 pt-1"
          >
            Back to Sign In
          </button>
        )}
      </form>
    </div>
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
        Loading CertPrep Hub...
      </div>
    );
  }

  if (LOCK_ENTIRE_APP && !session?.user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center px-4 py-10">
        {renderAuthCard(false)}
      </div>
    );
  }

  return (
    <>
      {typeof children === 'function'
        ? children({
            user: session?.user ?? null,
            requireAuth,
            signOut: handleSignOut,
          })
        : children}

      {authModalOpen && (
        <div
          onClick={() => {
            setAuthModalOpen(false);
            setPendingAction(null);
          }}
          className="fixed inset-0 z-50 bg-stone-900/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          {renderAuthCard(true)}
        </div>
      )}
    </>
  );
}