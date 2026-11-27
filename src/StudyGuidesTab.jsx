import React, { useState } from 'react';
import { BookOpenCheck, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const GUIDES = [
  {
    id: 'ccdv-f',
    code: 'CCDV-F',
    provider: 'Anthropic',
    title: 'Claude Certified Developer – Foundations Study Guide',
    summary:
      'Focus 65% of your revision on Applications & Integration (33.1%), Model Selection & Optimization (16.8%), and Agents & Workflows (14.7%).',
    keyRules: [
      'Place cache_control ephemeral breakpoints on static system instructions, large reference docs, and tool schemas before dynamic user messages.',
      'Use the asynchronous Message Batches API (50% cost savings, up to 24h turnaround) for offline bulk classification—never for real-time user chat.',
      'Enforce deterministic tool execution with tool_choice: {"type": "any"} or {"type": "tool", "name": "..."} when structured output is mandatory.',
      'Route high-volume classification to Claude Haiku and reserve Sonnet/Opus + extended thinking budgets for multi-constraint synthesis.',
    ],
  },
  {
    id: 'cca-f',
    code: 'CCA-F',
    provider: 'Anthropic',
    title: 'Claude Certified Architect – Foundations Study Guide',
    summary:
      'Tests production multi-agent orchestration, deterministic hooks, MCP server transport design, and context compaction across 60 scenarios.',
    keyRules: [
      'Isolate noisy tasks (log parsing, multi-file codebase scans, test suites) inside scoped subagents that return concise structured summaries.',
      'Use hierarchical CLAUDE.md files for team conventions, but enforce non-negotiable guardrails with deterministic PreToolUse / PostToolUse hooks.',
      'Choose local stdio MCP transport for developer workstation filesystem tools and remote HTTP transport with scoped OAuth for shared enterprise services.',
      'Return structured is_error: true payloads with actionable recovery hints so autonomous loops self-correct without exhausting context limits.',
    ],
  },
  {
    id: 'saa-c03',
    code: 'SAA-C03',
    provider: 'AWS',
    title: 'AWS Solutions Architect – Associate Decision Matrix',
    summary:
      'Scenario questions reward managed, serverless, and multi-AZ designs that meet RPO/RTO targets with the lowest operational overhead.',
    keyRules: [
      'Route private-subnet traffic to S3 and DynamoDB through free VPC Gateway Endpoints before scaling NAT Gateways; use Interface Endpoints for SQS/KMS.',
      'Use SQS Standard for maximum throughput with idempotent consumers, SQS FIFO for strict ordering, and EventBridge for content-based multi-target routing.',
      'Enable RDS Multi-AZ for synchronous single-region HA failover, Read Replicas for read scaling, and Aurora Global Database for sub-second cross-region DR.',
      'Use S3 Intelligent-Tiering for unknown access patterns without retrieval fees and Glacier Instant Retrieval for quarterly compliance archives.',
    ],
  },
  {
    id: 'dva-c03',
    code: 'DVA-C03',
    provider: 'AWS',
    title: 'AWS Certified Developer – Associate Cheat Sheet',
    summary:
      'Concentrates on serverless deployment safety, DynamoDB partition/index design, IAM least-privilege roles, and CI/CD canary rollouts.',
    keyRules: [
      'Avoid DynamoDB hot partitions by choosing high-cardinality partition keys; use GSIs when querying alternate access patterns across all partitions.',
      'Store database credentials in AWS Secrets Manager when automatic rotation is required, and SSM Parameter Store SecureString for static config.',
      'Use AWS CodeDeploy linear or canary traffic shifting with CloudWatch alarm rollback hooks for zero-downtime Lambda alias deployments.',
      'Enable AWS X-Ray active tracing across API Gateway, Lambda, and SQS to pinpoint downstream latency bottlenecks.',
    ],
  },
  {
    id: 'az-900',
    code: 'AZ-900',
    provider: 'Microsoft Azure',
    title: 'Microsoft Azure Fundamentals Core Concepts',
    summary:
      'Covers cloud shared-responsibility boundaries, Azure governance hierarchy, identity/Zero Trust, and CapEx vs. OpEx cost management.',
    keyRules: [
      'Understand the governance scope order: Management Groups → Subscriptions → Resource Groups → Individual Resources (policies inherit downward).',
      'Compare SLAs and resilience: Availability Zones protect against entire datacenter power/network outages within a region; Region Pairs protect against regional disasters.',
      'Use Microsoft Entra ID Conditional Access and Multi-Factor Authentication (MFA) as the primary identity perimeter under Zero Trust.',
      'Apply Azure Reservations or Savings Plans for predictable 1-to-3-year steady compute workloads to reduce pay-as-you-go OpEx.',
    ],
  },
  {
    id: 'gcp-ace',
    code: 'GCP-ACE',
    provider: 'Google Cloud',
    title: 'Google Cloud Associate Cloud Engineer Essentials',
    summary:
      'Tests hands-on gcloud CLI operations, IAM resource hierarchy, VPC global routing, GKE workload management, and Cloud Run deployments.',
    keyRules: [
      'Attach service accounts with predefined least-privilege IAM roles to Compute Engine VMs and Cloud Run services instead of downloading JSON keys.',
      'Leverage Google Cloud global VPCs where subnets are regional resources that can communicate privately across regions without VPC peering.',
      'Choose Cloud Run for stateless HTTP/event-driven containers that scale to zero, and GKE Autopilot when Kubernetes orchestration primitives are needed.',
      'Use Cloud Audit Logs (Admin Activity vs. Data Access) and Cloud Monitoring alerting policies to track configuration changes and SLO burn rates.',
    ],
  },
  {
    id: 'aif-c01',
    code: 'AIF-C01',
    provider: 'AWS',
    title: 'AWS Certified AI Practitioner Reference Guide',
    summary:
      'Focuses on foundation model selection, RAG vs. fine-tuning tradeoffs, Amazon Bedrock Guardrails, and responsible AI governance.',
    keyRules: [
      'Choose Retrieval-Augmented Generation (RAG) with Amazon Bedrock Knowledge Bases when responses must stay grounded in frequently updated private documents.',
      'Reserve fine-tuning or continued pre-training for teaching a model a specialized domain tone, formatting structure, or niche vocabulary.',
      'Configure Amazon Bedrock Guardrails to enforce topic denials, PII redaction, and contextual grounding checks to mitigate hallucinations.',
      'Lower inference temperature (0.0–0.2) for deterministic extraction/classification and raise it only for open-ended brainstorming.',
    ],
  },
  {
    id: 'gh-300',
    code: 'GH-300',
    provider: 'GitHub',
    title: 'GitHub Copilot Certification Study Notes',
    summary:
      'Evaluates prompt engineering in IDE workflows, repository custom instructions, content exclusions, and enterprise IP/privacy controls.',
    keyRules: [
      'Provide clear context in open editor tabs, concise function signatures, and .github/copilot-instructions.md to align generated code with repo standards.',
      'Configure Content Exclusions at the repository or organization level to prevent Copilot from indexing secrets, credentials, or proprietary files.',
      'Enable public-code matching filters in GitHub Copilot Business/Enterprise to block suggestions that verbatim match public GitHub repositories.',
      'Use Copilot Chat slash commands (/tests, /fix, /explain) and workspace context (@workspace) for multi-file debugging and unit test generation.',
    ],
  },
  {
    id: 'sy0-701',
    code: 'SY0-701',
    provider: 'CompTIA',
    title: 'CompTIA Security+ (SY0-701) Core Domain Guide',
    summary:
      'Emphasizes practical threat mitigation, cryptographic implementations, Zero Trust architecture, and incident response lifecycle phases.',
    keyRules: [
      'Follow the NIST Incident Response sequence: Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-Incident Activity.',
      'Pair asymmetric encryption (RSA/ECC) for key exchange and digital signatures with symmetric encryption (AES-256) for high-speed bulk data confidentiality.',
      'Enforce segmentation, microsegmentation, and Privileged Access Management (PAM) with Just-In-Time (JIT) elevation to limit lateral movement.',
      'Distinguish vulnerability scans (credentialed vs. non-credentialed passive checks) from penetration tests (authorized active exploitation).',
    ],
  },
];

export default function StudyGuidesTab({ catalog, onSelectCert }) {
  const [selectedCode, setSelectedCode] = useState('All');

  const visibleGuides =
    selectedCode === 'All' ? GUIDES : GUIDES.filter((g) => g.code === selectedCode);

  const handleOpenCert = (certId) => {
    const match = catalog.find((c) => c.id === certId);
    if (match && onSelectCert) {
      onSelectCert(match);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-1.5">
          <BookOpenCheck className="w-4 h-4" />
          <span>2026 Exam Revision Library</span>
        </div>
        <h2 className="text-lg font-bold text-stone-900">
          Certification Study Guides & Architectural Cheat Sheets
        </h2>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
          High-yield domain summaries, architectural decision rules, and last-mile revision checklists for all nine certifications.
        </p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCode('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
            selectedCode === 'All'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400'
          }`}
        >
          All Guides ({GUIDES.length})
        </button>
        {GUIDES.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedCode(g.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono border whitespace-nowrap transition ${
              selectedCode === g.code
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-emerald-800 border-stone-200 hover:border-emerald-400'
            }`}
          >
            {g.code}
          </button>
        ))}
      </div>

      {/* Study Guide Cards */}
      <div className="space-y-4">
        {visibleGuides.map((guide) => (
          <article
            key={guide.id}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                {guide.provider} • {guide.code}
              </span>
              <button
                onClick={() => handleOpenCert(guide.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition"
              >
                Practice {guide.code} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-stone-900">{guide.title}</h3>
            <p className="text-xs text-stone-600 leading-relaxed">{guide.summary}</p>

            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> High-Frequency Exam Rules
              </p>
              <ul className="space-y-2 text-xs text-stone-700 leading-relaxed">
                {guide.keyRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}