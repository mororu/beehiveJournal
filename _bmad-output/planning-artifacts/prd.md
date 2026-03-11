---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary]
inputDocuments: [product-brief-beehiveJournal-2026-03-11.md]
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - beehiveJournal

**Author:** Manuel
**Date:** 2026-03-11

## Executive Summary

beehiveJournal is a self-hosted Progressive Web App (PWA) for hobbyist beekeepers who want a structured memory system for tracking hive development and building beekeeping knowledge over time. Designed as a single-user personal tool, it runs on the owner's own VPS — no subscriptions, no third-party data dependency. The core value is transforming isolated inspection notes into a longitudinal record that builds genuine confidence: after months of use, a beekeeper knows exactly how each hive is doing and why.

The primary user is Manuel — a new beekeeper with 6 named and numbered hives, self-hosting on an Infomaniak VPS Lite (1vCPU, 2GB RAM, 20GB storage), motivated by both the beekeeping practice and the opportunity to learn Linux and self-hosting.

### What Makes This Special

Most beekeeping apps target experienced or semi-commercial keepers, assume prior knowledge, and store data on third-party servers. beehiveJournal is built for the beginner who wants to grow — it auto-captures weather at inspection time (no manual entry), provides a per-hive health timeline for spotting trends at a glance, and includes a sting incident tracker with body location mapping unique to this class of app. The self-hosted architecture is both a privacy decision and a learning opportunity, keeping all data under the user's control with zero ongoing cost.

**Core insight:** New beekeepers don't fail because beekeeping is hard — they fail because they have no memory system. beehiveJournal *is* that memory system.

## Project Classification

- **Project Type:** Web App (PWA) — installable on mobile, browser-based, offline-capable
- **Domain:** General (hobby/agriculture) — no regulatory requirements, standard security
- **Complexity:** Low — single-user, greenfield, no multi-tenant architecture
- **Project Context:** Greenfield — no existing codebase
