# beehiveJournal

A self-hosted Progressive Web App for hobbyist beekeepers to log hive inspections, track colony health, and build a longitudinal record of their apiary.

## Getting Started

### Prerequisites

- Node.js 20 LTS (`node --version` → `v20.x.x`)
- Docker + Docker Compose v2 (`docker compose version`)
- Git

### Local Development

```sh
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — set DATABASE_PATH and JWT_SECRET

# 3. Create the data directory
mkdir -p data

# 4. Run database migrations
npm run db:migrate

# 5. Create your user account
npm run create-user -- <username> <password>

# 6. Start the dev server
npm run dev
# App runs at http://localhost:5173
```

### Useful Commands

| Command                                | Description                               |
| -------------------------------------- | ----------------------------------------- |
| `npm run dev`                          | Start Vite dev server at `localhost:5173` |
| `npm run build`                        | Compile production build to `build/`      |
| `npm run lint`                         | Run ESLint + Prettier checks              |
| `npm run format`                       | Auto-format code with Prettier            |
| `npm run db:migrate`                   | Apply pending database migrations         |
| `npm run db:studio`                    | Open Drizzle Studio at `localhost:4983`   |
| `npm run create-user -- <user> <pass>` | Create a user account                     |

### Docker

```sh
# Build and run with Docker Compose
docker compose build
docker compose up

# App accessible at http://localhost:3000
```

## Project Documentation

All planning artifacts are in `_bmad-output/planning-artifacts/`:

- `prd.md` — Product Requirements Document
- `architecture.md` — Technical architecture
- `epics-and-stories.md` — Full backlog (33 stories, 87 SP)
- `sprint-plan.md` — 10-sprint plan

Implementation guides are in `_bmad-output/implementation-artifacts/`.
