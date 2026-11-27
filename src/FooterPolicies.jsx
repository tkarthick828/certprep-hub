import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

const POLICIES = {
  about: {
    title: 'About CertPrep Hub & Question Methodology',
    body: [
      'CertPrep Hub is a free, community-driven certification preparation platform covering Anthropic Claude, AWS, Microsoft Azure, Google Cloud, GitHub Copilot, and CompTIA exams.',
      'Every practice question is newly authored against official 2026 exam blueprints, domain weightings, and scaled scoring formats to test real-world architectural reasoning rather than rote memorization.',
    ],
  },
  disclaimer: {
    title: 'Exam Integrity & Trademark Disclaimer',
    body: [
      'CertPrep Hub is an independent educational platform and is not affiliated with, endorsed by, or sponsored by Anthropic, Amazon Web Services (AWS), Microsoft, Google Cloud, GitHub, or CompTIA.',
      'All exam names and codes (CCA-F, CCDV-F, SAA-C03, DVA-C03, AZ-900, GCP-ACE, AIF-C01, GH-300, SY0-701) are trademarks of their respective owners. We strictly prohibit copyrighted exam dumps; all items are original scenario-based practice questions.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'Practice quizzes and exam simulations run locally in your browser without requiring an account or collecting personal data.',
      'If you choose to sign in with Google or Email to participate in the Guidance Forum, we store only your public display name, user ID, posts, and upvotes in our secured Supabase database. We never sell user data.',
      'To keep this platform 100% free, we may display advertisements served by Google AdSense, which uses cookies to serve relevant ads based on prior visits. You can manage ad personalization anytime in your Google Ad Settings.',
    ],
  },
  terms: {
    title: 'Terms of Use',
    body: [
      'All practice questions, explanations, and community guides are provided for personal educational study only. Passing scores on CertPrep Hub practice exams do not guarantee passing scores on official vendor exams.',
      'Community forum contributors must share original study advice and may not post copyrighted exam questions, spam, or abusive content. Posts violating exam NDAs will be removed.',
    ],
  },
};

export default function FooterPolicies() {
  const [activeKey, setActiveKey] = useState(null);

  return (
    <>
      <footer className="bg-white border-t border-stone-300/80 text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          <p className="text-[11px] text-stone-600 leading-relaxed">
            <strong className="text-stone-800">Original Practice Content:</strong> All questions and explanations on CertPrep Hub are original, blueprint-aligned practice scenarios—not official exam dumps. Independent study resource; not affiliated with Anthropic, AWS, Microsoft, Google Cloud, GitHub, or CompTIA.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-stone-100">
            <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>CertPrep Hub • Blueprint Practice</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 font-medium">
              <button onClick={() => setActiveKey('about')} className="hover:text-emerald-800 transition">
                About
              </button>
              <button onClick={() => setActiveKey('disclaimer')} className="hover:text-emerald-800 transition">
                Exam Disclaimer
              </button>
              <button onClick={() => setActiveKey('privacy')} className="hover:text-emerald-800 transition">
                Privacy Policy
              </button>
              <button onClick={() => setActiveKey('terms')} className="hover:text-emerald-800 transition">
                Terms of Use
              </button>
            </div>
          </div>
        </div>
      </footer>

      {activeKey && (
        <div
          onClick={() => setActiveKey(null)}
          className="fixed inset-0 z-50 bg-stone-900/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm text-stone-900">{POLICIES[activeKey].title}</h3>
              <button
                onClick={() => setActiveKey(null)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
              {POLICIES[activeKey].body.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}