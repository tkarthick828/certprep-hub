import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck, ChevronDown, ChevronUp, ArrowRight,
  Check, RotateCcw, Layers, Sparkles
} from 'lucide-react';

const STUDY_DECKS = [
  {
    id: 'ccdv-f',
    code: 'CCDV-F',
    provider: 'Anthropic',
    title: 'Claude Certified Developer – Foundations',
    topics: [
      {
        id: 'ccdv-sys-user',
        title: 'System Prompt vs. User Prompt',
        tag: 'Prompt Engineering',
        definition:
          'The system parameter sets persistent global role, tone, formatting rules, and guardrails for the entire session, whereas user messages carry turn-by-turn task inputs and dynamic context.',
        characteristics: [
          'System prompts apply across all turns and cannot be overridden easily by user turn phrasing.',
          'Keep static instructions and output schemas in the system prompt so they can be prefix-cached.',
          'Place untrusted end-user input inside structured XML tags (e.g., <user_query>) in the user turn to prevent prompt injection.',
        ],
      },
      {
        id: 'ccdv-caching',
        title: 'Prompt Caching Breakpoints',
        tag: 'Cost & Latency',
        definition:
          'Prompt caching stores the KV-cache of repeated prompt prefixes on Anthropic servers so subsequent requests skip redundant input token processing.',
        characteristics: [
          'Requires an exact token-for-token prefix match from the start of the request up to the cache_control: {"type": "ephemeral"} marker.',
          'Enforces minimum cacheable token thresholds (1,024 tokens for Sonnet/Opus; 2,048 tokens for Haiku).',
          'Order content from most static to most dynamic: Tools → System Prompt → Reference Docs → Conversation History.',
        ],
      },
      {
        id: 'ccdv-tools',
        title: 'Deterministic Tool Use & tool_choice',
        tag: 'Applications & Integration',
        definition:
          'Tool use lets Claude emit structured JSON arguments to invoke external functions, controlled via the tool_choice parameter.',
        characteristics: [
          'tool_choice: {"type": "auto"} (default) lets Claude decide whether to call a tool or reply directly in text.',
          'tool_choice: {"type": "any"} forces Claude to invoke at least one registered tool—ideal for structured routing.',
          'tool_choice: {"type": "tool", "name": "..."} forces a specific tool call, guaranteeing schema-compliant JSON extraction.',
        ],
      },
      {
        id: 'ccdv-batches',
        title: 'Message Batches API vs. Synchronous Messages',
        tag: 'Model Optimization',
        definition:
          'The Message Batches API processes large collections of independent requests asynchronously within 24 hours at a 50% token discount.',
        characteristics: [
          'Best for offline bulk classification, overnight document summarization, and evaluation suites.',
          'Never use Batches for user-facing interactive chat or latency-sensitive workflows.',
          'Each request in a batch uses a custom_id so out-of-order results can be matched back to inputs.',
        ],
      },
      {
        id: 'ccdv-thinking',
        title: 'Model Routing & Extended Thinking',
        tag: 'Model Selection',
        definition:
          'Matching model tier and thinking budget to task complexity optimizes accuracy, latency, and API spend.',
        characteristics: [
          'Route high-throughput classification, routing, and simple extraction to Claude Haiku.',
          'Use Claude Sonnet/Opus for multi-file code generation and nuanced architectural synthesis.',
          'Enable Extended Thinking with an explicit budget_tokens cap for multi-constraint debugging, math, and root-cause analysis.',
        ],
      },
    ],
  },
  {
    id: 'cca-f',
    code: 'CCA-F',
    provider: 'Anthropic',
    title: 'Claude Certified Architect – Foundations',
    topics: [
      {
        id: 'cca-subagents',
        title: 'Orchestrator–Subagent Context Isolation',
        tag: 'Multi-Agent Systems',
        definition:
          'A pattern where a lead orchestrator delegates noisy subtasks to scoped subagents that execute in isolated context windows and return concise summaries.',
        characteristics: [
          'Prevents raw test logs, stack traces, and large file reads from bloating the orchestrator context.',
          'Subagents receive only the specific tools and instructions required for their bounded task.',
          'Parallel subagents can inspect independent modules simultaneously without cross-contaminating state.',
        ],
      },
      {
        id: 'cca-hooks',
        title: 'Deterministic Hooks vs. CLAUDE.md Guidance',
        tag: 'Reliability & Guardrails',
        definition:
          'CLAUDE.md provides probabilistic project context and conventions, while PreToolUse/PostToolUse hooks execute deterministic shell scripts around tool calls.',
        characteristics: [
          'Put architecture conventions, build commands, and style guidelines in hierarchical CLAUDE.md files.',
          'Use deterministic PreToolUse hooks whenever a rule must never be skipped (e.g., blocking edits to .env or production secrets).',
          'Use PostToolUse hooks to automatically run formatters, linters, or unit tests after file modifications.',
        ],
      },
      {
        id: 'cca-mcp',
        title: 'MCP Server Transport (stdio vs. HTTP)',
        tag: 'Tool Design & MCP',
        definition:
          'Model Context Protocol (MCP) standardizes how Claude connects to external data sources and tools over local or remote transports.',
        characteristics: [
          'Use stdio transport for local developer-workstation tools that need direct filesystem or CLI access.',
          'Use Streamable HTTP transport with scoped OAuth tokens for shared, multi-user enterprise services.',
          'Keep tool names distinct and descriptions concise so the model does not confuse overlapping capabilities.',
        ],
      },
      {
        id: 'cca-errors',
        title: 'Structured Tool Errors & Context Compaction',
        tag: 'Production Resilience',
        definition:
          'Long-running agentic loops stay reliable by returning actionable error payloads and compacting stale turn history.',
        characteristics: [
          'Return is_error: true with clear recovery instructions (e.g., valid parameter ranges) rather than raw stack traces.',
          'Compact completed sub-tasks into structured checkpoints before hitting context window limits.',
          'Cap maximum agent loop iterations and require human-in-the-loop approval for destructive actions.',
        ],
      },
    ],
  },
  {
    id: 'saa-c03',
    code: 'SAA-C03',
    provider: 'AWS',
    title: 'AWS Solutions Architect – Associate',
    topics: [
      {
        id: 'saa-endpoints',
        title: 'VPC Gateway Endpoints vs. Interface Endpoints',
        tag: 'Secure Networking',
        definition:
          'VPC Endpoints keep private-subnet traffic to AWS services on the internal AWS network without traversing an Internet Gateway or NAT Gateway.',
        characteristics: [
          'Gateway Endpoints are free and support only Amazon S3 and DynamoDB via route-table entries.',
          'Interface Endpoints (AWS PrivateLink) create an ENI with a private IP for SQS, Secrets Manager, KMS, and most other services.',
          'Moving heavy S3/DynamoDB transfers to a Gateway Endpoint eliminates NAT Gateway per-GB data processing charges.',
        ],
      },
      {
        id: 'saa-decoupling',
        title: 'SQS Standard vs. SQS FIFO vs. EventBridge',
        tag: 'Resilient Architectures',
        definition:
          'Managed messaging services decouple microservices so traffic spikes and downstream outages do not cascade.',
        characteristics: [
          'SQS Standard offers nearly unlimited throughput with at-least-once delivery (consumers must be idempotent).',
          'SQS FIFO guarantees strict first-in-first-out ordering and exactly-once processing using MessageGroupId.',
          'Amazon EventBridge routes events to multiple targets based on JSON payload rules and integrates with SaaS partners.',
        ],
      },
      {
        id: 'saa-db',
        title: 'RDS Multi-AZ vs. Read Replicas vs. Aurora Global',
        tag: 'Database Resilience',
        definition:
          'Choosing the right database replication topology depends on whether the bottleneck is availability, read throughput, or regional disaster recovery.',
        characteristics: [
          'RDS Multi-AZ uses synchronous replication to a standby instance in another AZ for automatic HA failover (no read traffic served).',
          'Read Replicas use asynchronous replication to offload read-heavy reporting and analytics queries.',
          'Aurora Global Database replicates across AWS regions with <1 second RPO for rapid cross-region disaster recovery.',
        ],
      },
      {
        id: 'saa-storage',
        title: 'S3 Storage Classes & Lifecycle Tiering',
        tag: 'Cost Optimization',
        definition:
          'Amazon S3 tiers trade off storage cost, retrieval latency, and retrieval fees based on object access frequency.',
        characteristics: [
          'S3 Intelligent-Tiering automatically moves objects with unpredictable access patterns with zero retrieval fees.',
          'S3 Glacier Instant Retrieval delivers millisecond access for compliance archives read once per quarter.',
          'S3 Glacier Deep Archive offers the lowest storage cost for 7–10 year retention with 12–48 hour restore times.',
        ],
      },
    ],
  },
  {
    id: 'dva-c03',
    code: 'DVA-C03',
    provider: 'AWS',
    title: 'AWS Certified Developer – Associate',
    topics: [
      {
        id: 'dva-ddb',
        title: 'DynamoDB Partition Keys, GSIs & LSIs',
        tag: 'Data Modeling',
        definition:
          'DynamoDB distributes items across storage partitions using a hash of the Partition Key and supports secondary indexes for alternate queries.',
        characteristics: [
          'Choose high-cardinality partition keys (e.g., user_id, order_id) to prevent hot-partition throttling.',
          'Global Secondary Indexes (GSI) can be created anytime with a different partition/sort key and separate RCU/WCU.',
          'Local Secondary Indexes (LSI) must be defined at table creation and share the base table partition key.',
        ],
      },
      {
        id: 'dva-secrets',
        title: 'Secrets Manager vs. SSM Parameter Store',
        tag: 'Application Security',
        definition:
          'Both services externalize configuration from code, but differ in automatic credential rotation and pricing.',
        characteristics: [
          'Use AWS Secrets Manager for RDS/Redshift credentials requiring built-in automatic rotation via Lambda.',
          'Use SSM Parameter Store Standard tier for free hierarchical app config and KMS-encrypted SecureStrings.',
          'Never hardcode credentials in Lambda environment variables without KMS encryption or runtime secret fetching.',
        ],
      },
      {
        id: 'dva-deploy',
        title: 'CodeDeploy Canary & Linear Traffic Shifting',
        tag: 'CI/CD & Deployment',
        definition:
          'AWS CodeDeploy shifts traffic gradually to new Lambda aliases or ECS tasks while monitoring CloudWatch alarms.',
        characteristics: [
          'Canary deployments shift a small percentage (e.g., 10% for 5 minutes) before moving the remaining 90%.',
          'Linear deployments shift equal traffic increments every N minutes until reaching 100%.',
          'Triggering any configured CloudWatch alarm automatically rolls back traffic to the previous healthy version.',
        ],
      },
    ],
  },
  {
    id: 'az-900',
    code: 'AZ-900',
    provider: 'Microsoft Azure',
    title: 'Microsoft Azure Fundamentals',
    topics: [
      {
        id: 'az-gov',
        title: 'Azure Management Hierarchy',
        tag: 'Governance & Compliance',
        definition:
          'Azure organizes resources in four nested scopes where RBAC roles and Azure Policies inherit downward.',
        characteristics: [
          'Order from top to bottom: Management Groups → Subscriptions → Resource Groups → Individual Resources.',
          'Every resource must belong to exactly one Resource Group, though resources in a group can span different regions.',
          'Resource Locks (CanNotDelete or ReadOnly) override user RBAC permissions to prevent accidental deletion.',
        ],
      },
      {
        id: 'az-resilience',
        title: 'Availability Zones vs. Region Pairs',
        tag: 'Cloud Architecture',
        definition:
          'Azure isolates failures at both the datacenter level within a region and across geographic regions.',
        characteristics: [
          'Availability Zones are physically separate datacenters within one Azure region with independent power, cooling, and networking.',
          'Region Pairs link two regions at least 300 miles apart within the same geography for platform updates and geo-redundant storage.',
          'Using multiple Availability Zones raises compute VM SLA uptime guarantees from 99.9% to 99.99%.',
        ],
      },
      {
        id: 'az-cost',
        title: 'CapEx vs. OpEx & Azure Cost Controls',
        tag: 'Cloud Concepts',
        definition:
          'Cloud computing shifts spending from upfront Capital Expenditure (CapEx) to consumption-based Operational Expenditure (OpEx).',
        characteristics: [
          'Use the Total Cost of Ownership (TCO) Calculator to compare on-premises datacenter costs against Azure.',
          'Use the Azure Pricing Calculator to estimate monthly OpEx for specific configured Azure services.',
          'Commit to 1-year or 3-year Azure Reservations / Savings Plans to discount steady-state compute workloads.',
        ],
      },
    ],
  },
  {
    id: 'gcp-ace',
    code: 'GCP-ACE',
    provider: 'Google Cloud',
    title: 'Google Cloud Associate Cloud Engineer',
    topics: [
      {
        id: 'gcp-iam',
        title: 'IAM Resource Hierarchy & Service Accounts',
        tag: 'Identity & Access',
        definition:
          'Google Cloud IAM binds principals to roles on Organization, Folder, Project, or Resource nodes, inheriting permissions downward.',
        characteristics: [
          'Follow least privilege by assigning predefined or custom IAM roles rather than basic roles (Owner/Editor/Viewer).',
          'Attach Service Accounts directly to Compute Engine VMs and Cloud Run services instead of exporting JSON key files.',
          'Allow policies are additive across the hierarchy, while IAM Deny policies override allow rules.',
        ],
      },
      {
        id: 'gcp-vpc',
        title: 'Global VPC & Regional Subnets',
        tag: 'Networking',
        definition:
          'Unlike cloud providers with regional VPCs, a Google Cloud VPC is a single global resource spanning all regions.',
        characteristics: [
          'Subnets are regional resources; VMs in different regions on the same VPC communicate privately without VPN or peering.',
          'VPC firewall rules are stateful and can target VMs via network tags or attached service accounts.',
          'Use Cloud NAT to give private VMs without external IPs outbound internet access for OS patches.',
        ],
      },
      {
        id: 'gcp-compute',
        title: 'Cloud Run vs. GKE Autopilot vs. Compute Engine',
        tag: 'Compute Selection',
        definition:
          'Google Cloud compute options span raw virtual machines, managed Kubernetes, and serverless containers.',
        characteristics: [
          'Cloud Run runs stateless HTTP/event-driven containers and scales down to zero instances when idle.',
          'GKE Autopilot manages cluster nodes, scaling, and security patching automatically for Kubernetes workloads.',
          'Compute Engine provides full OS control and custom machine types for legacy or specialized workloads.',
        ],
      },
    ],
  },
  {
    id: 'aif-c01',
    code: 'AIF-C01',
    provider: 'AWS',
    title: 'AWS Certified AI Practitioner',
    topics: [
      {
        id: 'aif-rag',
        title: 'RAG vs. Fine-Tuning vs. Continued Pre-Training',
        tag: 'Foundation Models',
        definition:
          'Customizing foundation model behavior depends on whether the gap is fresh factual knowledge or domain-specific style.',
        characteristics: [
          'Use Retrieval-Augmented Generation (RAG) with Amazon Bedrock Knowledge Bases for up-to-date private data with citations.',
          'Use Supervised Fine-Tuning (labeled prompt-completion pairs) to teach specialized output formats, tone, or task behavior.',
          'Use Continued Pre-Training (unlabeled domain corpus) to adapt a model to niche industry terminology.',
        ],
      },
      {
        id: 'aif-guardrails',
        title: 'Amazon Bedrock Guardrails & Hallucination Control',
        tag: 'Responsible AI',
        definition:
          'Bedrock Guardrails enforce configurable safety, privacy, and grounding policies consistently across any foundation model.',
        characteristics: [
          'Blocks denied topics, filters harmful content, and masks or redacts PII (names, SSNs, emails) in prompts and responses.',
          'Contextual Grounding checks verify that answers are factually supported by retrieved RAG source passages.',
          'Lower temperature (0.0–0.2) reduces randomness for deterministic extraction and classification tasks.',
        ],
      },
      {
        id: 'aif-metrics',
        title: 'Evaluating GenAI & ML Models',
        tag: 'Model Evaluation',
        definition:
          'Model evaluation combines automated benchmark metrics with human or LLM-as-a-judge quality checks.',
        characteristics: [
          'ROUGE measures n-gram recall overlap for text summarization; BLEU measures precision for machine translation.',
          'BERTScore compares semantic embedding similarity rather than exact word matches.',
          'For imbalanced binary fraud/disease classifiers, prioritize Precision, Recall, F1-score, and PR-AUC over raw Accuracy.',
        ],
      },
    ],
  },
  {
    id: 'gh-300',
    code: 'GH-300',
    provider: 'GitHub',
    title: 'GitHub Copilot Certification',
    topics: [
      {
        id: 'gh-context',
        title: 'Prompt Context & Custom Repository Instructions',
        tag: 'Developer Workflows',
        definition:
          'GitHub Copilot constructs prompts from open editor tabs, neighboring files, chat variables, and repository instruction files.',
        characteristics: [
          'Keep relevant interfaces, types, and test files open in editor tabs to improve inline completion accuracy.',
          'Create .github/copilot-instructions.md to enforce repo-wide frameworks, coding conventions, and test patterns.',
          'Use @workspace in Copilot Chat for multi-file codebase questions and /tests or /fix for targeted actions.',
        ],
      },
      {
        id: 'gh-privacy',
        title: 'Content Exclusions & Public Code Matching',
        tag: 'Governance & IP',
        definition:
          'GitHub Copilot Business and Enterprise provide administrative controls to protect sensitive files and intellectual property.',
        characteristics: [
          'Content Exclusions block Copilot from reading or suggesting completions inside specified paths (e.g., secrets/, *.pem).',
          'Enabling the public code filter suppresses suggestions that verbatim match ~150+ characters of public GitHub code.',
          'Business and Enterprise tiers do not retain user prompts/suggestions or use customer code to train base models.',
        ],
      },
    ],
  },
  {
    id: 'sy0-701',
    code: 'SY0-701',
    provider: 'CompTIA',
    title: 'CompTIA Security+ (SY0-701)',
    topics: [
      {
        id: 'sec-ir',
        title: 'Incident Response Lifecycle Phases',
        tag: 'Security Operations',
        definition:
          'A structured response methodology ensures security incidents are contained, eradicated, and documented without destroying forensic evidence.',
        characteristics: [
          'Follow the exact sequence: Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-Incident Activity.',
          'Isolate infected hosts via network segmentation (Containment) before wiping or patching (Eradication).',
          'Conduct a blameless Lessons Learned review during Post-Incident Activity to update runbooks and detection rules.',
        ],
      },
      {
        id: 'sec-crypto',
        title: 'Symmetric vs. Asymmetric Encryption & Hashing',
        tag: 'Cryptography',
        definition:
          'Modern protocols combine asymmetric key exchange, symmetric bulk encryption, and cryptographic hashes for CIA triad protection.',
        characteristics: [
          'Symmetric encryption (AES-256) uses one shared secret key for fast bulk data confidentiality.',
          'Asymmetric encryption (RSA, ECC) uses a public/private key pair for key exchange and digital signatures (non-repudiation).',
          'Cryptographic hashes (SHA-256) are one-way digests verifying file integrity—never reversible to recover plaintext.',
        ],
      },
      {
        id: 'sec-zt',
        title: 'Zero Trust Architecture & PAM Controls',
        tag: 'Security Architecture',
        definition:
          'Zero Trust eliminates implicit network trust by continuously verifying identity, device posture, and least-privilege access per request.',
        characteristics: [
          'Separates the Control Plane (Policy Engine / Policy Administrator) from the Data Plane (Policy Enforcement Point).',
          'Privileged Access Management (PAM) enforces Just-In-Time (JIT) elevation and session recording for admin accounts.',
          'Microsegmentation restricts east-west lateral movement inside internal networks and cloud VPCs.',
        ],
      },
    ],
  },
];

export default function StudyGuidesTab({ catalog, onSelectCert }) {
  const [selectedId, setSelectedId] = useState(STUDY_DECKS[0].id);
  const [expandedIds, setExpandedIds] = useState(() => new Set([STUDY_DECKS[0].topics[0].id]));
  const [reviewedIds, setReviewedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('certprep_reviewed_topics');
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('certprep_reviewed_topics', JSON.stringify(Array.from(reviewedIds)));
    } catch {
      // Ignore storage errors
    }
  }, [reviewedIds]);

  const activeDeck = STUDY_DECKS.find((d) => d.id === selectedId) || STUDY_DECKS[0];

  // Auto-expand first topic when switching certifications
  const handleSelectDeck = (deckId) => {
    setSelectedId(deckId);
    const deck = STUDY_DECKS.find((d) => d.id === deckId);
    if (deck?.topics?.[0]) {
      setExpandedIds(new Set([deck.topics[0].id]));
    }
  };

  const toggleExpand = (topicId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(activeDeck.topics.map((t) => t.id)));
  };

  const toggleReviewed = (e, topicId) => {
    e.stopPropagation();
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const reviewedCount = activeDeck.topics.filter((t) => reviewedIds.has(t.id)).length;
  const deckPct = Math.round((reviewedCount / activeDeck.topics.length) * 100);

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
          <span>Interactive Pre-Exam Concept Cards</span>
        </div>
        <h2 className="text-lg font-bold text-stone-900">
          Quick-Revision Concept Decks by Certification
        </h2>
        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
          Select an exam below to review crisp definitions and key architectural decision rules before taking a practice drill.
        </p>
      </div>

      {/* Certification Selector Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STUDY_DECKS.map((deck) => {
          const doneCount = deck.topics.filter((t) => reviewedIds.has(t.id)).length;
          const isSelected = deck.id === activeDeck.id;
          return (
            <button
              key={deck.id}
              onClick={() => handleSelectDeck(deck.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono border whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                  : 'bg-white text-emerald-900 border-stone-200 hover:border-emerald-400'
              }`}
            >
              <span>{deck.code}</span>
              {doneCount === deck.topics.length && (
                <Check className={`w-3 h-3 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Deck Progress & Controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
              {activeDeck.provider} • {activeDeck.code}
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1.5">{activeDeck.title}</h3>
          </div>

          <button
            onClick={() => handleOpenCert(activeDeck.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
          >
            Practice {activeDeck.code} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Revision Progress Bar */}
        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-stone-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              Revision Progress: <strong>{reviewedCount} / {activeDeck.topics.length}</strong> topics reviewed
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={expandAll}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Expand All
              </button>
              {reviewedCount > 0 && (
                <button
                  onClick={() => {
                    setReviewedIds((prev) => {
                      const next = new Set(prev);
                      activeDeck.topics.forEach((t) => next.delete(t.id));
                      return next;
                    });
                  }}
                  className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>
          <div className="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${deckPct}%` }}
            />
          </div>
        </div>

        {/* Interactive Concept Accordion Cards */}
        <div className="space-y-2.5">
          {activeDeck.topics.map((topic, index) => {
            const isExpanded = expandedIds.has(topic.id);
            const isReviewed = reviewedIds.has(topic.id);

            return (
              <div
                key={topic.id}
                className={`border rounded-xl transition ${
                  isExpanded
                    ? 'border-emerald-500/70 bg-white shadow-2xs'
                    : isReviewed
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(topic.id)}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isReviewed
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {isReviewed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block">
                        {topic.tag}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900 truncate">
                        {topic.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      onClick={(e) => toggleReviewed(e, topic.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        isReviewed
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-emerald-400'
                      }`}
                    >
                      {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-stone-100 space-y-3 text-xs">
                    <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                        Definition
                      </span>
                      <p className="text-stone-800 leading-relaxed font-medium">
                        {topic.definition}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-amber-600" /> Key Exam Characteristics
                      </span>
                      <ul className="space-y-1.5 text-stone-700 leading-relaxed">
                        {topic.characteristics.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}