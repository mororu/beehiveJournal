---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
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

## Success Criteria

### User Success

The primary measure of user success is behavioural: Manuel logs every inspection without skipping. Success is not about features used — it is about consistent habit formation enabled by frictionless entry.

- Every hive inspection is logged; no inspection goes unrecorded
- A new inspection entry is created and saved in under 2 minutes on mobile
- After one full beekeeping season (approximately 6–9 months), Manuel can answer from the app: How did each colony grow? How much honey was produced per hive? What should be done differently next season?
- The health timeline for any hive is readable at a glance without explanation or training
- Manuel feels confident reviewing past inspections before entering the apiary

**Success moment:** Opening the app before an inspection, reading last week's notes and "check for queen cells" reminder, and feeling prepared rather than uncertain.

### Business Success

This is a personal-use tool with no commercial ambitions at launch. Business success is therefore defined as:

- A working, stable, self-hosted app that Manuel uses daily (or every inspection) with no need for support from others
- The app runs reliably on Infomaniak VPS Lite with no manual intervention required after initial setup
- Zero ongoing cost beyond the existing VPS subscription
- The project serves as a functional learning platform for Linux and self-hosting skills

**Post-MVP success signal:** After achieving a stable personal app, the architecture is clean enough to be shared or demonstrated — but sharing is explicitly out of scope for v1.

### Technical Success

- App is installable as a PWA on a mobile phone (add to home screen) and behaves like a native app
- App loads and is usable within 3 seconds on a mobile device over a standard mobile connection
- All data is stored on the Infomaniak VPS and never transmitted to third-party services (except the weather API call, which carries no personally identifying information)
- The app functions in offline mode: entries can be created and saved locally, then synced when connectivity is restored
- Deployment is reproducible: the app can be reinstalled from scratch on a new VPS following documented steps

### Measurable Outcomes

| Outcome | Metric | Target |
|---|---|---|
| Entry speed | Time to create and save an inspection entry | ≤ 2 minutes on mobile |
| Inspection coverage | Ratio of logged inspections to actual inspections | 100% — every inspection logged |
| Seasonal review | Can answer seasonal learning questions from app data alone | Yes, by end of first season |
| App reliability | Unplanned downtime per month | < 1 hour/month |
| Offline capability | Entry creation works without internet | Yes |
| Installation | PWA installable on iOS and Android | Yes |

## Product Scope

### MVP — Minimum Viable Product

**MVP Philosophy:** Problem-solving MVP. The MVP is the smallest version that replaces paper notes entirely and makes every inspection loggable and reviewable on mobile in the field.

**Must-Have for MVP:**

- Hive management: create, name, and number up to 10 hives; mark hives as active/inactive
- Inspection entry: log hive health status, behaviour observations, queen sighting (yes/no), and next-inspection notes — completable in under 2 minutes on mobile
- Per-hive inspection history: chronological list of all past entries for a given hive
- Per-hive health timeline: visual chart of health scores over time
- Auto weather capture: weather conditions fetched automatically at time of entry creation (no manual input)
- Sting incident tracker: log sting events with body location, date, hive, and notes
- PWA installation: installable on mobile home screen, offline entry creation
- Authentication: single-user login protecting the self-hosted instance

**Explicitly out of MVP:**

- Honey production tracker (post-MVP)
- Photo attachments (post-MVP)
- Multi-hive comparison views (post-MVP)
- Data export / backup UI (post-MVP — handled via VPS-level backup initially)
- Sharing or multi-user access (out of scope for v1 entirely)

### Growth Features (Post-MVP)

- Honey harvest tracker: log harvest date, hive, weight, and notes; seasonal total per hive
- Photo attachments on inspection entries (up to 3 photos per entry)
- Multi-hive dashboard: compare health scores across all hives on one screen
- Data export: download all data as JSON or CSV for personal backup
- Seasonal summary view: auto-generated end-of-season report per hive
- Medication and treatment log: record treatments with date, product, and dosage

### Vision (Future)

- Beekeeping knowledge base: contextual tips surfaced during entry based on what was observed (e.g., "Queen not seen for 2 weeks — consider these possibilities")
- Weather correlation view: overlay weather data with health timeline to spot correlations
- Notification reminders: push notification when inspection is overdue based on last entry date
- Import from other apps: migrate data from HiveTracks or ApiaryBook

## User Journeys

### Journey 1 — Manuel logs an inspection in the field (Primary — Success Path)

It is a Tuesday morning in May. Manuel is standing at the apiary, gloves on, smoker lit. Before opening hive 3 (named "Juniper"), he pulls out his phone and opens beehiveJournal from the home screen. The app loads in under 3 seconds.

He taps "Juniper" from the hive list, then taps "New Inspection." The form opens. Weather conditions are already filled in — sunny, 18°C, light wind — pulled automatically. He rates health as 4/5 (colony is strong), notes brood pattern looks good, ticks "Queen sighted: Yes," and types in the next-inspection note: "Check supers — nectar flow starting." He hits Save. Total time: 90 seconds.

Later that week, before visiting again, he opens the app at home and reads back the Juniper history. He sees the queen-sighting pattern, the weather on each visit, and the note he left himself. He walks into the apiary prepared.

**Capabilities revealed:** Hive list, new inspection form, weather auto-capture, queen sighting toggle, health score, next-inspection notes, per-hive history view.

---

### Journey 2 — Manuel reviews a season and learns (Primary — Reflection Use Case)

It is October. The last inspection of the season is done. Manuel opens beehiveJournal on his laptop browser (same PWA, just full-screen) and navigates to hive "Clover," which struggled mid-summer. He opens the health timeline and sees a clear dip in July — the weeks where the queen wasn't sighted and he noted "queenless behaviour." He correlates this with the sting log: he was stung 4 times that month, all from Clover.

He reads back through the July entries: he had noted "consider splitting" twice but never acted on it. He writes a personal note (outside the app, in a notebook) about what he'll do differently next season.

The app didn't tell him what to do — but it gave him the memory to learn from.

**Capabilities revealed:** Health timeline per hive, chronological entry list, sting incident log with hive correlation, seasonal date range on views.

---

### Journey 3 — Manuel uses offline entry at a remote apiary (Primary — Edge Case)

Manuel visits a second apiary location with poor mobile signal. He opens beehiveJournal from the home screen (installed PWA). The app loads from cache. He creates two inspection entries — one for each hive — using the offline form. The entries save locally. On the drive home, his phone reconnects. The app syncs the entries to the server. He checks the entries on his laptop that evening and confirms they're there.

**Capabilities revealed:** Offline mode, local entry caching, background sync on reconnect, PWA service worker.

---

### Journey 4 — Manuel recovers from a deployment issue (Admin / Operations)

A VPS update causes the app to stop responding. Manuel SSH's into the Infomaniak VPS, checks the Docker container logs, sees a failed database migration, and rolls back to the previous container image. He restores service within 20 minutes. No data is lost because the database volume is mounted outside the container.

This journey is about the app being self-hostable with standard tooling — not requiring vendor support.

**Capabilities revealed:** Docker-based deployment, persistent data volumes, readable container logs, documented recovery steps.

---

### Journey Requirements Summary

| Journey | Key Capabilities |
|---|---|
| Field inspection logging | Hive list, new entry form, weather auto-capture, offline support, PWA |
| Seasonal reflection | Health timeline, entry history, sting log, date filtering |
| Offline entry sync | Service worker cache, local storage, background sync |
| Self-hosting operations | Docker deployment, persistent volumes, logging, documented runbook |

## Innovation & Novel Patterns

### Detected Innovation Areas

beehiveJournal sits at the intersection of two genuine differentiators that no existing hobbyist beekeeping app combines:

1. **Auto weather capture tied to inspection time** — removes the most common barrier to consistent logging (manual data entry). Weather is fetched from an open API using the device's GPS position at the moment the entry is created. No user input required.

2. **Sting incident tracker with body location** — enables a beginner to correlate defensive behaviour (sting frequency, location, intensity) with hive health data and environmental conditions over time. No existing app in the hobbyist segment offers this.

3. **Self-hosted personal data ownership** — not a technical innovation, but a genuine differentiator in a category where every major competitor uses third-party cloud storage. For a user motivated by privacy and learning, this is a core feature, not a deployment detail.

### Market Context & Competitive Landscape

Existing hobbyist apps (HiveTracks, BeePlus, ApiaryBook, Hive Tracks) share common patterns:
- Designed for 10+ hives / semi-commercial operations
- Require manual weather or environmental input
- No sting incident tracking
- Cloud-stored data with subscription pricing
- No offline-first PWA option

beehiveJournal is not trying to compete with these apps at scale — it is filling the gap for the single beekeeper who wants a fast, private, mobile-first tool with a genuine feedback loop between what they observe and what they learn.

### Validation Approach

- Auto weather capture is validated if: weather data appears pre-filled on every new entry without user interaction, and the data matches actual local conditions for that time and location
- Sting tracker is validated if: Manuel uses it consistently and can, after one season, correlate sting incidents with specific hive health patterns in the timeline
- Self-hosting is validated if: the app runs uninterrupted for 30 days after initial deployment with no manual intervention

### Risk Mitigation

- **Weather API dependency:** Use a free, high-availability open API (e.g., Open-Meteo) with no API key required. Fall back gracefully: if weather fetch fails, entry still saves with a "weather unavailable" note.
- **PWA offline sync conflicts:** Offline entries use timestamp-based conflict resolution. Last write wins (no multi-user conflicts possible in single-user app).
- **GPS permission denied:** If GPS is unavailable, prompt user to enter a manual postcode or use last-known location for weather fetch.

## Web App Specific Requirements

### Project-Type Overview

beehiveJournal is a Progressive Web App (PWA) — a mobile-first, browser-based application installable on the user's home screen. It uses a Single Page Application (SPA) architecture with offline-first capabilities via a service worker. The app is primarily accessed on mobile (field use) and occasionally on desktop (review and reflection). No native app store submission is required or planned.

### Browser & Platform Support

| Platform | Priority | Minimum Version |
|---|---|---|
| iOS Safari (iPhone) | Primary — field use | iOS 16+ |
| Android Chrome | Primary — field use | Chrome 108+ |
| Desktop Chrome/Firefox | Secondary — review use | Current - 1 version |
| Other browsers | Not supported | — |

PWA installation (Add to Home Screen) must work on iOS Safari and Android Chrome. Safari's PWA limitations (no push notifications, limited background sync) are acceptable constraints for MVP.

### Responsive Design

- Mobile-first layout: all forms and views designed for 375px viewport width minimum
- Touch targets minimum 44px × 44px on all interactive elements
- No horizontal scrolling on mobile
- Desktop layout adjusts gracefully at 768px+ but is not a separate design concern

### Performance Targets

- Initial app load (first visit, cached assets): ≤ 3 seconds on 4G mobile connection
- Subsequent loads (PWA from home screen): ≤ 1.5 seconds
- New inspection form interactive: ≤ 1 second after tap
- Weather data fetch: ≤ 2 seconds; entry form remains usable if fetch is pending or fails

### SEO Strategy

Not applicable — app is self-hosted, single-user, and behind authentication. No public pages.

### Accessibility Level

WCAG 2.1 AA compliance is not a hard requirement (single private user). However, standard accessibility practices apply: sufficient colour contrast ratios (4.5:1 minimum), semantic HTML, keyboard navigation functional on desktop, and screen reader compatibility for form labels.

### Implementation Considerations

- **Framework:** SPA framework with good PWA tooling (e.g., SvelteKit, Vue + Vite, or React + Vite — decision deferred to architecture phase)
- **Service Worker:** Workbox or equivalent for offline caching strategy
- **State Management:** Simple — single user, no real-time collaboration, no complex state trees
- **Backend:** Lightweight API server; SQLite is sufficient for single-user data volume; Docker-based deployment
- **Weather API:** Open-Meteo (free, no API key, no PII transmitted)
- **Auth:** Single-user session auth; JWT or session cookies; no OAuth needed

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — the smallest version that replaces paper entirely and makes every inspection loggable in the field on mobile.

**Resource Requirements:** Single developer (Manuel), self-paced. No timeline pressure. Ship when it works reliably, not on a fixed date.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: Field inspection logging (primary daily use)
- Journey 3: Offline entry at remote apiary
- Journey 4: Self-hosting operations and recovery

**Must-Have Capabilities:**

| # | Capability | Rationale |
|---|---|---|
| 1 | Hive list with named/numbered hives | Can't log without knowing which hive |
| 2 | New inspection entry form (health, behaviour, queen, notes) | Core logging capability |
| 3 | Auto weather capture on entry creation | Key differentiator; removes friction |
| 4 | Per-hive inspection history (chronological list) | Enables pre-inspection review |
| 5 | Per-hive health timeline (chart) | Core value: see trends over time |
| 6 | Next-inspection notes field | Closes the feedback loop between visits |
| 7 | Sting incident tracker | Unique feature; simple log with body location |
| 8 | PWA installation + offline entry creation | Field use requirement |
| 9 | Single-user authentication | Protects self-hosted instance |
| 10 | Docker-based deployment on VPS | Self-hosting requirement |

### Post-MVP Features (Phase 2)

- Honey harvest tracker (weight, date, hive)
- Photo attachments on inspection entries (up to 3 per entry)
- Multi-hive comparison dashboard
- Data export (JSON/CSV)
- Seasonal summary auto-report

### Expansion (Phase 3)

- Medication and treatment log
- Contextual beekeeping tips based on logged observations
- Weather correlation visualisation overlaid on health timeline
- Overdue inspection push notifications
- Import from third-party apps

### Risk Mitigation Strategy

**Technical Risks:** PWA offline sync is the most technically novel aspect. Mitigation: build online-only first, add offline as a hardening step after core features work.

**Resource Risks:** Single developer, personal project. If scope is too large, drop Phase 1 optional items (sting tracker body map can be a text field initially; health timeline can be a simple list before it becomes a chart).

**Reliability Risks:** Running on VPS Lite (1vCPU, 2GB RAM). SQLite with a small dataset is well within limits. Docker restart policy handles crashes. Monthly automated database backup via cron job is the minimum acceptable data protection.

## Functional Requirements

### Hive Management

- FR1: User can create a hive with a name and optional number
- FR2: User can edit a hive's name, number, and description
- FR3: User can mark a hive as inactive (archived) without deleting it
- FR4: User can view a list of all active hives
- FR5: User can view archived hives separately from active hives
- FR6: User can delete a hive and all its associated data

### Inspection Entry

- FR7: User can create a new inspection entry for a specific hive
- FR8: User can record a health score (1–5 scale) per inspection entry
- FR9: User can record behaviour observations as free text per inspection entry
- FR10: User can record queen sighting status (seen / not seen / cells present) per entry
- FR11: User can record a next-inspection note (free text) per entry
- FR12: User can record the inspection date and time (defaults to now, editable)
- FR13: User can edit an existing inspection entry after saving
- FR14: User can delete an inspection entry

### Weather Capture

- FR15: App automatically fetches and attaches weather conditions to a new entry at time of creation (temperature, weather description, wind)
- FR16: Weather fetch uses device GPS location; falls back to last-known location or manual postcode if GPS is unavailable
- FR17: If weather fetch fails, entry is saved without weather data and is marked "weather unavailable"
- FR18: User can view the weather conditions recorded on any past inspection entry

### Inspection History & Timeline

- FR19: User can view a chronological list of all inspection entries for a specific hive
- FR20: User can view a health score timeline chart for a specific hive showing all entries over time
- FR21: User can tap any entry in the history or timeline to view its full details
- FR22: User can filter inspection history by date range

### Sting Incident Tracker

- FR23: User can create a sting incident entry with date, hive, body location, and notes
- FR24: User can view a chronological log of all sting incidents
- FR25: User can view sting incidents filtered by hive
- FR26: User can delete a sting incident entry

### Offline & Sync

- FR27: User can create inspection entries and sting incidents while offline; entries are stored locally
- FR28: Locally stored offline entries sync to the server automatically when connectivity is restored
- FR29: User can see an indicator when the app is operating in offline mode

### Authentication & Access

- FR30: User can log in with a username and password
- FR31: An authenticated session persists across browser restarts (stay logged in)
- FR32: User can log out explicitly
- FR33: All app routes are protected and inaccessible without authentication

### PWA & Installation

- FR34: App is installable on iOS and Android as a PWA (Add to Home Screen)
- FR35: App shell loads from service worker cache without network on repeat visits
- FR36: App displays a custom app icon and name when installed on home screen

### Deployment & Operations

- FR37: App is deployable via Docker Compose on a standard Linux VPS
- FR38: Application data persists in a Docker volume that survives container restarts and image updates
- FR39: App produces application logs accessible via `docker logs` or a mounted log file
- FR40: A documented runbook exists for initial deployment, update, and basic recovery

## Non-Functional Requirements

### Performance

- NFR1: App shell (HTML, CSS, JS) loads and is interactive within 3 seconds on a 4G mobile connection (measured by Lighthouse performance score ≥ 80 on mobile)
- NFR2: New inspection form renders and is interactive within 1 second of navigation
- NFR3: Inspection entry saves and confirms to the user within 2 seconds under normal server load
- NFR4: Health timeline chart for a hive with up to 200 entries renders within 2 seconds
- NFR5: Weather data fetch completes within 3 seconds; the entry form remains interactive regardless of fetch status

### Security

- NFR6: All data transmission between the browser and server uses HTTPS (TLS 1.2 minimum); enforced via Nginx reverse proxy with Let's Encrypt certificate
- NFR7: User passwords are stored as salted hashes (bcrypt or Argon2); plaintext passwords are never stored or logged
- NFR8: Authentication tokens expire after 30 days of inactivity; re-authentication is required
- NFR9: The app is not exposed on any port other than 443 (HTTPS); the Docker container binds only to localhost behind the Nginx proxy
- NFR10: Weather API calls do not transmit any user-identifying data; only GPS coordinates (lat/lon) are sent to the third-party API

### Reliability

- NFR11: The Docker container restarts automatically on crash via restart policy (`unless-stopped`)
- NFR12: Application data survives container image updates without manual migration steps
- NFR13: The application handles the loss of weather API availability gracefully; inspection entry creation does not fail if the weather API is unreachable
- NFR14: Application uptime target: ≥ 99% measured monthly (allows ≤ 7.2 hours downtime/month on a VPS that may need maintenance)

### Offline Capability

- NFR15: Offline entry creation works without network for at minimum 24 hours after last sync (service worker cache must cover all app shell assets and last-fetched hive data)
- NFR16: Offline-created entries sync to the server within 30 seconds of network reconnection, without user action
- NFR17: No data is lost if the device goes offline mid-entry; the in-progress form state is preserved

### Usability Constraints

- NFR18: All tap targets on mobile are minimum 44px × 44px as per Apple HIG / WCAG 2.5.5
- NFR19: The new inspection form requires no more than 5 taps to complete and submit with default values (health score, queen sighted: no, blank notes)
- NFR20: The app does not require an account registration flow; initial user account is created at deployment time via a setup script

---

*This PRD is the capability contract for beehiveJournal. All UX design, architecture, and development work should trace back to the requirements documented here. Update this document as scope decisions evolve.*
