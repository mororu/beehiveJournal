## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is in the planning/design phase. No application code exists yet. The project is named **beehiveJournal** and is being developed using the BMAD (Business Management & Agile Development) framework for AI-assisted product development.

## Repository Structure

- `_bmad/` — BMAD framework installation (v6.0.4). Contains agents, workflows, and tasks for product development orchestration. Do not modify unless working on BMAD configuration.
- `_bmad-output/` — Generated output from BMAD workflows (PRDs, architecture docs, stories, etc.). Files here are produced by BMAD agents.
- `docs/` — Project documentation (currently empty, intended for project docs).

## BMAD Configuration

- Config: `_bmad/core/config.yaml`
- User: Manuel
- Output language: English
- Output folder: `_bmad-output/`

## BMAD Workflow

The BMAD framework drives the development lifecycle. Use slash commands (available as skills) to invoke BMAD agents:

- `/bmad-agent-bmad-master` — Main orchestrator; start here for guidance
- `/bmad-help` — Get advice on what to do next
- `/bmad-bmm-create-product-brief` → `/bmad-bmm-create-prd` → `/bmad-bmm-create-architecture` → `/bmad-bmm-create-epics-and-stories` → `/bmad-bmm-sprint-planning` → `/bmad-bmm-dev-story`

All BMAD output (PRDs, architecture docs, stories) goes to `_bmad-output/`.
