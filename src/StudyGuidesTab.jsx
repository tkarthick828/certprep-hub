import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck, ChevronLeft, ChevronRight, ArrowRight,
  Check, RotateCcw, Layers, Sparkles, FlipHorizontal,
  LayoutGrid, Presentation, Lightbulb, HelpCircle, CheckCircle2
} from 'lucide-react';

const STUDY_DECKS = [
  {
    id: 'ccdv-f',
    code: 'CCDV-F',
    provider: 'Anthropic',
    title: 'Claude Certified Developer – Foundations',
    topics: [
      {
        id: 'ccdv-01',
        domain: 'Prompt Engineering',
        title: 'System Prompt vs. User Prompt Separation',
        definition:
          'The top-level system parameter defines persistent role, behavioral guardrails, and output schemas across the entire session, whereas user messages deliver turn-specific instructions and untrusted runtime data.',
        characteristics: [
          'System prompts take precedence over conflicting conversational phrasing in user turns.',
          'Keep static instructions and JSON/XML schemas in the system prompt to maximize prompt cache reuse.',
          'Wrap dynamic end-user inputs in explicit XML tags (e.g., <user_input>) inside the user turn to mitigate prompt injection.',
        ],
        examTip: 'Never concatenate untrusted user text directly into the system parameter string.',
        quickCheck: {
          question: 'Where should you place a 1,500-token JSON output schema used on every API call?',
          answer: 'In the top-level system parameter with a cache_control breakpoint—not repeated inside each user turn.',
        },
      },
      {
        id: 'ccdv-02',
        domain: 'Cost & Latency Optimization',
        title: 'Prompt Caching Breakpoints & Prefix Matching',
        definition:
          'Prompt caching stores the KV-cache of repeated prompt prefixes on Anthropic servers so subsequent requests skip redundant input token computation.',
        characteristics: [
          'Requires a 100% identical byte-for-byte prefix from the beginning of the request up to the cache_control: {"type": "ephemeral"} block.',
          'Minimum cacheable prefix length is 1,024 tokens for Claude Sonnet/Opus and 2,048 tokens for Claude Haiku.',
          'Always order prompt blocks from static to dynamic: Tools → System Prompt → Reference Documents → Chat History.',
        ],
        examTip: 'Changing even one character in a tool definition invalidates cached system and document blocks placed after it.',
        quickCheck: {
          question: 'Why did a 900-token system prompt fail to register cache hits despite cache_control being set?',
          answer: 'It is below the minimum cacheable token threshold (1,024 tokens for Sonnet/Opus; 2,048 tokens for Haiku).',
        },
      },
      {
        id: 'ccdv-03',
        domain: 'Applications & Integration',
        title: 'Deterministic Tool Use & tool_choice Modes',
        definition:
          'Tool use lets Claude emit structured JSON tool_use blocks to invoke external APIs, governed by the tool_choice parameter.',
        characteristics: [
          'tool_choice: {"type": "auto"} (default) lets Claude decide whether to call a tool or respond in plain text.',
          'tool_choice: {"type": "any"} forces Claude to invoke at least one registered tool—ideal for intent routing.',
          'tool_choice: {"type": "tool", "name": "extract_invoice"} forces a specific tool call, guaranteeing schema-compliant JSON output.',
        ],
        examTip: 'When Extended Thinking is enabled, only tool_choice "auto" or "none" is supported—forced tool_choice is disallowed.',
        quickCheck: {
          question: 'How do you guarantee Claude always returns structured JSON matching a single schema without conversational filler?',
          answer: 'Define a tool with that JSON input_schema and set tool_choice: {"type": "tool", "name": "<tool_name>"}.',
        },
      },
      {
        id: 'ccdv-04',
        domain: 'Applications & Integration',
        title: 'Parallel Tool Calls & tool_result Formatting',
        definition:
          'Claude can emit multiple tool_use blocks in a single assistant response, and every tool_use_id must receive a matching tool_result block in the very next user message.',
        characteristics: [
          'Set disable_parallel_tool_use: true inside tool_choice when downstream workflows require strictly sequential single-step calls.',
          'Every tool_result block must appear at the start of the next user turn before any follow-up text blocks.',
          'Return is_error: true inside tool_result with a clear recovery hint so Claude can self-correct invalid arguments.',
        ],
        examTip: 'Omitting even one tool_result for a parallel tool_use batch causes a 400 invalid_request_error.',
        quickCheck: {
          question: 'Claude emits 3 tool_use blocks in one turn. How must the application return the results?',
          answer: 'Send a single user message containing all 3 corresponding tool_result blocks matched by tool_use_id.',
        },
      },
      {
        id: 'ccdv-05',
        domain: 'Model Optimization',
        title: 'Message Batches API vs. Synchronous Messages',
        definition:
          'The Message Batches API processes thousands of independent requests asynchronously within 24 hours at a 50% input and output token discount.',
        characteristics: [
          'Ideal for overnight contract classification, catalog tagging, bulk summarization, and offline evals.',
          'Never use Batches for interactive user chat or workflows requiring sub-minute SLAs.',
          'Tag each batch item with a unique custom_id because results complete out of submission order.',
        ],
        examTip: 'If a scenario mentions "weekend/overnight processing" + "hitting HTTP 429 rate limits" + "budget constraint", pick Message Batches API.',
        quickCheck: {
          question: 'In what order are results returned when polling a completed Message Batch?',
          answer: 'Out of submission order—applications must correlate outputs using each item’s custom_id.',
        },
      },
      {
        id: 'ccdv-06',
        domain: 'Model Selection',
        title: 'Model Tier Routing (Haiku vs. Sonnet vs. Opus)',
        definition:
          'Routing requests across Claude model tiers balances intelligence, latency, and token cost per workload.',
        characteristics: [
          'Claude Haiku: lowest cost and fastest TTFT—best for high-volume classification, routing, and simple field extraction.',
          'Claude Sonnet: balanced intelligence and speed—best for production coding, RAG synthesis, and multi-step tool agents.',
          'Claude Opus: frontier reasoning—best for complex architectural planning, deep root-cause debugging, and nuanced synthesis.',
        ],
        examTip: 'Use a cascade pattern: classify/filter with Haiku first, escalating only ambiguous or complex cases to Sonnet/Opus.',
        quickCheck: {
          question: 'A pipeline classifies 500,000 support tickets per day into 6 categories. Which model tier fits best?',
          answer: 'Claude Haiku (optionally paired with Message Batches API for an additional 50% discount).',
        },
      },
      {
        id: 'ccdv-07',
        domain: 'Model Selection',
        title: 'Extended Thinking & budget_tokens',
        definition:
          'Extended Thinking allocates an internal reasoning scratchpad before Claude emits its final answer, bounded by budget_tokens.',
        characteristics: [
          'Best for multi-constraint optimization, complex SQL/code debugging, and mathematical proofs.',
          'budget_tokens must be at least 1,024 and strictly less than max_tokens.',
          'Thinking tokens are billed as output tokens; preserve thinking blocks across multi-turn tool loops when required.',
        ],
        examTip: 'Do not enable Extended Thinking on simple extraction or low-latency routing—it adds latency and output token cost.',
        quickCheck: {
          question: 'What happens if max_tokens is set to 2,000 and thinking.budget_tokens is set to 2,500?',
          answer: 'The API rejects the request with a validation error because budget_tokens must be less than max_tokens.',
        },
      },
      {
        id: 'ccdv-08',
        domain: 'Prompt Engineering',
        title: 'XML Delimiters & Multishot Few-Shot Prompting',
        definition:
          'Structuring prompts with semantic XML tags and concrete input/output examples eliminates ambiguity and stabilizes edge-case formatting.',
        characteristics: [
          'Separate instructions, reference context (<documents>), and examples (<examples>) using clear XML tags.',
          'Provide 2–4 diverse few-shot examples covering tricky edge cases (e.g., missing fields, null values, ambiguous dates).',
          'Explicitly instruct Claude when to abstain ("If the answer is not in <documents>, output INSUFFICIENT_DATA").',
        ],
        examTip: 'Few-shot examples are faster and cheaper to iterate on than fine-tuning when fixing formatting drift.',
        quickCheck: {
          question: 'Claude occasionally invents dates when a contract omits an expiration clause. What is the cleanest prompt fix?',
          answer: 'Add a few-shot example showing a contract without an expiration date mapped to "expiration_date": null.',
        },
      },
      {
        id: 'ccdv-09',
        domain: 'Applications & Integration',
        title: 'Streaming SSE Events & stop_reason Handling',
        definition:
          'Setting stream: true delivers incremental Server-Sent Events (SSE) to lower perceived latency, ending with a message_delta containing stop_reason.',
        characteristics: [
          'Key SSE lifecycle events: message_start → content_block_start → content_block_delta → content_block_stop → message_delta → message_stop.',
          'stop_reason: "end_turn" means natural completion; "tool_use" means the app must execute tools; "max_tokens" means truncation.',
          'Always inspect stop_reason === "max_tokens" before parsing JSON outputs to avoid truncated JSON parse crashes.',
        ],
        examTip: 'Streaming improves Time-To-First-Token (TTFT) UX, NOT token billing rates.',
        quickCheck: {
          question: 'Your JSON parser fails intermittently on long responses with "Unexpected end of JSON input". Which field diagnoses this?',
          answer: 'Check stop_reason === "max_tokens"—the output hit the token cap before closing the JSON object.',
        },
      },
      {
        id: 'ccdv-10',
        domain: 'Production Reliability',
        title: 'Rate Limits (HTTP 429), Backoff & Citations API',
        definition:
          'Production Claude integrations handle RPM/ITPM/OTPM rate limits gracefully and ground RAG answers with verifiable source citations.',
        characteristics: [
          'Read the retry-after response header on HTTP 429 and apply exponential backoff with random jitter.',
          'Enable citations: {"enabled": true} on document content blocks so Claude returns exact character/page source spans without inflating output tokens.',
          'Never retry 429s in a tight zero-delay loop, which amplifies rate-limit throttling.',
        ],
        examTip: 'Output Tokens Per Minute (OTPM) is often the tightest bottleneck when generating verbose outputs.',
        quickCheck: {
          question: 'What is the proper retry strategy when receiving HTTP 429 from the Messages API?',
          answer: 'Honor the retry-after header and use exponential backoff with randomized jitter.',
        },
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
        id: 'cca-01',
        domain: 'Agentic Architecture',
        title: 'Orchestrator–Subagent Context Isolation',
        definition:
          'A multi-agent architecture where a lead orchestrator delegates verbose subtasks to isolated subagents that return concise structured summaries.',
        characteristics: [
          'Keeps raw test logs, stack traces, and multi-file searches out of the lead orchestrator’s context window.',
          'Each subagent receives only the minimal tool set and instructions required for its scoped subtask.',
          'Independent subtasks (e.g., auditing 4 microservices) can execute in parallel subagents.',
        ],
        examTip: 'Spawn a subagent whenever a subtask produces thousands of tokens of intermediate noise.',
        quickCheck: {
          question: 'Why does a single monolithic agent degrade after running 15 verbose pytest suites in one loop?',
          answer: 'Context rot/bloat from accumulated stack traces crowds out key instructions; isolate test runs inside a subagent.',
        },
      },
      {
        id: 'cca-02',
        domain: 'Claude Code & Configuration',
        title: 'Deterministic Hooks vs. CLAUDE.md Guidance',
        definition:
          'CLAUDE.md supplies probabilistic project conventions, whereas PreToolUse and PostToolUse hooks run deterministic shell scripts around tool execution.',
        characteristics: [
          'Put build commands, repo conventions, and coding style in hierarchical CLAUDE.md files (enterprise → user → project).',
          'Use PreToolUse hooks (exit code 2 to block) for non-negotiable security guardrails like blocking edits to .env or production configs.',
          'Use PostToolUse hooks to automatically run linters, type-checkers, or formatters after every file write.',
        ],
        examTip: 'Whenever a requirement says "must NEVER happen" or "must ALWAYS execute", choose a deterministic Hook over CLAUDE.md text.',
        quickCheck: {
          question: 'An agent occasionally edits migration files despite a rule in CLAUDE.md. How do you enforce a hard block?',
          answer: 'Configure a PreToolUse hook that inspects the target file path and blocks writes to migrations/ with exit code 2.',
        },
      },
      {
        id: 'cca-03',
        domain: 'Tool Design & MCP',
        title: 'MCP Server Transports (stdio vs. Streamable HTTP)',
        definition:
          'Model Context Protocol (MCP) connects Claude to external tools and resources using either local process pipes or remote HTTP.',
        characteristics: [
          'Use stdio transport for local developer workstation servers accessing local files, git, or local databases.',
          'Use Streamable HTTP transport with scoped OAuth 2.1 tokens for centralized, multi-user enterprise MCP servers.',
          'Expose read-only reference data via MCP Resources and side-effecting operations via MCP Tools.',
        ],
        examTip: 'Never share stdio servers across remote network users—use Streamable HTTP with per-user OAuth.',
        quickCheck: {
          question: 'Which MCP transport should a shared internal Jira/Confluence MCP server deployed on Kubernetes use?',
          answer: 'Streamable HTTP transport authenticated with per-user OAuth tokens.',
        },
      },
      {
        id: 'cca-04',
        domain: 'Tool Design & MCP',
        title: 'Tool Consolidation & Schema Ergonomics',
        definition:
          'Well-designed agent toolsets minimize overlapping tool definitions and use self-documenting schemas to prevent tool-selection confusion.',
        characteristics: [
          'Consolidate fragmented CRUD endpoints (e.g., 8 separate search variants) into cohesive tools with clear enum parameters.',
          'Write detailed parameter descriptions explaining valid formats, units, and edge cases.',
          'Scope available tools per workflow stage rather than exposing 40+ tools simultaneously.',
        ],
        examTip: 'Too many similar tools increase input token overhead and cause the model to pick the wrong tool.',
        quickCheck: {
          question: 'An agent frequently confuses get_user_by_email, get_user_by_id, and lookup_account. What is the architectural fix?',
          answer: 'Consolidate them into a single lookup_user tool with an explicit identifier_type enum parameter.',
        },
      },
      {
        id: 'cca-05',
        domain: 'Production Resilience',
        title: 'Structured Error Payloads & Self-Correction Loops',
        definition:
          'Returning actionable, structured error messages from tools enables autonomous agents to recover without human intervention.',
        characteristics: [
          'Return is_error: true with specific remediation hints (e.g., "Invalid date format; expected YYYY-MM-DD") instead of raw 500 stack traces.',
          'Distinguish transient retryable errors (network timeout) from permanent business errors (insufficient balance).',
          'Enforce a hard max_iterations loop counter to prevent infinite retry loops on persistent failures.',
        ],
        examTip: 'Opaque errors ("Error: failed") cause agents to repeat the exact same failing call.',
        quickCheck: {
          question: 'What should a tool return when a user queries a non-existent order ID?',
          answer: 'A structured error payload stating the order ID was not found and suggesting searching by customer email instead.',
        },
      },
      {
        id: 'cca-06',
        domain: 'Context Management',
        title: 'Context Compaction & Structured Checkpoints',
        definition:
          'Long-horizon agents preserve reasoning quality by summarizing completed milestones into compact state objects and pruning raw tool logs.',
        characteristics: [
          'Persist verified decisions, file paths, and open TODOs into a structured checkpoint file or memory block.',
          'Clear bulky intermediate tool outputs once distilled into the checkpoint.',
          'Place critical invariants at the top and bottom of the prompt to avoid "lost-in-the-middle" degradation.',
        ],
        examTip: 'Never rely on raw unbounded conversation history for multi-hour coding or research workflows.',
        quickCheck: {
          question: 'How should an agent preserve findings across a 50-step repository migration without exceeding context limits?',
          answer: 'Write structured milestone summaries to a checkpoint artifact and compact older raw file-read turns.',
        },
      },
      {
        id: 'cca-07',
        domain: 'Human-in-the-Loop & Safety',
        title: 'Blast-Radius Control & Approval Gates',
        definition:
          'Production agents classify actions by reversibility and require explicit human approval before executing high-impact mutations.',
        characteristics: [
          'Allow read-only queries and reversible local edits to run autonomously.',
          'Pause execution and surface a structured diff/preview before destructive actions (DB drops, prod deploys, external emails).',
          'Apply least-privilege RBAC tokens scoped to the invoking user—never run agents with global super-admin credentials.',
        ],
        examTip: 'Always enforce permission checks in the tool/hook layer, not merely by asking the LLM to "be careful".',
        quickCheck: {
          question: 'A support agent can issue refunds up to $50 automatically, but refunds >$50 need manager sign-off. Where should the $50 limit be enforced?',
          answer: 'In the backend tool handler / PreToolUse hook, returning an approval-required status when amount > 50.',
        },
      },
      {
        id: 'cca-08',
        domain: 'Evaluation & Observability',
        title: 'Trajectory Evals & LLM-as-a-Judge',
        definition:
          'Evaluating agentic architectures requires grading both the final output and the intermediate sequence of tool calls (trajectory).',
        characteristics: [
          'Trajectory checks verify the agent called the expected tools in a valid order without redundant loops.',
          'Use deterministic assertions (schema validity, unit tests) first, and rubric-based LLM-as-a-Judge for open-ended quality.',
          'Capture OpenTelemetry traces across orchestrator and subagent spans to measure token cost and latency per step.',
        ],
        examTip: 'An agent that gets the right answer by calling 12 unnecessary tools fails a production trajectory eval.',
        quickCheck: {
          question: 'Why are final-answer-only benchmarks insufficient for evaluating multi-step tool agents?',
          answer: 'They miss inefficient tool loops, near-miss policy violations, and excessive token/latency regressions.',
        },
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
        id: 'saa-01',
        domain: 'Design Secure Architectures',
        title: 'VPC Gateway Endpoints vs. Interface Endpoints',
        definition:
          'VPC Endpoints route private-subnet traffic to AWS services privately over the AWS backbone without Internet or NAT Gateways.',
        characteristics: [
          'Gateway Endpoints are free, update VPC route tables, and support ONLY Amazon S3 and DynamoDB.',
          'Interface Endpoints (AWS PrivateLink) attach an ENI with a private IP in your subnet for SQS, KMS, Secrets Manager, and most AWS services.',
          'Routing large S3 backups via a Gateway Endpoint eliminates expensive NAT Gateway per-GB data processing fees.',
        ],
        examTip: 'S3 + DynamoDB + private subnet + cut NAT Gateway bill = VPC Gateway Endpoint.',
        quickCheck: {
          question: 'A private EC2 fleet transfers 50 TB/month to S3 through a NAT Gateway. What is the lowest-cost fix?',
          answer: 'Create an S3 VPC Gateway Endpoint and associate it with the private subnet route table.',
        },
      },
      {
        id: 'saa-02',
        domain: 'Design Resilient Architectures',
        title: 'SQS Standard vs. SQS FIFO vs. EventBridge',
        definition:
          'Managed messaging services decouple producers and consumers to absorb traffic spikes and isolate failures.',
        characteristics: [
          'SQS Standard: near-unlimited TPS, at-least-once delivery, best-effort ordering (requires idempotent consumers).',
          'SQS FIFO: strict first-in-first-out ordering within a MessageGroupId and deduplication within a 5-minute window.',
          'Amazon EventBridge: serverless event bus routing JSON events to multiple targets using content-filtering rules.',
        ],
        examTip: 'Need fan-out to multiple independent subscribers? Use SNS → multiple SQS queues or EventBridge.',
        quickCheck: {
          question: 'An order-processing pipeline requires strict sequence per customer account and zero duplicate charges. Which service fits?',
          answer: 'Amazon SQS FIFO using customer_id as the MessageGroupId.',
        },
      },
      {
        id: 'saa-03',
        domain: 'Design Resilient Architectures',
        title: 'RDS Multi-AZ vs. Read Replicas vs. Aurora Global',
        definition:
          'Database replication modes solve distinct requirements: high availability, read scaling, or cross-region disaster recovery.',
        characteristics: [
          'RDS Multi-AZ: synchronous replication to a standby in another AZ for automatic ~60s failover (standby does NOT serve reads).',
          'Read Replicas: asynchronous replication (same or cross-region) to offload read-heavy analytics and reporting.',
          'Aurora Global Database: storage-level cross-region replication with <1 second RPO and <1 minute RTO.',
        ],
        examTip: 'Multi-AZ = High Availability (writes); Read Replica = Read Scaling; Aurora Global = Sub-second Cross-Region DR.',
        quickCheck: {
          question: 'A reporting dashboard slows down your primary RDS PostgreSQL database every morning. How do you offload the reads?',
          answer: 'Create an RDS Read Replica and point the reporting dashboard connection string to the replica endpoint.',
        },
      },
      {
        id: 'saa-04',
        domain: 'Design Cost-Optimized Architectures',
        title: 'S3 Storage Classes & Lifecycle Policies',
        definition:
          'Amazon S3 tiers optimize storage spend based on access frequency, minimum storage duration, and retrieval time.',
        characteristics: [
          'S3 Intelligent-Tiering: automatically moves objects with unknown or changing access patterns across tiers with zero retrieval fees.',
          'S3 Glacier Instant Retrieval: millisecond retrieval for medical/compliance archives accessed once per quarter.',
          'S3 Glacier Deep Archive: lowest cost for 7–10 year regulatory retention with 12–48 hour restore times.',
        ],
        examTip: 'Unpredictable access patterns = S3 Intelligent-Tiering; rare access + instant millisecond read = Glacier Instant Retrieval.',
        quickCheck: {
          question: 'Healthcare images are rarely viewed after 30 days, but doctors need millisecond access when requested. Which tier fits?',
          answer: 'S3 Glacier Instant Retrieval.',
        },
      },
      {
        id: 'saa-05',
        domain: 'Design High-Performing Architectures',
        title: 'ALB vs. NLB vs. CloudFront + S3 OAC',
        definition:
          'Selecting the right load balancer and edge caching layer optimizes latency, protocol support, and origin security.',
        characteristics: [
          'Application Load Balancer (ALB): Layer 7 HTTP/HTTPS routing based on URL path, host header, or query string.',
          'Network Load Balancer (NLB): Layer 4 TCP/UDP ultra-low latency, static Elastic IPs, millions of requests/sec.',
          'CloudFront with Origin Access Control (OAC): caches static/dynamic content globally while keeping the S3 bucket completely private.',
        ],
        examTip: 'Need static IP addresses or non-HTTP TCP/UDP traffic? Choose NLB over ALB.',
        quickCheck: {
          question: 'How do you ensure users can only access S3 media files through CloudFront and never via direct S3 URLs?',
          answer: 'Configure CloudFront Origin Access Control (OAC) and restrict the S3 bucket policy to the CloudFront distribution ARN.',
        },
      },
      {
        id: 'saa-06',
        domain: 'Design Secure Architectures',
        title: 'IAM Roles, STS AssumeRole & Cross-Account Access',
        definition:
          'IAM Roles issue temporary, auto-rotated STS credentials instead of long-lived static IAM user access keys.',
        characteristics: [
          'Attach IAM Instance Profiles to EC2 and Execution Roles to Lambda/ECS—never store access keys in code or AMIs.',
          'Use STS AssumeRole with a Trust Policy to grant cross-account access to external auditors or partner accounts.',
          'Enforce a Condition key (aws:PrincipalOrgID or sts:ExternalId) to prevent confused-deputy attacks.',
        ],
        examTip: 'Whenever a question mentions long-term access keys on EC2 or third-party cross-account access, replace with an IAM Role.',
        quickCheck: {
          question: 'A third-party SaaS monitoring tool needs read-only access to your AWS account. What is the secure AWS best practice?',
          answer: 'Create a cross-account IAM Role with a trust policy specifying the vendor’s AWS account ID and an ExternalId condition.',
        },
      },
      {
        id: 'saa-07',
        domain: 'Design Resilient Architectures',
        title: 'Disaster Recovery Strategies (RPO vs. RTO)',
        definition:
          'AWS DR architectures balance infrastructure cost against Recovery Point Objective (data loss) and Recovery Time Objective (downtime).',
        characteristics: [
          'Backup & Restore: lowest cost, hours of RTO/RPO (S3 cross-region replication + scheduled snapshots).',
          'Pilot Light: core database replicated continuously in DR region; compute servers provisioned/scaled only during failover.',
          'Warm Standby: scaled-down fully functional copy running continuously; scales up rapidly for minutes-level RTO.',
        ],
        examTip: 'Pilot Light = DB running, app servers off; Warm Standby = scaled-down full stack running.',
        quickCheck: {
          question: 'Which DR pattern keeps an Aurora Global secondary cluster active while keeping DR EC2 Auto Scaling at 0 instances until failover?',
          answer: 'Pilot Light.',
        },
      },
      {
        id: 'saa-08',
        domain: 'Design High-Performing Architectures',
        title: 'EBS vs. EFS vs. FSx Storage Selection',
        definition:
          'AWS block and file storage services differ by AZ scope, concurrency, and OS protocol.',
        characteristics: [
          'Amazon EBS: high-IOPS block storage attached to a single EC2 instance within a single Availability Zone (gp3 for general, io2 for >64k IOPS).',
          'Amazon EFS: serverless elastic NFS file system shared concurrently across thousands of Linux EC2/ECS/Lambda instances across multiple AZs.',
          'Amazon FSx for Windows File Server: native SMB file system with Active Directory integration; FSx for Lustre for HPC/ML.',
        ],
        examTip: 'Multiple Linux instances across multiple AZs needing a shared POSIX file system = Amazon EFS.',
        quickCheck: {
          question: 'An Auto Scaling group of Linux web servers across 3 AZs needs a shared WordPress wp-content directory. Which storage fits?',
          answer: 'Amazon EFS.',
        },
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
        id: 'dva-01',
        domain: 'Development with AWS Services',
        title: 'DynamoDB Partition Keys, GSIs & LSIs',
        definition:
          'DynamoDB scales horizontally by hashing the Partition Key and supports secondary indexes for alternate query access patterns.',
        characteristics: [
          'Select high-cardinality partition keys (user_id, device_id) to distribute writes evenly and prevent ProvisionedThroughputExceededException.',
          'Global Secondary Index (GSI): created anytime, uses any partition/sort key, has its own RCU/WCU, supports eventual consistency only.',
          'Local Secondary Index (LSI): must be created at table creation, shares the base partition key, supports strong consistency.',
        ],
        examTip: 'Need a new query pattern on an existing DynamoDB table? Always use a GSI (LSIs cannot be added later).',
        quickCheck: {
          question: 'Can you add a Local Secondary Index (LSI) to an existing production DynamoDB table?',
          answer: 'No—LSIs can only be defined when the table is first created; use a Global Secondary Index (GSI) instead.',
        },
      },
      {
        id: 'dva-02',
        domain: 'Security',
        title: 'Secrets Manager vs. SSM Parameter Store',
        definition:
          'Both services decouple sensitive credentials from application code, differing in built-in rotation and cost.',
        characteristics: [
          'AWS Secrets Manager: natively rotates RDS, Redshift, and DocumentDB passwords on a schedule using Lambda.',
          'SSM Parameter Store: free Standard tier for hierarchical app config (/prod/app/url) and KMS-encrypted SecureStrings.',
          'Cache fetched secrets in Lambda global execution scope with a TTL to reduce API calls and cold-start latency.',
        ],
        examTip: 'Automatic 30-day database password rotation = AWS Secrets Manager.',
        quickCheck: {
          question: 'An auditor requires RDS MySQL credentials to rotate automatically every 30 days with zero custom rotation scripts. Which service?',
          answer: 'AWS Secrets Manager.',
        },
      },
      {
        id: 'dva-03',
        domain: 'Deployment',
        title: 'CodeDeploy Canary & Linear Traffic Shifting',
        definition:
          'AWS CodeDeploy shifts traffic progressively to new Lambda alias versions or ECS task sets with automated CloudWatch alarm rollbacks.',
        characteristics: [
          'Canary (e.g., Canary10Percent5Minutes): shifts 10% immediately, waits 5 minutes, then shifts the remaining 90%.',
          'Linear (e.g., Linear10PercentEvery1Minute): shifts 10% every minute until reaching 100%.',
          'Associate CloudWatch alarms (e.g., Lambda Errors > 0) to trigger automatic instant rollback to the prior version.',
        ],
        examTip: 'Lambda aliases + weighted traffic shifting + CloudWatch alarm rollback = AWS CodeDeploy.',
        quickCheck: {
          question: 'How does CodeDeploy know when to abort a Lambda canary rollout and revert traffic automatically?',
          answer: 'When any CloudWatch alarm configured in the deployment group enters the ALARM state.',
        },
      },
      {
        id: 'dva-04',
        domain: 'Development with AWS Services',
        title: 'Lambda Execution Context, Layers & Concurrency',
        definition:
          'Optimizing AWS Lambda involves reusing warm execution environments, packaging shared dependencies, and controlling concurrency.',
        characteristics: [
          'Initialize SDK clients and DB connections outside the handler function so warm invocations reuse them.',
          'Use Lambda Layers to share common libraries/runtimes across multiple functions and shrink deployment zip sizes.',
          'Reserved Concurrency caps max scale (protecting downstream RDS); Provisioned Concurrency eliminates cold starts.',
        ],
        examTip: 'Reserved Concurrency = throttle cap; Provisioned Concurrency = pre-warmed zero cold starts.',
        quickCheck: {
          question: 'A sudden Lambda spike overwhelms a downstream RDS database connection limit. Which Lambda setting protects RDS?',
          answer: 'Set Reserved Concurrency on the Lambda function to cap its maximum simultaneous executions (or add RDS Proxy).',
        },
      },
      {
        id: 'dva-05',
        domain: 'Troubleshooting & Optimization',
        title: 'AWS X-Ray Tracing & Annotations vs. Metadata',
        definition:
          'AWS X-Ray traces end-to-end requests across API Gateway, Lambda, SQS, and DynamoDB to isolate latency bottlenecks.',
        characteristics: [
          'Enable Active Tracing on Lambda and API Gateway and instrument downstream AWS SDK calls with the X-Ray SDK.',
          'Annotations are indexed key-value pairs (e.g., customer_tier) usable in X-Ray filter expressions.',
          'Metadata is unindexed arbitrary JSON payloads stored for debugging but not searchable in filters.',
        ],
        examTip: 'Need to filter X-Ray traces by tenant_id or order_status? Use Annotations, not Metadata.',
        quickCheck: {
          question: 'What is the difference between X-Ray Annotations and X-Ray Metadata?',
          answer: 'Annotations are indexed for search/filtering traces; Metadata is unindexed debug data.',
        },
      },
      {
        id: 'dva-06',
        domain: 'Development with AWS Services',
        title: 'API Gateway Authorizers & Caching',
        definition:
          'Amazon API Gateway secures REST/HTTP endpoints and caches backend responses to reduce Lambda/backend load.',
        characteristics: [
          'Cognito User Pool Authorizer validates JWT identity tokens natively with zero custom code.',
          'Lambda Authorizer executes custom bearer-token/OAuth validation and returns an IAM policy cached by TTL.',
          'Enable API Gateway Stage Caching with a TTL to serve repeated GET responses directly from the edge.',
        ],
        examTip: 'Clients can bypass API Gateway cache by sending Cache-Control: max-age=0 unless blocked by IAM.',
        quickCheck: {
          question: 'Which API Gateway authorizer requires no custom code to authenticate users signing in via Amazon Cognito?',
          answer: 'Cognito User Pool Authorizer.',
        },
      },
      {
        id: 'dva-07',
        domain: 'Development with AWS Services',
        title: 'DynamoDB Streams + Lambda Event Source Mapping',
        definition:
          'DynamoDB Streams capture an ordered sequence of item-level changes (INSERT, MODIFY, REMOVE) for 24 hours to trigger event-driven workflows.',
        characteristics: [
          'Stream view types: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, and NEW_AND_OLD_IMAGES.',
          'Lambda polls DynamoDB Streams synchronously; configure On-Failure destination (SQS/SNS) and BisectBatchOnFunctionError to isolate poison-pill records.',
          'Ideal for real-time audit logs, materialized aggregations, and OpenSearch index synchronization.',
        ],
        examTip: 'Enable BisectBatchOnFunctionError so one malformed record does not block an entire DynamoDB Stream shard.',
        quickCheck: {
          question: 'How do you prevent a single corrupt record in a DynamoDB Stream batch from stalling Lambda retries?',
          answer: 'Enable BisectBatchOnFunctionError and configure an SQS/SNS dead-letter On-Failure destination.',
        },
      },
      {
        id: 'dva-08',
        domain: 'Security',
        title: 'KMS Envelope Encryption & Data Keys',
        definition:
          'AWS KMS uses envelope encryption to protect large payloads locally without sending entire files over the network to KMS.',
        characteristics: [
          'Call kms:GenerateDataKey to receive a plaintext data key (to encrypt data locally via AES-256) and an encrypted data key (stored alongside ciphertext).',
          'Discard the plaintext data key from memory immediately after encrypting the payload.',
          'KMS Direct Encrypt API is limited to 4 KB payloads—use Envelope Encryption for anything larger.',
        ],
        examTip: 'Payload > 4 KB = kms:GenerateDataKey (Envelope Encryption).',
        quickCheck: {
          question: 'Why does kms:Encrypt fail on a 50 KB JSON document?',
          answer: 'Direct KMS Encrypt supports a maximum of 4 KB; use kms:GenerateDataKey for envelope encryption.',
        },
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
        id: 'az-01',
        domain: 'Azure Architecture & Services',
        title: 'Azure Governance Scope Hierarchy',
        definition:
          'Azure organizes cloud resources in a four-level hierarchy where RBAC roles and Azure Policies inherit downward.',
        characteristics: [
          'Exact order: Management Groups → Subscriptions → Resource Groups → Individual Resources.',
          'A resource belongs to only one Resource Group, but resources inside the same group can live in different Azure regions.',
          'Resource Locks (CanNotDelete or ReadOnly) block deletion/modification even for users with Owner RBAC permissions.',
        ],
        examTip: 'Deleting a Resource Group deletes EVERY resource inside it simultaneously.',
        quickCheck: {
          question: 'Can an Azure Resource Group in East US contain a Virtual Machine deployed in West Europe?',
          answer: 'Yes—Resource Groups store metadata in their home region but can contain resources from any region.',
        },
      },
      {
        id: 'az-02',
        domain: 'Azure Architecture & Services',
        title: 'Availability Zones vs. Region Pairs',
        definition:
          'Azure isolates physical infrastructure failures both inside a single region and across geographic regions.',
        characteristics: [
          'Availability Zones are physically separate datacenters within an Azure region with independent power, cooling, and networking.',
          'Region Pairs link two regions at least 300 miles apart within the same geography for sequential updates and GRS storage replication.',
          'Deploying VMs across 2+ Availability Zones raises Azure SLA uptime to 99.99%.',
        ],
        examTip: 'Availability Zones protect against datacenter failure; Region Pairs protect against regional natural disasters.',
        quickCheck: {
          question: 'Which Azure resilience feature protects an application if an entire datacenter loses power within a single region?',
          answer: 'Availability Zones.',
        },
      },
      {
        id: 'az-03',
        domain: 'Cloud Concepts',
        title: 'CapEx vs. OpEx & Shared Responsibility Model',
        definition:
          'Cloud migration shifts upfront Capital Expenditure (CapEx) to pay-as-you-go Operational Expenditure (OpEx) while splitting security duties.',
        characteristics: [
          'Physical datacenter, host network, and hypervisor security are ALWAYS Microsoft’s responsibility.',
          'Customer data, accounts/identities, and endpoints are ALWAYS the customer’s responsibility.',
          'In IaaS (Azure VMs), the customer patches the guest OS; in PaaS (App Service) and SaaS (M365), Microsoft patches the OS.',
        ],
        examTip: 'Under IaaS, OS patching is YOUR job; under PaaS/SaaS, OS patching is MICROSOFT’s job.',
        quickCheck: {
          question: 'Who is responsible for patching the Windows Server OS on an Azure Virtual Machine (IaaS)?',
          answer: 'The customer.',
        },
      },
      {
        id: 'az-04',
        domain: 'Azure Management & Governance',
        title: 'Azure Policy vs. Role-Based Access Control (RBAC)',
        definition:
          'RBAC controls WHO can perform actions on resources, while Azure Policy enforces WHAT properties resources must comply with.',
        characteristics: [
          'Use RBAC to grant a developer Contributor access to a specific Resource Group.',
          'Use Azure Policy to enforce allowed VM SKUs, require cost-center tags, or restrict deployments to approved regions.',
          'Non-compliant existing resources are flagged in the Azure Policy compliance dashboard and can be auto-remediated.',
        ],
        examTip: 'Who can do what = RBAC; Which regions/SKUs/tags are allowed = Azure Policy.',
        quickCheck: {
          question: 'How do you prevent even Subscription Owners from deploying expensive GPU VMs in unauthorized regions?',
          answer: 'Assign an Azure Policy restricting allowed VM SKUs and allowed locations.',
        },
      },
      {
        id: 'az-05',
        domain: 'Azure Architecture & Services',
        title: 'Microsoft Entra ID, MFA & Conditional Access',
        definition:
          'Microsoft Entra ID (formerly Azure AD) is Azure’s cloud identity provider enforcing Zero Trust authentication.',
        characteristics: [
          'Single Sign-On (SSO) lets users authenticate once to access Azure, Microsoft 365, and third-party SaaS apps.',
          'Multi-Factor Authentication (MFA) requires two or more verification factors (password + authenticator app/biometric).',
          'Conditional Access evaluates signals (user risk, device compliance, IP location) to allow, require MFA, or block sign-in.',
        ],
        examTip: 'Conditional Access = "If signing in from an unmanaged device or unfamiliar country, require MFA or block".',
        quickCheck: {
          question: 'Which Entra ID feature blocks sign-ins from non-compliant devices outside corporate IP ranges?',
          answer: 'Conditional Access.',
        },
      },
      {
        id: 'az-06',
        domain: 'Azure Management & Governance',
        title: 'Azure Pricing Calculator vs. TCO Calculator',
        definition:
          'Azure provides distinct cost-planning tools for estimating new cloud builds versus comparing on-premises migrations.',
        characteristics: [
          'Azure Pricing Calculator estimates monthly OpEx for specific configured Azure services (VMs, Storage, Bandwidth).',
          'Total Cost of Ownership (TCO) Calculator compares existing on-premises datacenter costs (power, cooling, hardware, IT labor) against Azure.',
          'Azure Reservations (1 or 3 years) and Azure Hybrid Benefit (reusing Windows/SQL licenses) lower ongoing compute costs.',
        ],
        examTip: 'Compare on-prem vs. Azure = TCO Calculator; Estimate cost of new Azure VMs = Pricing Calculator.',
        quickCheck: {
          question: 'A CFO wants to see 5-year savings of shutting down an on-premises datacenter and moving to Azure. Which tool do you use?',
          answer: 'Azure Total Cost of Ownership (TCO) Calculator.',
        },
      },
      {
        id: 'az-07',
        domain: 'Azure Architecture & Services',
        title: 'Azure Storage Redundancy (LRS, ZRS, GRS, GZRS)',
        definition:
          'Azure Storage replicates data synchronously locally and optionally asynchronously to a paired secondary region.',
        characteristics: [
          'LRS (Locally Redundant): 3 synchronous copies inside a single datacenter (lowest cost, no AZ protection).',
          'ZRS (Zone-Redundant): 3 synchronous copies across 3 Availability Zones in the primary region.',
          'GRS / GZRS: replicates to a paired region 300+ miles away; add RA-GRS for read access to the secondary region.',
        ],
        examTip: 'Minimum durability in a single datacenter = LRS; survive full region outage = GRS or GZRS.',
        quickCheck: {
          question: 'Which Azure Storage redundancy option keeps 3 synchronous copies across separate Availability Zones in one region?',
          answer: 'Zone-Redundant Storage (ZRS).',
        },
      },
      {
        id: 'az-08',
        domain: 'Azure Management & Governance',
        title: 'Azure Portal, CLI, PowerShell & ARM / Bicep',
        definition:
          'Azure Resource Manager (ARM) is the unified deployment layer behind every portal click, CLI command, and IaC template.',
        characteristics: [
          'Azure CLI (bash) and Azure PowerShell automate cross-platform administration tasks.',
          'ARM Templates (JSON) and Azure Bicep provide declarative Infrastructure as Code (IaC) for repeatable deployments.',
          'Azure Arc extends Azure governance, Policy, and Defender management to on-premises and multi-cloud servers.',
        ],
        examTip: 'Manage on-premises or AWS servers from the Azure control plane = Azure Arc.',
        quickCheck: {
          question: 'Which Azure service lets you apply Azure Policy and monitoring to Windows/Linux servers running in your on-premises datacenter?',
          answer: 'Azure Arc.',
        },
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
        id: 'gcp-01',
        domain: 'Configuring Access & Security',
        title: 'IAM Resource Hierarchy & Service Accounts',
        definition:
          'Google Cloud IAM binds principals to roles at Organization, Folder, Project, or Resource levels, inheriting allow permissions downward.',
        characteristics: [
          'Prefer Predefined or Custom IAM roles over Basic roles (Owner, Editor, Viewer) to enforce least privilege.',
          'Attach Service Accounts directly to Compute Engine VMs and Cloud Run services instead of downloading JSON key files.',
          'IAM Deny policies evaluated at Organization/Folder/Project levels override any inherited Allow policies.',
        ],
        examTip: 'Downloading service account JSON keys is an anti-pattern—always attach the service account to the workload.',
        quickCheck: {
          question: 'A Compute Engine VM needs to write objects to a Cloud Storage bucket. What is the recommended GCP IAM approach?',
          answer: 'Attach a dedicated Service Account with roles/storage.objectCreator directly to the VM.',
        },
      },
      {
        id: 'gcp-02',
        domain: 'Planning & Configuring a Cloud Solution',
        title: 'Global VPC Networks & Regional Subnets',
        definition:
          'A Google Cloud VPC is a global resource spanning all regions, while its subnets are regional IP ranges.',
        characteristics: [
          'VMs in us-central1 and europe-west1 inside the same VPC communicate over private internal IPs without VPN or peering.',
          'VPC firewall rules are stateful and can target VMs using network tags or attached service accounts.',
          'Use Cloud NAT to provide outbound internet access for private VMs without external IP addresses.',
        ],
        examTip: 'Target firewall rules by Service Account rather than network tags when strict IAM control is required.',
        quickCheck: {
          question: 'Do you need VPC Network Peering for a VM in Tokyo to reach a VM in Iowa inside the same Google Cloud VPC?',
          answer: 'No—Google Cloud VPCs are global, so subnets across all regions route privately by default.',
        },
      },
      {
        id: 'gcp-03',
        domain: 'Deploying & Implementing a Cloud Solution',
        title: 'Cloud Run vs. GKE Autopilot vs. Compute Engine',
        definition:
          'Google Cloud compute platforms range from full OS virtual machines to managed Kubernetes and serverless containers.',
        characteristics: [
          'Cloud Run: serverless stateless containers handling HTTP/Pub/Sub events, scaling automatically from 0 to N.',
          'GKE Autopilot: fully managed Kubernetes where Google provisions nodes, autoscaling, and security patches.',
          'Compute Engine: custom virtual machines for stateful legacy apps, custom kernels, or local SSD workloads.',
        ],
        examTip: 'Stateless container + scale to zero = Cloud Run; full Kubernetes manifests/sidecars = GKE.',
        quickCheck: {
          question: 'A team has a containerized REST API with sporadic traffic that should cost $0 when idle. Which GCP compute service fits?',
          answer: 'Cloud Run.',
        },
      },
      {
        id: 'gcp-04',
        domain: 'Ensuring Successful Operation',
        title: 'Cloud Storage Classes & Object Lifecycle Rules',
        definition:
          'Google Cloud Storage offers four storage classes with the same millisecond latency and unified API, differing in minimum storage duration.',
        characteristics: [
          'Standard: hot data with no minimum storage duration or retrieval fees.',
          'Nearline (30-day min): backups and data accessed less than once per month.',
          'Coldline (90-day min) and Archive (365-day min): disaster recovery and multi-year regulatory compliance.',
        ],
        examTip: 'Unlike AWS Glacier, GCP Coldline and Archive still offer millisecond first-byte latency—the tradeoff is minimum storage days and retrieval fees.',
        quickCheck: {
          question: 'Which Cloud Storage class is best for compliance records accessed once a year and retained for 7 years?',
          answer: 'Archive Storage (365-day minimum duration).',
        },
      },
      {
        id: 'gcp-05',
        domain: 'Setting Up a Cloud Solution Environment',
        title: 'gcloud CLI Configuration & Project Context',
        definition:
          'The gcloud CLI manages Google Cloud resources using named configurations for accounts, default projects, and compute zones.',
        characteristics: [
          'Use gcloud config configurations create/activate to switch cleanly between dev, staging, and prod projects.',
          'Pass --project=<PROJECT_ID> on individual commands to override the active configuration safely.',
          'Enable required service APIs per project using gcloud services enable <api>.googleapis.com.',
        ],
        examTip: 'Always verify gcloud config list before running destructive resource commands.',
        quickCheck: {
          question: 'Which gcloud command creates a separate named profile for switching between production and staging projects?',
          answer: 'gcloud config configurations create <name>',
        },
      },
      {
        id: 'gcp-06',
        domain: 'Deploying & Implementing a Cloud Solution',
        title: 'Cloud SQL vs. Cloud Spanner vs. Firestore vs. BigQuery',
        definition:
          'Choosing the right GCP database depends on relational transactions, global horizontal scale, document model, or analytics.',
        characteristics: [
          'Cloud SQL: managed MySQL, PostgreSQL, and SQL Server for regional relational workloads up to 64 TB.',
          'Cloud Spanner: globally distributed, strongly consistent relational SQL database with 99.999% SLA.',
          'BigQuery: serverless petabyte-scale SQL data warehouse for OLAP analytics (never for low-latency OLTP transactions).',
        ],
        examTip: 'Global relational transactions + strong consistency = Cloud Spanner; petabyte analytics = BigQuery.',
        quickCheck: {
          question: 'A global banking ledger requires strongly consistent SQL transactions across 3 continents with 99.999% availability. Which database?',
          answer: 'Cloud Spanner.',
        },
      },
      {
        id: 'gcp-07',
        domain: 'Ensuring Successful Operation',
        title: 'Cloud Audit Logs & Cloud Monitoring Alerts',
        definition:
          'Cloud Logging and Cloud Monitoring provide tamper-evident audit trails and metric-based alerting across GCP projects.',
        characteristics: [
          'Admin Activity logs record resource creation/IAM changes, are enabled by default, and cannot be disabled.',
          'Data Access logs record read/write operations on user data (e.g., GCS object reads) and must be explicitly enabled.',
          'Export logs long-term to Cloud Storage or BigQuery using Log Router Sinks.',
        ],
        examTip: 'Admin Activity logs are always on and free; Data Access logs are off by default (except BigQuery) to control log volume.',
        quickCheck: {
          question: 'Which Cloud Audit Log category records who modified an IAM policy or deleted a VM instance?',
          answer: 'Admin Activity Audit Logs.',
        },
      },
      {
        id: 'gcp-08',
        domain: 'Deploying & Implementing a Cloud Solution',
        title: 'Managed Instance Groups (MIGs) & Global HTTP(S) Load Balancing',
        definition:
          'Managed Instance Groups autoscale identical Compute Engine VMs behind a single anycast global IP address.',
        characteristics: [
          'Regional MIGs spread VMs across multiple zones in a region for automatic zonal failover and autohealing.',
          'Global External Application Load Balancer uses a single anycast IPv4/IPv6 address and routes traffic to the closest healthy region.',
          'Perform zero-downtime rolling updates or canary rollouts via MIG instance templates.',
        ],
        examTip: 'One global anycast IP routing users to the nearest GCP region = Global External Application Load Balancer.',
        quickCheck: {
          question: 'How do you automatically recreate an unresponsive VM inside a Managed Instance Group?',
          answer: 'Configure an HTTP/HTTPS health check for MIG Autohealing.',
        },
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
        id: 'aif-01',
        domain: 'Fundamentals of Foundation Models',
        title: 'RAG vs. Fine-Tuning vs. Continued Pre-Training',
        definition:
          'Customizing foundation models depends on whether the gap is fresh factual knowledge, task behavior, or domain vocabulary.',
        characteristics: [
          'RAG (Amazon Bedrock Knowledge Bases): injects up-to-date private documents at query time with source citations.',
          'Supervised Fine-Tuning: trains on labeled prompt-response pairs to adopt specialized tone, structure, or classification style.',
          'Continued Pre-Training: trains on unlabeled domain text (e.g., legal/medical corpora) to deepen domain vocabulary.',
        ],
        examTip: 'Frequently changing facts + source citations + lowest cost = RAG (never fine-tuning).',
        quickCheck: {
          question: 'A company updates its HR policy PDFs weekly and needs accurate answers with document citations. Which approach fits?',
          answer: 'Retrieval-Augmented Generation (RAG) using Amazon Bedrock Knowledge Bases.',
        },
      },
      {
        id: 'aif-02',
        domain: 'Security, Compliance & Governance',
        title: 'Amazon Bedrock Guardrails & Hallucination Mitigation',
        definition:
          'Amazon Bedrock Guardrails apply uniform safety, PII redaction, and factual grounding checks across any Bedrock foundation model.',
        characteristics: [
          'Blocks denied topics, filters harmful content categories, and masks/redacts PII (SSNs, emails, phone numbers).',
          'Contextual Grounding checks verify responses are supported by retrieved RAG source context to block hallucinations.',
          'Word filters block custom profanity or competitor names.',
        ],
        examTip: 'Need cross-model PII redaction + RAG hallucination detection on AWS = Amazon Bedrock Guardrails.',
        quickCheck: {
          question: 'Which Bedrock Guardrails feature detects when a RAG answer contradicts or invents facts outside the retrieved source chunks?',
          answer: 'Contextual Grounding check.',
        },
      },
      {
        id: 'aif-03',
        domain: 'Fundamentals of Generative AI',
        title: 'Inference Parameters (Temperature, Top-P, Top-K)',
        definition:
          'Sampling parameters control randomness and token diversity when a foundation model predicts the next token.',
        characteristics: [
          'Temperature (0.0–1.0+): lower values (0.0–0.2) make outputs deterministic for extraction/code; higher values increase creativity.',
          'Top-P (Nucleus Sampling): restricts token selection to the smallest vocabulary subset whose cumulative probability reaches P.',
          'Top-K: restricts candidate selection to the K highest-probability next tokens.',
        ],
        examTip: 'Deterministic SQL/JSON extraction = set Temperature near 0.',
        quickCheck: {
          question: 'An insurance extraction pipeline produces inconsistent JSON keys across identical runs. Which parameter should you lower?',
          answer: 'Lower Temperature toward 0.0.',
        },
      },
      {
        id: 'aif-04',
        domain: 'Applications of Foundation Models',
        title: 'Embeddings, Vector Databases & Chunking Strategy',
        definition:
          'Embedding models convert text/images into dense numerical vectors so semantic similarity search retrieves relevant context for RAG.',
        characteristics: [
          'Amazon Titan Text Embeddings and Cohere Embed generate vector representations stored in OpenSearch Serverless, Aurora pgvector, or Pinecone.',
          'Smaller chunks (256–512 tokens) improve retrieval precision; larger chunks preserve broader narrative context.',
          'Include 10–20% chunk overlap so sentences split across chunk boundaries retain context.',
        ],
        examTip: 'Semantic search finds conceptually related passages even when exact keywords do not match.',
        quickCheck: {
          question: 'Why do RAG pipelines include a 15% token overlap between adjacent document chunks?',
          answer: 'To prevent facts spanning a chunk boundary from being severed and missed during retrieval.',
        },
      },
      {
        id: 'aif-05',
        domain: 'Guidelines for Responsible AI',
        title: 'Model Evaluation Metrics (ROUGE, BLEU, BERTScore, F1)',
        definition:
          'Evaluating AI systems requires matching quantitative metrics to the task type (summarization, translation, or classification).',
        characteristics: [
          'ROUGE: measures n-gram recall overlap against reference summaries (text summarization).',
          'BLEU: measures n-gram precision against reference translations (machine translation).',
          'BERTScore: uses contextual embeddings to measure semantic similarity even when synonyms are used.',
        ],
        examTip: 'Summarization = ROUGE; Translation = BLEU; Imbalanced binary classification = Precision, Recall, and F1-Score.',
        quickCheck: {
          question: 'Which automated metric is standard for evaluating foundation model text summarization quality?',
          answer: 'ROUGE (e.g., ROUGE-1, ROUGE-2, ROUGE-L).',
        },
      },
      {
        id: 'aif-06',
        domain: 'Fundamentals of AI & ML',
        title: 'Supervised vs. Unsupervised vs. Reinforcement Learning',
        definition:
          'Classical ML paradigms differ by whether training data contains ground-truth labels or environment reward signals.',
        characteristics: [
          'Supervised Learning: learns from labeled input-output pairs (fraud detection, house price regression).',
          'Unsupervised Learning: discovers hidden patterns in unlabeled data (K-Means customer segmentation, anomaly detection).',
          'Reinforcement Learning (RL / RLHF): an agent learns optimal actions by maximizing cumulative reward signals.',
        ],
        examTip: 'Predicting a continuous number = Regression; predicting discrete categories = Classification; grouping unlabeled users = Clustering.',
        quickCheck: {
          question: 'A retailer wants to group 2 million shoppers into behavioral segments without predefined labels. Which ML paradigm applies?',
          answer: 'Unsupervised Learning (Clustering).',
        },
      },
      {
        id: 'aif-07',
        domain: 'Guidelines for Responsible AI',
        title: 'Bias, Fairness, Explainability & SageMaker Clarify',
        definition:
          'Responsible AI governance detects training data bias, explains model predictions, and documents model lineage.',
        characteristics: [
          'Amazon SageMaker Clarify detects pre-training data bias and post-training prediction bias across demographic groups.',
          'SHAP (SHapley Additive exPlanations) values quantify how much each input feature contributed to a prediction.',
          'AWS AI Service Cards and SageMaker Model Cards document intended use cases, limitations, and benchmark metrics.',
        ],
        examTip: 'Bias detection + feature attribution explainability on AWS = Amazon SageMaker Clarify.',
        quickCheck: {
          question: 'Which AWS tool detects class imbalance bias before training and explains individual model predictions using SHAP values?',
          answer: 'Amazon SageMaker Clarify.',
        },
      },
      {
        id: 'aif-08',
        domain: 'Security, Compliance & Governance',
        title: 'Amazon Bedrock Data Privacy & Provisioned Throughput',
        definition:
          'Amazon Bedrock isolates customer prompts/responses and offers flexible inference pricing tiers.',
        characteristics: [
          'Customer prompts and completions are encrypted in transit/at rest and are NEVER used to train base foundation models.',
          'On-Demand pricing charges per input/output token with no commitment—best for variable traffic.',
          'Provisioned Throughput reserves dedicated model units for predictable high-volume workloads or custom fine-tuned models.',
        ],
        examTip: 'Custom fine-tuned models on Amazon Bedrock require Provisioned Throughput for inference.',
        quickCheck: {
          question: 'Which Bedrock pricing model is required to host and invoke a custom fine-tuned model?',
          answer: 'Provisioned Throughput.',
        },
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
        id: 'gh-01',
        domain: 'Prompt Engineering & Context',
        title: 'How Copilot Builds Prompt Context',
        definition:
          'GitHub Copilot constructs prompts dynamically from the cursor location, open editor tabs, neighboring files, and chat context.',
        characteristics: [
          'Keep related interface definitions, type schemas, and sample tests open in adjacent editor tabs.',
          'Write clear function names, type annotations, and descriptive docstrings before generating implementations.',
          'Provide concrete input/output examples in comments (few-shot prompting) for complex regex or data transformations.',
        ],
        examTip: 'Closing irrelevant tabs and opening the target interface file immediately improves inline completion relevance.',
        quickCheck: {
          question: 'How does Copilot discover custom TypeScript interfaces defined in another file of your repo?',
          answer: 'By prioritizing open editor tabs and semantically related neighboring files in the workspace.',
        },
      },
      {
        id: 'gh-02',
        domain: 'Customization & Workflows',
        title: 'Repository Custom Instructions (.github/copilot-instructions.md)',
        definition:
          'Repository-level custom instructions automatically prepend team coding standards and tech stack rules to Copilot Chat prompts.',
        characteristics: [
          'Store team-wide guidelines in .github/copilot-instructions.md at the root of the repository.',
          'Specify preferred test frameworks (e.g., Vitest vs. Jest), error-handling conventions, and API patterns.',
          'Use prompt files (.github/prompts/*.prompt.md) for reusable task-specific workflows like PR checklists.',
        ],
        examTip: 'Custom instructions apply automatically to Copilot Chat in that repo without repeating rules in every prompt.',
        quickCheck: {
          question: 'Where should you commit team-wide Copilot Chat conventions so every contributor inherits them automatically?',
          answer: '.github/copilot-instructions.md',
        },
      },
      {
        id: 'gh-03',
        domain: 'Developer Productivity',
        title: 'Copilot Chat Participants & Slash Commands',
        definition:
          'Chat participants (@workspace, @terminal, @vscode) and slash commands (/tests, /fix, /explain, /doc) scope Copilot Chat to specific contexts.',
        characteristics: [
          '@workspace indexes the full repository to answer multi-file architecture and cross-module questions.',
          '/tests generates unit tests matching existing test patterns; /fix proposes patches for compiler/runtime errors.',
          '@terminal inspects shell commands and diagnoses CLI error output.',
        ],
        examTip: 'Use @workspace when a question spans multiple files rather than just the active selection.',
        quickCheck: {
          question: 'Which chat participant should you invoke to ask where authentication middleware is wired across the entire repository?',
          answer: '@workspace',
        },
      },
      {
        id: 'gh-04',
        domain: 'Privacy, Security & Governance',
        title: 'Content Exclusions & Public Code Matching Filter',
        definition:
          'GitHub Copilot Business and Enterprise offer administrative controls to protect confidential files and prevent public code duplication.',
        characteristics: [
          'Content Exclusions block Copilot from reading or suggesting code in specified file paths (e.g., secrets/**, *.env, keys/*).',
          'Public code matching filter suppresses suggestions that verbatim match ~150+ characters of public GitHub repositories.',
          'Business and Enterprise tiers exclude customer prompts and suggestions from training GitHub’s base models.',
        ],
        examTip: 'Content Exclusions configured at the Organization level cannot be overridden by individual repository admins.',
        quickCheck: {
          question: 'How do you prevent Copilot from indexing or suggesting completions inside a repository’s /compliance-secrets folder?',
          answer: 'Configure Content Exclusions in repository or organization Copilot settings.',
        },
      },
      {
        id: 'gh-05',
        domain: 'Responsible AI & Code Quality',
        title: 'Copilot Code Review, Autofix & Limitations',
        definition:
          'AI-generated code accelerates development but requires human verification, security scanning, and test validation.',
        characteristics: [
          'Copilot can hallucinate deprecated library APIs or subtle edge-case bugs if prompts lack version context.',
          'Pair Copilot with GitHub Advanced Security (CodeQL + Secret Scanning) to catch vulnerabilities before merge.',
          'Copilot Autofix suggests targeted remediation patches for CodeQL security alerts in pull requests.',
        ],
        examTip: 'Developers remain accountable for reviewing, testing, and licensing compliance of all Copilot-assisted code.',
        quickCheck: {
          question: 'Which GitHub feature automatically generates remediation suggestions for CodeQL security alerts on a Pull Request?',
          answer: 'GitHub Copilot Autofix.',
        },
      },
      {
        id: 'gh-06',
        domain: 'Plans & Enterprise Administration',
        title: 'Copilot Individual vs. Business vs. Enterprise',
        definition:
          'GitHub Copilot tiers differ in centralized policy governance, audit logging, and organization-wide knowledge bases.',
        characteristics: [
          'Copilot Business adds org-wide policy management, Content Exclusions, audit logs, and IP indemnity.',
          'Copilot Enterprise adds organization Knowledge Bases (indexing internal docs/Markdown) and PR summary generation.',
          'Usage Metrics API tracks seat adoption, acceptance rates, and language breakdowns across teams.',
        ],
        examTip: 'Need Copilot Chat grounded in internal Markdown documentation sets across multiple repos? Choose Copilot Enterprise.',
        quickCheck: {
          question: 'Which Copilot plan introduces custom organization Knowledge Bases for indexing internal engineering documentation?',
          answer: 'GitHub Copilot Enterprise.',
        },
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
        id: 'sec-01',
        domain: 'Security Operations',
        title: 'NIST Incident Response Lifecycle Phases',
        definition:
          'A structured four-phase incident response framework ensures breaches are contained, eradicated, and documented while preserving forensic integrity.',
        characteristics: [
          'Exact sequence: 1. Preparation → 2. Detection & Analysis → 3. Containment, Eradication & Recovery → 4. Post-Incident Activity.',
          'Contain compromised hosts (VLAN isolation/firewall block) BEFORE wiping or re-imaging during Eradication.',
          'Conduct a Lessons Learned meeting in Post-Incident Activity to update playbooks and detection rules.',
        ],
        examTip: 'Never skip Containment to jump straight to Eradication—wiping a live host destroys volatile RAM forensics.',
        quickCheck: {
          question: 'An analyst confirms ransomware is actively encrypting a workstation. What is the immediate next step after Detection & Analysis?',
          answer: 'Containment (isolate the host from the network immediately).',
        },
      },
      {
        id: 'sec-02',
        domain: 'General Security Concepts',
        title: 'Symmetric vs. Asymmetric Encryption & Hashing',
        definition:
          'Cryptographic primitives protect confidentiality, integrity, authentication, and non-repudiation across networks and storage.',
        characteristics: [
          'Symmetric (AES-256, ChaCha20): single shared secret key; ultra-fast for bulk disk/TLS data encryption.',
          'Asymmetric (RSA, ECC): public/private key pair; used for key exchange, TLS certificates, and digital signatures (non-repudiation).',
          'Hashing (SHA-256, SHA-3): one-way fixed-length digest verifying file integrity (cannot be decrypted).',
        ],
        examTip: 'Digital signatures encrypt a hash with the SENDER’s private key and verify with the SENDER’s public key.',
        quickCheck: {
          question: 'Which cryptographic property proves a sender cannot deny having signed a contract?',
          answer: 'Non-repudiation (via asymmetric digital signatures).',
        },
      },
      {
        id: 'sec-03',
        domain: 'Security Architecture',
        title: 'Zero Trust Architecture (Control Plane vs. Data Plane)',
        definition:
          'Zero Trust removes implicit network-location trust, verifying identity, device health, and least-privilege context on every request.',
        characteristics: [
          'Control Plane: Policy Engine (PE) and Policy Administrator (PA) evaluate trust signals and make access decisions.',
          'Data Plane: Policy Enforcement Point (PEP) enables, monitors, and terminates the actual user-to-resource session.',
          'Microsegmentation isolates workloads east-west inside VPCs/datacenters so a single breach cannot move laterally.',
        ],
        examTip: 'Zero Trust assumes the internal corporate network is already compromised ("never trust, always verify").',
        quickCheck: {
          question: 'In NIST Zero Trust architecture, which component enforces the allow/deny decision directly in the traffic path?',
          answer: 'Policy Enforcement Point (PEP) in the Data Plane.',
        },
      },
      {
        id: 'sec-04',
        domain: 'Threats, Vulnerabilities & Mitigations',
        title: 'Social Engineering & Application Attack Vectors',
        definition:
          'Recognizing attack signatures allows security engineers to deploy targeted technical and administrative controls.',
        characteristics: [
          'SQL Injection (SQLi): attacker injects SQL syntax into unvalidated inputs; mitigated by parameterized queries / prepared statements.',
          'Cross-Site Scripting (XSS): malicious JavaScript executes in a victim’s browser; mitigated by context-aware output encoding and CSP headers.',
          'Spear Phishing / Whaling / Business Email Compromise (BEC): targeted impersonation mitigated by DMARC/DKIM/SPF and out-of-band verification.',
        ],
        examTip: 'Parameterized queries / prepared statements are the #1 defense against SQL Injection.',
        quickCheck: {
          question: 'Which coding practice permanently eliminates SQL Injection vulnerabilities in web applications?',
          answer: 'Parameterized queries (prepared statements).',
        },
      },
      {
        id: 'sec-05',
        domain: 'Security Operations',
        title: 'Identity, PAM, Federation & Kerberos / SAML / OIDC',
        definition:
          'Enterprise identity architectures centralize authentication and restrict privileged administrative access.',
        characteristics: [
          'Privileged Access Management (PAM): enforces Just-In-Time (JIT) elevation, password vaulting, and session recording for admins.',
          'SAML 2.0: XML-based enterprise web SSO between an Identity Provider (IdP) and Service Provider (SP).',
          'OAuth 2.0 handles delegated authorization (scoped tokens), while OpenID Connect (OIDC) adds JSON-based user authentication.',
        ],
        examTip: 'OAuth 2.0 = Authorization ("what apps can access"); OIDC / SAML = Authentication ("who you are").',
        quickCheck: {
          question: 'Which PAM capability grants temporary administrator privileges only for a 2-hour maintenance window and revokes them automatically?',
          answer: 'Just-In-Time (JIT) privileged access.',
        },
      },
      {
        id: 'sec-06',
        domain: 'Security Program Management',
        title: 'Risk Management, BIA (RTO, RPO, MTTR, MTBF) & Agreements',
        definition:
          'Quantitative and qualitative risk analysis aligns security investments and business continuity targets with business impact.',
        characteristics: [
          'ALE = SLE × ARO (Annualized Loss Expectancy = Single Loss Expectancy × Annualized Rate of Occurrence).',
          'RPO = maximum acceptable data loss (determines backup frequency); RTO = maximum tolerable downtime.',
          'MTBF = average uptime between hardware failures; MTTR = average time to repair a failed component.',
        ],
        examTip: 'Backups run every 4 hours = 4-hour RPO.',
        quickCheck: {
          question: 'A server asset worth $100,000 suffers a 30% exposure factor once every 2 years (ARO = 0.5). What is the ALE?',
          answer: '$15,000 (SLE = $30,000 × ARO 0.5 = $15,000).',
        },
      },
      {
        id: 'sec-07',
        domain: 'Threats, Vulnerabilities & Mitigations',
        title: 'Vulnerability Scanning vs. Penetration Testing',
        definition:
          'Continuous vulnerability assessment identifies known weaknesses, while penetration testing simulates active adversarial exploitation.',
        characteristics: [
          'Credentialed scans log into hosts to inspect missing OS patches and registry/config flaws with far fewer false negatives.',
          'Non-credentialed scans probe external ports/services from an attacker’s unauthenticated perspective.',
          'Penetration tests require signed Rules of Engagement (RoE) defining scope, allowed exploits, and emergency contacts.',
        ],
        examTip: 'CVSS measures technical vulnerability severity (0.0–10.0), not business asset criticality.',
        quickCheck: {
          question: 'Why do security teams run credentialed vulnerability scans alongside external unauthenticated scans?',
          answer: 'Credentialed scans detect internal missing patches and misconfigurations invisible from external port probes.',
        },
      },
      {
        id: 'sec-08',
        domain: 'Security Architecture',
        title: 'Network Security Controls (NAC, WAF, IDS/IPS, VPN)',
        definition:
          'Layered network defenses inspect traffic at the perimeter, application layer, and endpoint admission boundary.',
        characteristics: [
          '802.1X Network Access Control (NAC): verifies device certificates and posture health before admitting endpoints onto the LAN/Wi-Fi.',
          'Web Application Firewall (WAF): inspects Layer 7 HTTP traffic to block SQLi, XSS, and OWASP Top 10 attacks.',
          'IPS sits inline to actively drop malicious packets; IDS passively alerts on mirrored traffic.',
        ],
        examTip: 'Quarantining a laptop with an outdated antivirus signature onto a remediation VLAN = NAC.',
        quickCheck: {
          question: 'Which control inspects endpoint patch/antivirus posture before allowing a laptop onto the corporate network?',
          answer: 'Network Access Control (NAC) using IEEE 802.1X.',
        },
      },
    ],
  },
];

export default function StudyGuidesTab({ catalog, onSelectCert }) {
  const [selectedId, setSelectedId] = useState(STUDY_DECKS[0].id);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('deck'); // 'deck' | 'grid'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unreviewed'
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

  const visibleTopics =
    filterMode === 'unreviewed'
      ? activeDeck.topics.filter((t) => !reviewedIds.has(t.id))
      : activeDeck.topics;

  const safeIndex =
    visibleTopics.length > 0 ? Math.min(slideIndex, visibleTopics.length - 1) : 0;
  const currentTopic = visibleTopics[safeIndex] || null;

  const handleSelectDeck = (deckId) => {
    setSelectedId(deckId);
    setSlideIndex(0);
    setIsFlipped(false);
  };

  const toggleReviewed = (topicId) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  // Keyboard shortcuts for Slide Deck mode (Left/Right arrows, Space to flip, M to master)
  useEffect(() => {
    if (viewMode !== 'deck' || !currentTopic) return;
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey) {
        return;
      }
      if (e.key === 'ArrowRight') {
        if (safeIndex < visibleTopics.length - 1) {
          e.preventDefault();
          setSlideIndex((i) => i + 1);
          setIsFlipped(false);
        }
      } else if (e.key === 'ArrowLeft') {
        if (safeIndex > 0) {
          e.preventDefault();
          setSlideIndex((i) => i - 1);
          setIsFlipped(false);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleReviewed(currentTopic.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, currentTopic, safeIndex, visibleTopics.length]);

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
      {/* Top Studio Header Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <BookOpenCheck className="w-4 h-4" />
            <span>Interactive Study Postcards & Slide Decks</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {activeDeck.title} ({activeDeck.code})
          </h2>
          <p className="text-xs text-emerald-100/90">
            Master {activeDeck.topics.length} core architectural concepts—flip any postcard to test yourself with an exam quick-check.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher: Slide Deck vs. Postcard Grid */}
          <div className="flex bg-emerald-950/70 border border-emerald-700 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'deck'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slide Deck</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Postcards</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenCert(activeDeck.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-emerald-950 text-xs font-extrabold transition shadow-xs"
          >
            Practice {activeDeck.code} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Certification Deck Selector Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STUDY_DECKS.map((deck) => {
          const doneCount = deck.topics.filter((t) => reviewedIds.has(t.id)).length;
          const isSelected = deck.id === activeDeck.id;
          return (
            <button
              key={deck.id}
              onClick={() => handleSelectDeck(deck.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono border whitespace-nowrap transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-900 text-white border-emerald-900 font-bold shadow-xs'
                  : 'bg-white text-emerald-950 border-stone-300/80 hover:border-emerald-500'
              }`}
            >
              <span>{deck.code}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {doneCount}/{deck.topics.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full-Width 12-Column Interactive Studio */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Slide Navigator & Progress (3 cols) */}
        <aside className="lg:col-span-3 bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              Deck Topics ({activeDeck.topics.length})
            </span>
            {reviewedCount > 0 && (
              <button
                onClick={() => {
                  setReviewedIds((prev) => {
                    const next = new Set(prev);
                    activeDeck.topics.forEach((t) => next.delete(t.id));
                    return next;
                  });
                }}
                className="text-[11px] text-amber-300 hover:underline flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className="p-3.5 border-b border-stone-200/80 bg-stone-50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Mastered</span>
              <span className="font-bold text-emerald-800">
                {reviewedCount} / {activeDeck.topics.length} ({deckPct}%)
              </span>
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${deckPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                onClick={() => {
                  setFilterMode('all');
                  setSlideIndex(0);
                  setIsFlipped(false);
                }}
                className={`py-1 rounded-lg text-[11px] font-semibold transition ${
                  filterMode === 'all'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                All ({activeDeck.topics.length})
              </button>
              <button
                onClick={() => {
                  setFilterMode('unreviewed');
                  setSlideIndex(0);
                  setIsFlipped(false);
                }}
                className={`py-1 rounded-lg text-[11px] font-semibold transition ${
                  filterMode === 'unreviewed'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-stone-200 text-stone-600'
                }`}
              >
                To Review ({activeDeck.topics.length - reviewedCount})
              </button>
            </div>
          </div>

          {/* Clickable Slide Index List */}
          <div className="p-2.5 max-h-[460px] overflow-y-auto space-y-1">
            {visibleTopics.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6">
                All topics mastered! Switch to "All" to review again.
              </p>
            ) : (
              visibleTopics.map((topic, idx) => {
                const isActive = viewMode === 'deck' && idx === safeIndex;
                const isDone = reviewedIds.has(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setViewMode('deck');
                      setSlideIndex(idx);
                      setIsFlipped(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition ${
                      isActive
                        ? 'bg-emerald-50 border border-emerald-400 text-emerald-950 font-bold'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        isDone
                          ? 'bg-emerald-700 text-white'
                          : isActive
                          ? 'bg-emerald-900 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                    </span>
                    <span className="truncate">{topic.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Stage: Interactive Postcard / Slide Stage or Full Grid (9 cols) */}
        <div className="lg:col-span-9">
          {visibleTopics.length === 0 ? (
            <div className="bg-white border border-stone-300/80 rounded-2xl p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-base text-stone-900">
                All {activeDeck.code} Concept Postcards Mastered!
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                You have marked every topic in this deck as mastered. Jump into a timed or practice drill to test your recall under exam conditions.
              </p>
              <div className="flex justify-center gap-2.5 pt-2">
                <button
                  onClick={() => setFilterMode('all')}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Show All Cards
                </button>
                <button
                  onClick={() => handleOpenCert(activeDeck.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                >
                  Start {activeDeck.code} Practice
                </button>
              </div>
            </div>
          ) : viewMode === 'deck' && currentTopic ? (
            <div className="space-y-4">
              {/* Interactive Postcard / Slide Canvas */}
              <article className="bg-white border-2 border-stone-300/90 rounded-2xl overflow-hidden shadow-md">
                {/* Postcard Top Header Band */}
                <div className="bg-emerald-950 text-white px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-800 text-amber-300 border border-emerald-700">
                      SLIDE {String(safeIndex + 1).padStart(2, '0')} /{' '}
                      {String(visibleTopics.length).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold text-emerald-200">
                      {currentTopic.domain}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleReviewed(currentTopic.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        reviewedIds.has(currentTopic.id)
                          ? 'bg-emerald-500 text-emerald-950'
                          : 'bg-emerald-900 text-emerald-100 border border-emerald-700 hover:bg-emerald-800'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {reviewedIds.has(currentTopic.id) ? 'Mastered' : 'Mark Mastered (M)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFlipped((f) => !f)}
                      className="px-3 py-1 rounded-lg bg-amber-300 hover:bg-amber-200 text-emerald-950 text-xs font-extrabold flex items-center gap-1.5 transition"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>{isFlipped ? 'Front: Concept' : 'Flip: Quick Check'}</span>
                    </button>
                  </div>
                </div>

                {/* Postcard Body: Front (Concept Slide) vs. Back (Active Recall Check) */}
                {!isFlipped ? (
                  <div className="p-6 sm:p-8 space-y-6 min-h-[340px] flex flex-col justify-between">
                    <div className="space-y-5">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                        {currentTopic.title}
                      </h3>

                      {/* Definition Callout */}
                      <div className="bg-emerald-50/80 border-l-4 border-emerald-700 rounded-r-xl p-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block mb-1">
                          Core Definition
                        </span>
                        <p className="text-sm text-stone-900 leading-relaxed font-medium">
                          {currentTopic.definition}
                        </p>
                      </div>

                      {/* Key Characteristics */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-700" /> Key Exam Characteristics
                        </span>
                        <ul className="grid sm:grid-cols-1 gap-2.5">
                          {currentTopic.characteristics.map((point, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 bg-stone-50 border border-stone-200/90 rounded-xl p-3 text-xs sm:text-sm text-stone-800 leading-relaxed"
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Bottom Exam Decision Rule Strip */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
                      <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-amber-950 leading-relaxed">
                        <strong>Exam Decision Rule:</strong> {currentTopic.examTip}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 min-h-[340px] bg-stone-50 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-200/80 text-amber-950">
                        <HelpCircle className="w-3.5 h-3.5" /> Postcard Back • Active Recall Check
                      </span>

                      <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                        {currentTopic.quickCheck.question}
                      </h3>

                      <div className="bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-xs space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Verified Exam Answer
                        </span>
                        <p className="text-sm sm:text-base font-semibold text-stone-900 leading-relaxed">
                          {currentTopic.quickCheck.answer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs text-stone-500">
                      <span>Press Spacebar anytime to flip between concept and answer</span>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(false)}
                        className="font-bold text-emerald-800 hover:underline"
                      >
                        ← Back to Concept Front
                      </button>
                    </div>
                  </div>
                )}

                {/* Slide Navigation Footer */}
                <div className="bg-stone-100 border-t border-stone-200 px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <button
                    disabled={safeIndex === 0}
                    onClick={() => {
                      setSlideIndex((i) => i - 1);
                      setIsFlipped(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-40 flex items-center gap-1.5 transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Slide
                  </button>

                  {/* Visual Slide Dots */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {visibleTopics.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSlideIndex(idx);
                          setIsFlipped(false);
                        }}
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === safeIndex
                            ? 'w-7 bg-emerald-800'
                            : reviewedIds.has(t.id)
                            ? 'w-2.5 bg-emerald-500'
                            : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                        }`}
                      />
                    ))}
                  </div>

                  {safeIndex < visibleTopics.length - 1 ? (
                    <button
                      onClick={() => {
                        setSlideIndex((i) => i + 1);
                        setIsFlipped(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      Next Slide <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCert(activeDeck.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      Take {activeDeck.code} Quiz <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            </div>
          ) : (
            /* All Postcards 2-Column Grid View */
            <div className="grid md:grid-cols-2 gap-4">
              {visibleTopics.map((topic, idx) => {
                const isDone = reviewedIds.has(topic.id);
                return (
                  <div
                    key={topic.id}
                    className="bg-white border border-stone-300/80 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-amber-300">
                          #{idx + 1} • {topic.domain}
                        </span>
                        <button
                          onClick={() => toggleReviewed(topic.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-emerald-950'
                              : 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                          }`}
                        >
                          {isDone ? 'Mastered' : 'Mark Mastered'}
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-sm text-stone-900">{topic.title}</h3>
                        <p className="text-xs text-stone-700 bg-emerald-50/70 border-l-2 border-emerald-700 pl-3 py-1.5 rounded-r leading-relaxed">
                          {topic.definition}
                        </p>
                        <ul className="space-y-1.5 text-xs text-stone-700">
                          {topic.characteristics.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0 mt-1.5" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-amber-50/80 border-t border-amber-200/80 px-4 py-2.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-amber-950 truncate">
                        <strong>Rule:</strong> {topic.examTip}
                      </span>
                      <button
                        onClick={() => {
                          setViewMode('deck');
                          setSlideIndex(idx);
                          setIsFlipped(true);
                        }}
                        className="shrink-0 font-bold text-emerald-800 hover:underline"
                      >
                        Quick Check →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}