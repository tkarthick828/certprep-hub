import React, { useState } from 'react';
import {
  Scale, Compass, ArrowRight, CheckCircle2, Sparkles
} from 'lucide-react';

const CAREER_PATHS = [
  {
    id: 'genai-agentic',
    title: 'GenAI & Agentic Systems Engineer',
    subtitle: 'Build production LLM applications, prompt caching pipelines, and multi-agent MCP workflows.',
    steps: [
      { code: 'AIF-C01', certId: 'aif-c01', label: '1. Foundation: GenAI & RAG Concepts' },
      { code: 'CCDV-F', certId: 'ccdv-f', label: '2. Core API: Tool Use, Batches & Caching' },
      { code: 'CCA-F', certId: 'cca-f', label: '3. Architecture: Subagents, Hooks & MCP' },
      { code: 'GH-300', certId: 'gh-300', label: '4. Velocity: AI-Assisted IDE Engineering' },
    ],
  },
  {
    id: 'cloud-architect',
    title: 'Multi-Cloud Solutions & DevOps Architect',
    subtitle: 'Design resilient, cost-optimized cloud infrastructure and automated CI/CD pipelines.',
    steps: [
      { code: 'AZ-900', certId: 'az-900', label: '1. Core Cloud: Governance & SLA Fundamentals' },
      { code: 'SAA-C03', certId: 'saa-c03', label: '2. Architecture: Multi-AZ, VPC & Storage' },
      { code: 'DVA-C03', certId: 'dva-c03', label: '3. Serverless: DynamoDB, Lambda & Canary CI/CD' },
      { code: 'GCP-ACE', certId: 'gcp-ace', label: '4. Multi-Cloud: Global VPC, GKE & Cloud Run' },
    ],
  },
  {
    id: 'cloud-security',
    title: 'Cloud & Enterprise Security Specialist',
    subtitle: 'Implement Zero Trust architecture, IAM least privilege, encryption, and incident response.',
    steps: [
      { code: 'SY0-701', certId: 'sy0-701', label: '1. Security Core: Zero Trust, Crypto & NIST IR' },
      { code: 'SAA-C03', certId: 'saa-c03', label: '2. AWS Security: PrivateLink, KMS & IAM' },
      { code: 'GCP-ACE', certId: 'gcp-ace', label: '3. GCP Governance: Audit Logs & Service Accounts' },
    ],
  },
];

const COMPARISON_DATA = [
  {
    id: 'ccdv-f',
    code: 'CCDV-F',
    provider: 'Anthropic',
    group: 'claude',
    level: 'Foundations / Developer',
    focus: 'Messages API, prompt caching, tool_choice, Message Batches, extended thinking',
    format: '53 Qs • 120 mins',
    passMark: '70% (~700/1000)',
    estFee: '$99',
    bestFor: 'Backend & AI engineers building production Claude API apps',
  },
  {
    id: 'cca-f',
    code: 'CCA-F',
    provider: 'Anthropic',
    group: 'claude',
    level: 'Foundations / Architect',
    focus: 'Multi-agent orchestration, subagents, CLAUDE.md, deterministic hooks, MCP servers',
    format: '60 Qs • 120 mins',
    passMark: '720 / 1000',
    estFee: '$99',
    bestFor: 'Tech leads & architects designing autonomous agentic workflows',
  },
  {
    id: 'aif-c01',
    code: 'AIF-C01',
    provider: 'AWS',
    group: 'claude',
    level: 'Foundational',
    focus: 'RAG vs. fine-tuning, Amazon Bedrock Guardrails, responsible AI, evaluation metrics',
    format: '65 Qs • 90 mins',
    passMark: '700 / 1000',
    estFee: '$100',
    bestFor: 'Engineers & product leads adopting managed GenAI on AWS',
  },
  {
    id: 'gh-300',
    code: 'GH-300',
    provider: 'GitHub',
    group: 'claude',
    level: 'Associate / Developer',
    focus: 'Copilot IDE prompting, custom repo instructions, content exclusions, IP governance',
    format: '50 Qs • 100 mins',
    passMark: '700 / 1000',
    estFee: '$99',
    bestFor: 'Software developers & engineering managers standardizing Copilot',
  },
  {
    id: 'saa-c03',
    code: 'SAA-C03',
    provider: 'AWS',
    group: 'aws',
    level: 'Associate',
    focus: 'VPC endpoints, RDS Multi-AZ, SQS/EventBridge decoupling, S3 lifecycle cost optimization',
    format: '65 Qs • 130 mins',
    passMark: '720 / 1000',
    estFee: '$150',
    bestFor: 'Solutions architects designing fault-tolerant AWS workloads',
  },
  {
    id: 'dva-c03',
    code: 'DVA-C03',
    provider: 'AWS',
    group: 'aws',
    level: 'Associate',
    focus: 'DynamoDB partition/GSI modeling, Secrets Manager rotation, CodeDeploy canary rollouts',
    format: '65 Qs • 130 mins',
    passMark: '720 / 1000',
    estFee: '$150',
    bestFor: 'Application developers building serverless & event-driven AWS apps',
  },
  {
    id: 'az-900',
    code: 'AZ-900',
    provider: 'Microsoft',
    group: 'multicloud',
    level: 'Fundamentals',
    focus: 'Cloud models, Azure governance hierarchy, Availability Zones, Entra ID, CapEx/OpEx',
    format: '45 Qs • 45 mins',
    passMark: '700 / 1000',
    estFee: '$99',
    bestFor: 'First-time cloud learners & professionals validating Azure basics',
  },
  {
    id: 'gcp-ace',
    code: 'GCP-ACE',
    provider: 'Google Cloud',
    group: 'multicloud',
    level: 'Associate',
    focus: 'gcloud CLI, IAM resource hierarchy, global VPCs, Cloud Run & GKE Autopilot operations',
    format: '50 Qs • 120 mins',
    passMark: '70% Pass',
    estFee: '$125',
    bestFor: 'Cloud engineers deploying & monitoring workloads on Google Cloud',
  },
  {
    id: 'sy0-701',
    code: 'SY0-701',
    provider: 'CompTIA',
    group: 'security',
    level: 'Intermediate',
    focus: 'Zero Trust architecture, symmetric/asymmetric crypto, PAM, NIST incident response',
    format: '90 Qs • 90 mins',
    passMark: '750 / 900',
    estFee: '$404',
    bestFor: 'Security analysts, network admins & cloud engineers',
  },
];

const PRESET_FILTERS = [
  { id: 'all', label: 'All 9 Certifications' },
  { id: 'claude', label: 'Claude & AI (CCDV-F vs CCA-F vs AIF-C01)' },
  { id: 'aws', label: 'AWS Associate (SAA-C03 vs DVA-C03)' },
  { id: 'multicloud', label: 'Multi-Cloud (AZ-900 vs GCP-ACE)' },
];

export default function CompareTab({ catalog, onSelectCert }) {
  const [preset, setPreset] = useState('all');

  const rows =
    preset === 'all'
      ? COMPARISON_DATA
      : COMPARISON_DATA.filter((item) => item.group === preset);

  const openExamById = (certId) => {
    const match = catalog.find((c) => c.id === certId);
    if (match && onSelectCert) {
      onSelectCert(match);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-1.5">
          <Compass className="w-4 h-4" />
          <span>Certification Roadmaps & Side-by-Side Matrix</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">
          Compare Certifications & Plan Your Learning Path
        </h2>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
          Not sure whether to take <strong>CCDV-F or CCA-F</strong>, or <strong>SAA-C03 vs. DVA-C03</strong>? Compare exam scope, difficulty, and recommended career sequences below.
        </p>
      </div>

      {/* Section 1: Role-Based Career Roadmaps */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
          Recommended Role Roadmaps
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {CAREER_PATHS.map((path) => (
            <div
              key={path.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-amber-600" /> Career Track
                </span>
                <h4 className="font-bold text-sm text-stone-900">{path.title}</h4>
                <p className="text-xs text-stone-500 leading-relaxed">{path.subtitle}</p>
              </div>

              <div className="space-y-2">
                {path.steps.map((step) => (
                  <button
                    key={step.code}
                    onClick={() => openExamById(step.certId)}
                    className="w-full text-left p-2.5 rounded-xl bg-stone-50 hover:bg-emerald-50/80 border border-stone-200/80 hover:border-emerald-300 transition flex items-center justify-between gap-2 text-xs group"
                  >
                    <span className="font-medium text-stone-800 group-hover:text-emerald-900">
                      {step.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Side-by-Side Comparison Matrix */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-stone-900">
              Head-to-Head Exam Comparison Matrix
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPreset(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  preset === f.id
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-emerald-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                <th className="py-2.5 px-3 font-bold">Exam</th>
                <th className="py-2.5 px-3 font-bold">Level</th>
                <th className="py-2.5 px-3 font-bold">Core Technical Focus</th>
                <th className="py-2.5 px-3 font-bold">Format & Pass</th>
                <th className="py-2.5 px-3 font-bold">Est. Fee</th>
                <th className="py-2.5 px-3 font-bold">Best For</th>
                <th className="py-2.5 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/70 transition align-top">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-emerald-800 block">
                      {row.code}
                    </span>
                    <span className="text-[11px] text-stone-500">{row.provider}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-stone-700 font-medium">
                    {row.level}
                  </td>
                  <td className="py-3 px-3 text-stone-700 leading-relaxed min-w-[200px]">
                    {row.focus}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-stone-700">
                    <span className="block font-medium">{row.format}</span>
                    <span className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> {row.passMark}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-semibold text-stone-800">
                    {row.estFee}
                  </td>
                  <td className="py-3 px-3 text-stone-600 leading-relaxed min-w-[180px]">
                    {row.bestFor}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => openExamById(row.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white border border-emerald-200 font-semibold transition"
                    >
                      Blueprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}