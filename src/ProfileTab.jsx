import React, { useState, useEffect } from 'react';
import {
  User, Lock, Award, ExternalLink, Plus, Trash2,
  CheckCircle2, AlertCircle, ShieldCheck, Link as LinkIcon, Calendar
} from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ProfileTab({ user, catalog = [], onRequireAuth }) {
  const meta = user?.user_metadata || {};

  // Profile Details State
  const [fullName, setFullName] = useState(meta.full_name || '');
  const [headline, setHeadline] = useState(meta.headline || '');
  const [credlyProfileUrl, setCredlyProfileUrl] = useState(meta.credly_profile_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(meta.linkedin_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Completed Certifications State
  const [completedCerts, setCompletedCerts] = useState(
    Array.isArray(meta.completed_certs) ? meta.completed_certs : []
  );
  const [certName, setCertName] = useState(
    catalog[0] ? `${catalog[0].title} (${catalog[0].code})` : ''
  );
  const [issuer, setIssuer] = useState(catalog[0]?.provider || 'Anthropic');
  const [earnedDate, setEarnedDate] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [credlyBadgeUrl, setCredlyBadgeUrl] = useState('');
  const [savingCert, setSavingCert] = useState(false);

  // Change Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const m = user?.user_metadata || {};
    setFullName(m.full_name || '');
    setHeadline(m.headline || '');
    setCredlyProfileUrl(m.credly_profile_url || '');
    setLinkedinUrl(m.linkedin_url || '');
    setCompletedCerts(Array.isArray(m.completed_certs) ? m.completed_certs : []);
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-900">Sign In to Manage Your Profile</h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Track your earned certifications, link your Credly verification badges, and manage your account password.
        </p>
        <button
          onClick={() => onRequireAuth && onRequireAuth()}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        headline: headline.trim(),
        credly_profile_url: credlyProfileUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
      },
    });

    setSavingProfile(false);
    if (error) {
      setProfileMsg({ type: 'error', text: error.message });
    } else {
      setProfileMsg({ type: 'success', text: 'Profile details updated successfully.' });
    }
  };

  const handleAddCertification = async (e) => {
    e.preventDefault();
    if (!supabase || !certName.trim()) return;
    setSavingCert(true);

    const newEntry = {
      id: Date.now().toString(),
      name: certName.trim(),
      issuer: issuer.trim() || 'Verified Issuer',
      earnedDate: earnedDate || new Date().toISOString().slice(0, 10),
      credentialId: credentialId.trim(),
      credlyUrl: credlyBadgeUrl.trim(),
    };

    const updatedList = [newEntry, ...completedCerts];
    const { error } = await supabase.auth.updateUser({
      data: { completed_certs: updatedList },
    });

    setSavingCert(false);
    if (!error) {
      setCompletedCerts(updatedList);
      setCredentialId('');
      setCredlyBadgeUrl('');
      setEarnedDate('');
    }
  };

  const handleRemoveCertification = async (id) => {
    if (!supabase) return;
    const updatedList = completedCerts.filter((c) => c.id !== id);
    const { error } = await supabase.auth.updateUser({
      data: { completed_certs: updatedList },
    });
    if (!error) {
      setCompletedCerts(updatedList);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setPwdMsg({ type: '', text: '' });

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);

    if (error) {
      setPwdMsg({ type: 'error', text: error.message });
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg({
        type: 'success',
        text: 'Password updated! You can now sign in with your email and new password anytime.',
      });
    }
  };

  const authProvider = user.app_metadata?.provider || 'email';

  return (
    <div className="space-y-6">
      {/* Profile Header Summary */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center">
            {(fullName || user.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-stone-900">
                {fullName || user.email?.split('@')[0]}
              </h2>
              {completedCerts.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> {completedCerts.length} Certified
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {headline || 'Cloud & AI Certification Candidate'} • {user.email}
            </p>
          </div>
        </div>

        {credlyProfileUrl && (
          <a
            href={credlyProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
          >
            <Award className="w-3.5 h-3.5 text-amber-700" />
            View Credly Profile
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Section 1: Completed Certifications & Credly Badges */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-700" /> Completed Certifications & Credly Badges
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Showcase your passed exams and attach public Credly or vendor verification URLs.
          </p>
        </div>

        <form
          onSubmit={handleAddCertification}
          className="bg-stone-50 border border-stone-200/90 rounded-xl p-4 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Certification Name *
              </label>
              <input
                type="text"
                required
                list="cert-presets"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="e.g., AWS Solutions Architect – Associate (SAA-C03)"
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <datalist id="cert-presets">
                {catalog.map((c) => (
                  <option key={c.id} value={`${c.title} (${c.code})`} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Issuing Organization *
              </label>
              <input
                type="text"
                required
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g., Anthropic, AWS, Microsoft, Google Cloud, CompTIA"
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Date Earned
              </label>
              <input
                type="date"
                value={earnedDate}
                onChange={(e) => setEarnedDate(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Credential / Validation ID
              </label>
              <input
                type="text"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="Optional ID"
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Credly / Verification Link
              </label>
              <input
                type="url"
                value={credlyBadgeUrl}
                onChange={(e) => setCredlyBadgeUrl(e.target.value)}
                placeholder="https://www.credly.com/badges/..."
                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingCert}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {savingCert ? 'Adding...' : 'Add Completed Certification'}
          </button>
        </form>

        {/* Saved Certifications List */}
        {completedCerts.length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-4">
            No completed certifications added yet. Add your first badge above!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {completedCerts.map((cert) => (
              <div
                key={cert.id}
                className="border border-stone-200 rounded-xl p-3.5 flex flex-col justify-between gap-2 bg-white"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {cert.issuer}
                    </span>
                    <button
                      onClick={() => handleRemoveCertification(cert.id)}
                      className="text-stone-400 hover:text-rose-600 p-0.5"
                      title="Remove certification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs text-stone-900 mt-1.5">{cert.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 mt-1">
                    {cert.earnedDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {cert.earnedDate}
                      </span>
                    )}
                    {cert.credentialId && <span>ID: {cert.credentialId}</span>}
                  </div>
                </div>

                {cert.credlyUrl && (
                  <a
                    href={cert.credlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 pt-1"
                  >
                    <LinkIcon className="w-3 h-3" /> Verify on Credly{' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Public Profile & Links */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div>
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-700" /> Public Profile & Social Links
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Your display name appears on your Guidance Forum posts and study debriefs.
          </p>
        </div>

        {profileMsg.text && (
          <div
            className={`flex items-center gap-2 text-xs rounded-xl p-3 border ${
              profileMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {profileMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Professional Headline / Target Role
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Senior Cloud & AI Solutions Engineer"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Credly Public Profile URL
            </label>
            <input
              type="url"
              value={credlyProfileUrl}
              onChange={(e) => setCredlyProfileUrl(e.target.value)}
              placeholder="https://www.credly.com/users/your-username"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition disabled:opacity-50"
        >
          {savingProfile ? 'Saving...' : 'Save Profile Details'}
        </button>
      </form>

      {/* Section 3: Change / Set Account Password */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div>
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-700" /> Password & Security
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {authProvider === 'google'
              ? 'You signed in with Google. Setting a password here also lets you log in directly with your email and password.'
              : 'Update your account password (minimum 6 characters).'}
          </p>
        </div>

        {pwdMsg.text && (
          <div
            className={`flex items-center gap-2 text-xs rounded-xl p-3 border ${
              pwdMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {pwdMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{pwdMsg.text}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPwd}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition disabled:opacity-50"
        >
          {savingPwd ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}