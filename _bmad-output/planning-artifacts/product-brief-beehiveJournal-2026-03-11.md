---
stepsCompleted: [step-01-init, step-02-vision]
inputDocuments: []
date: 2026-03-11
author: Manuel
---

# Product Brief: beehiveJournal

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

beehiveJournal is a self-hosted mobile web app for hobbyist beekeepers who want to track the health and history of their hives without relying on paper notes or third-party cloud services. Designed for personal use, it gives a single beekeeper a simple, fast way to log hive inspections, monitor health trends over time, record sting incidents, attach photos, and automatically capture weather conditions — all on infrastructure they own and control.

---

## Core Vision

### Problem Statement

New beekeepers struggle to maintain consistent records of their hive inspections. Without a structured log, it's easy to forget what was observed last visit, miss warning signs of declining hive health, and lose the ability to correlate events (like sting frequency or colony behaviour) with environmental factors like temperature and weather.

### Problem Impact

Without reliable tracking, a beekeeper — especially a beginner — cannot detect health trends early, understand what is working or failing across multiple hives, or build the experience needed to improve their practice over time. Poor record-keeping directly reduces the chances of keeping a colony alive and thriving.

### Why Existing Solutions Fall Short

Existing beekeeping apps (HiveTracks, BeePlus, ApiaryBook) are designed for experienced beekeepers or semi-commercial operations. They assume prior knowledge, are often overly complex, and store data on third-party servers — removing the owner's control over their own data. None offer automatic weather capture tied to inspections or an intuitive sting incident tracker.

### Proposed Solution

A lightweight, self-hosted Progressive Web App (PWA) that a beekeeper installs on their own VPS. The app allows the user to manage named and numbered hives, log detailed inspection entries (with photos and auto-fetched weather data), track health scores over time on a visual timeline, and record sting incidents with body location. It is fast to use in the field, works on mobile, and keeps all data private on the user's own server.

### Key Differentiators

- **Self-hosted & private** — runs on the user's own Infomaniak VPS; no third-party cloud dependency
- **Auto weather capture** — weather data pulled automatically at time of inspection via GPS location
- **Health timeline** — per-hive health trend visualized over time, making decline or improvement visible at a glance
- **Sting tracker** — unique incident log with body location map; enables correlation with conditions over time
- **Beginner-friendly** — designed for someone learning beekeeping, not an expert dashboard
