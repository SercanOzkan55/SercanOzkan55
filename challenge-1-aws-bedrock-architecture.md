# Challenge 1: Secure AWS Bedrock Setup for 10 Microservices

## Executive Summary

Ten microservices access Claude models through a centralized internal LLM gateway deployed in EU-resident AWS regions. **Claude Opus 4.7** is the primary model; **Claude Sonnet 4.6** is the policy-driven fallback. Each service gets its own IAM role and application inference profile — no shared credentials, no long-lived keys. Cost control lives in the gateway (real-time token budgets per service and user), backed by AWS Budgets as a secondary safety net. Security is enforced through layered SCPs, least-privilege IAM, and EU-only region restrictions with `global.*` inference profiles denied by default. The entire setup stays within EU data residency unless explicitly approved otherwise.

---

## Architecture Overview

```
┌─ AWS Organization ─────────────────────────────────────────────────────────────────────┐
│  SCPs: deny non-EU regions, deny global.* profiles, deny direct FM access              │
│                                                                                        │
│  ┌─ Production Account (eu-west-1) ──────────────────────────────────────────────────┐  │
│  │                                                                                    │ │
│  │   ┌────────────┐ ┌────────────┐ ┌────────────┐         ┌────────────┐              │ │
│  │   │ orders-api │ │ search-svc │ │ review-svc │  . . .  │ notify-svc │  (10 svcs)   │ │
│  │   │ ECS / EKS  │ │ ECS / EKS  │ │  Lambda    │         │ ECS / EKS  │              │ │
│  │   └─────┬──────┘ └─────┬──────┘ └─────┬──────┘         └──────┬─────┘              │ │
│  │         │ mTLS         │ mTLS         │ mTLS                  │ mTLS               │ │
│  │         │              │              │                       │                     │ │
│  │         ▼              ▼              ▼                       ▼                     │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐               │ │
│  │   │                    LLM Gateway (HA)                             │               │ │
│  │   │                                                                 │               │ │
│  │   │  ● Validates: service, team, env, user_hash, model             │               │ │
│  │   │  ● Enforces: req/min, tokens/min, tokens/day, max_tokens       │               │ │
│  │   │  ● Attaches: request metadata & session tags                   │               │ │
│  │   │  ● Drives: fallback chain (policy-based, not blind retry)      │               │ │
│  │   │  ● Token buckets: Redis / DynamoDB per service+user            │               │ │
│  │   └───────────────────────────┬─────────────────────────────────────┘               │ │
│  │                               │ STS AssumeRole                                      │ │
│  │                               │ (per-service Bedrock role)                           │ │
│  │                               ▼                                                     │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐               │ │
│  │   │              AWS Bedrock Runtime (eu-west-1)                     │               │ │
│  │   │                                                                 │               │ │
│  │   │   App Inference Profiles (per service, tagged):                 │               │ │
│  │   │   ┌─────────────────────────┐  ┌──────────────────────────┐    │               │ │
│  │   │   │ orders-prod-opus47      │  │ orders-prod-sonnet46     │    │               │ │
│  │   │   │ search-prod-opus47      │  │ search-prod-sonnet46     │    │               │ │
│  │   │   │ review-prod-opus47      │  │ review-prod-sonnet46     │    │               │ │
│  │   │   │ ...                     │  │ ...                      │    │               │ │
│  │   │   └─────────────────────────┘  └──────────────────────────┘    │               │ │
│  │   └─────────────────────────────────────────────────────────────────┘               │ │
│  │                               │                                                     │ │
│  │              ┌────────────────┼────────────────┐                                    │ │
│  │              ▼                ▼                ▼                                     │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌───────────────┐                             │ │
│  │   │ CloudWatch   │  │ S3 Logs      │  │ CloudTrail    │                             │ │
│  │   │ Logs/Metrics │  │ (encrypted,  │  │ (API audit)   │                             │ │
│  │   │ + Dashboards │  │  KMS, short  │  │               │                             │ │
│  │   │              │  │  retention)  │  │               │                             │ │
│  │   └──────────────┘  └──────────────┘  └───────────────┘                             │ │
│  │                                                                                    │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌─ Fallback Routing Chain ──────────────────────────────────────────────────────────┐  │
│  │                                                                                    │ │
│  │  1. anthropic.claude-opus-4-7         (eu-west-1, in-region)                       │ │
│  │  2. anthropic.claude-opus-4-7         (eu-north-1, in-region)                      │ │
│  │  3. eu.anthropic.claude-opus-4-7      (EU geo profile)                             │ │
│  │  4. eu.anthropic.claude-sonnet-4-6    (EU Sonnet fallback)                         │ │
│  │  5. Queue, degrade, or fail closed                                                 │ │
│  │                                                                                    │ │
│  │  ✗ global.anthropic.*  →  DENIED unless legal/security exception                  │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Region Choice

**Primary region: `eu-west-1` (Ireland).** Secondary in-region option: `eu-north-1` (Stockholm).

AWS documents `anthropic.claude-opus-4-7` with EU geo profile `eu.anthropic.claude-opus-4-7` and in-region EU support including `eu-west-1` and `eu-north-1`. Sonnet fallback can use `anthropic.claude-sonnet-4-6` or `eu.anthropic.claude-sonnet-4-6`.

**Fallback routing order:**

| Priority | Model / Profile | Scope |
|---|---|---|
| 1 | `anthropic.claude-opus-4-7` in `eu-west-1` | Single region |
| 2 | `anthropic.claude-opus-4-7` in `eu-north-1` | Single region |
| 3 | `eu.anthropic.claude-opus-4-7` | EU geography |
| 4 | `eu.anthropic.claude-sonnet-4-6` | EU Sonnet fallback |
| 5 | Queue, degrade, or fail closed | — |

Use `global.anthropic.*` **only** for workloads where legal/security has approved non-EU processing. AWS states that in-region keeps requests in one region, geo routes within a geography, and global may route worldwide. I would avoid `global.*` inference profiles unless a workload has an explicit data-residency exception.

---

## Target Shape: Internal LLM Gateway

Rather than letting 10 services call Bedrock directly, I would use a small internal LLM gateway. Each microservice gets:

- One **service identity** (e.g., `orders-api-prod`)
- One **Bedrock access role** (e.g., `BedrockInvokeOrdersProd`)
- One **application inference profile per approved model**, tagged with `service`, `team`, `env`, `cost_center`
- **Per-service and optionally per-user quotas** enforced by the gateway
- **Request metadata** attached to each Bedrock call for attribution

**Why a gateway instead of direct access?** IAM alone cannot give you clean real-time per-user token limits. A gateway centralizes quota enforcement, fallback logic, request validation, metadata tagging, and observability in one place — rather than reimplementing these in each of the 10 services.

### Gateway Risks and Tradeoffs

The gateway itself introduces operational complexity that must be acknowledged:

| Risk | Severity | Mitigation |
|---|---|---|
| **Single point of failure** | High | Deploy gateway across multiple AZs with ALB health checks. Minimum 3 instances behind auto-scaling. Target 99.9% availability. |
| **Added latency** | Medium | Gateway adds ~5-15ms per request (network hop + auth + quota check). For Opus calls that take 5-30 seconds, this is negligible. Monitor P99 gateway latency separately. |
| **Operational overhead** | Medium | Gateway is one more service to deploy, monitor, and on-call for. The platform team owns it. Use a lightweight framework — this is a proxy, not a product. |
| **Gateway outage = all services blocked** | High | Implement a **break-glass path**: each service role *can* assume its Bedrock role directly via STS, bypassing the gateway. This path is disabled by default (IAM condition key) and enabled only during gateway incidents by the platform team. Break-glass usage triggers an immediate alert. |
| **Scaling under load** | Medium | Auto-scale gateway based on request count. The gateway is stateless (quota state lives in Redis/DynamoDB), so horizontal scaling is straightforward. |
| **Gateway maintenance windows** | Low | Rolling deployments with zero-downtime. No maintenance windows needed if deployed correctly on ECS/EKS with graceful draining. |

> **Key tradeoff:** The gateway adds a dependency and operational burden, but the alternative — 10 services each implementing their own rate limiting, fallback, tagging, and quota logic — is worse. Centralize the hard parts, keep the services simple.

---

## Authentication Flow

### Backend Services

1. Microservice runs with its own AWS execution role (ECS task role, Lambda role, or EKS IRSA).
2. It authenticates to the LLM gateway via **private networking and mTLS**, or assumes its specific Bedrock invoke role with `sts:AssumeRole`.
3. The gateway validates: service, team, environment, user or tenant, and requested model.
4. The gateway attaches session tags or request metadata: `service=orders`, `team=payments`, `env=prod`, `user_hash=...`.
5. Gateway calls Bedrock Runtime using **Converse API** where possible.

**End users never call Bedrock directly.** They authenticate to the product backend; the backend/gateway maps them to internal usage limits.

No long-lived AWS keys in code. Services use their normal AWS runtime identity — short-lived, auto-rotated credentials via STS.

---

## IAM Model

### Organization-Level SCPs

At the organization level, add SCPs that:

- **Deny** Bedrock runtime calls outside approved EU regions
- **Deny** `global.*` inference profiles by default
- **Deny** direct foundation-model access except from approved Bedrock roles
- **Deny** Bedrock model subscription/Marketplace permissions to normal service roles

### Per-Service IAM Policy

Each microservice role allows only the model/profile it needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeOnlyApprovedProfiles",
      "Effect": "Allow",
      "Action": [
        "bedrock:Converse",
        "bedrock:ConverseStream",
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:eu-west-1:123456789012:application-inference-profile/orders-prod-opus47",
        "arn:aws:bedrock:eu-west-1:123456789012:application-inference-profile/orders-prod-sonnet46"
      ]
    }
  ]
}
```

For cross-region inference, AWS requires access to the inference profile **plus** the destination foundation models. Keep those permissions generated by IaC and scoped to the specific EU profile.

### Admin vs. Developer Separation

| Role | Who | Can Do | Cannot Do |
|---|---|---|---|
| **Platform Admin** | Infra team (2-3 people) | Manage model access, IAM policies, Bedrock guardrails, logging config, gateway config | Invoke models directly (explicit Deny) |
| **Service Developer** | Dev teams | Deploy their service, read their own CloudWatch logs | Modify IAM, change Bedrock config, access other services' roles or logs |
| **Billing Viewer** | Finance | View Bedrock cost reports in Cost Explorer, CUR 2.0 | Everything else |
| **Break-Glass** | Platform on-call | Enable direct Bedrock access during gateway outages | Used only in incidents, triggers immediate alert |

---

## Spend Controls

No single AWS feature is enough. Use several layers:

| Layer | What It Does | Granularity | Speed |
|---|---|---|---|
| **Gateway hard limits** | req/min, tokens/min, tokens/day, max input size, max output tokens, max concurrent requests | Per service, per user, per team | Real-time |
| **Per-request caps** | Conservative `max_tokens`; reject oversized prompts before Bedrock | Per request | Real-time |
| **Per-service budgets** | DynamoDB or Redis token buckets keyed by service, team, user_hash, env | Per service + user | Real-time |
| **Application inference profiles** | Tagged cost attribution per service | Per profile | CUR 2.0 (hourly) |
| **AWS Budgets + Cost Anomaly Detection** | Alerts and emergency actions | Per account/tag | 12-24h delay |
| **Account separation** | Dev/stage/prod in separate AWS accounts | Per environment | Structural |
| **Explicit Deny** | No direct Bedrock console/runtime use in prod except break-glass | Per account | Structural |

**When a service exceeds budget:**
1. Return **429** with a retry time
2. **Downgrade** to Sonnet if policy allows
3. **Queue** async work for later
4. **Never** silently switch to global routing to "fix" capacity

---

## Fallback Strategy

Fallback is **policy-driven**, not a blind retry loop.

### When to Fallback

Retry Opus only for throttling, transient 5xx, or capacity errors. Use exponential backoff and circuit breakers.

| Scenario | Action |
|---|---|
| Throttling (429) | Retry with backoff → next step in fallback chain |
| Transient 5xx | Retry once → next step in fallback chain |
| Model unavailable | Skip to next step immediately |
| Latency > threshold | Timeout → next step |
| Budget exceeded | Switch to Sonnet or queue |
| **Regulated/high-risk task** | **Fail closed** — do not fall back to lower-capability model |
| **Batch job** | Queue and retry later |

### What Gets Recorded

Every invocation records:

```
requested_model, actual_model, fallback_reason,
region_or_profile, input_tokens, output_tokens,
latency_ms, service, team, env, user_hash
```

Each service propagates **which model** was used in its response metadata. Downstream services and end users should know whether they got an Opus-quality or Sonnet-quality response.

> **Tradeoff:** Sonnet 4.6 is cheaper and faster but less capable. Some use cases (complex reasoning, long-context analysis) will degrade noticeably. Each team must define what "degraded but acceptable" means for their service before going to production.

---

## Logging and Monitoring

### What to Enable

| Component | Purpose | Notes |
|---|---|---|
| **CloudTrail** | API-level audit (who called what when) | Always on. 90-day default, extend via S3. |
| **Bedrock invocation logging** | Runtime call metadata → CloudWatch Logs and/or S3 | Token counts, latency, model, status. **Not** full prompts by default. |
| **CloudWatch dashboards** | Operational visibility | Invocation count, token usage, latency, throttles, errors, fallback rate, cost. |
| **CUR 2.0 + Cost Explorer** | Cost attribution | Grouped by IAM principal, tags, application inference profile, request metadata. |
| **Gateway metrics** | Real-time quota and routing data | req/s, tokens/s per service, fallback rate, budget utilization. |

### Dashboard Alerts

| Metric | Alert Threshold | Channel |
|---|---|---|
| Error rate (4xx + 5xx) | > 5% over 5 min | PagerDuty |
| Fallback rate (Sonnet / total) | > 20% sustained 1 hour | Slack |
| P99 latency | > 30 seconds | Slack |
| Invocations per service | > 200% daily average | Slack |
| Daily spend | > daily budget / remaining days | Email + Slack |
| All models unavailable | Immediate | PagerDuty |

### Sensitive Data Warning

Model invocation logging **can include prompts and outputs**. Treat that log bucket as sensitive production data:
- Encrypt with KMS (dedicated key, tight key policy)
- Restrict IAM access to platform team only
- Short retention where possible
- Redact secrets/PII before the request if the workload allows it

---

## Remaining Risks

| Risk | Why It Matters |
|---|---|
| **IAM alone ≠ tenant-level governance** | The biggest risk is believing IAM gives full per-user spend control. It does not. Real-time per-user limits belong in the gateway. |
| **EU geo routing ≠ single-region** | `eu.*` profiles are EU-resident but may route to any EU region. If you need single-region guarantees, use in-region model IDs only. |
| **Global profiles may violate residency** | `global.*` improves availability but may route worldwide. Deny by default via SCP. |
| **Prompt/output logging = new sensitive data store** | Full logging creates a high-value target. Treat it accordingly. |
| **Model behavior changes over time** | Keep regression evals for Opus-to-Sonnet fallback. A Sonnet update could change quality characteristics. |
| **Over-tight region restrictions → throttling** | Restricting to a single region concentrates all traffic. Monitor throttle rates and be ready to widen to EU geo if needed. |
| **Session tag spoofing** | If untrusted services can assume roles directly, they could spoof tags. Restrict trust policies and centralize tagging in the gateway. |
| **Gateway as SPOF** | Addressed via HA deployment and break-glass path, but must be monitored and tested. |

---

## References

AWS documentation consulted for this design (as of June 2026):

| # | Topic | AWS Documentation |
|---|---|---|
| 1 | **Claude Opus 4.7 on Bedrock** — model IDs, capabilities, EU region support | [Supported foundation models in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) |
| 2 | **Claude Sonnet 4.6 on Bedrock** — fallback model specs and inference profile IDs | [Anthropic Claude models in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html) |
| 3 | **Cross-region inference** — in-region, EU geo (`eu.*`), and global (`global.*`) profile behavior and data residency guarantees | [Cross-region inference in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) |
| 4 | **Application inference profiles** — per-service profiles, cost allocation tagging, and IAM scoping | [Inference profiles in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html) |
| 5 | **Converse API** — unified model-agnostic API for multi-turn conversations and tool use | [Converse API reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html) · [User guide](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html) |
| 6 | **Model invocation logging** — CloudWatch Logs and S3 destinations, metadata vs. full prompt logging | [Monitor model invocation logging](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html) |
| 7 | **CloudTrail integration** — API-level audit trail for Bedrock management and runtime calls | [Logging Amazon Bedrock API calls with CloudTrail](https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html) |
| 8 | **Cost management & tagging** — IAM principal-based cost allocation, CUR 2.0, Cost Explorer, AWS Budgets | [Tagging Amazon Bedrock resources](https://docs.aws.amazon.com/bedrock/latest/userguide/tagging.html) · [AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html) |
| 9 | **Service Control Policies (SCPs)** — region restriction patterns, deny-by-default for unauthorized services | [SCP examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples_general.html) |
| 10 | **IAM for Bedrock** — least-privilege policies, resource-level permissions for inference profiles | [Identity-based policies for Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html) |
| 11 | **Bedrock pricing** — on-demand, provisioned throughput, and batch pricing for Anthropic models | [Amazon Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) |
| 12 | **Bedrock guardrails** — content filtering and safety controls | [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) |

---

*This document prioritizes clear thinking and explicit tradeoffs over theoretical perfection. Every architectural choice has costs — the goal is to make those costs visible and the decisions defensible.*
