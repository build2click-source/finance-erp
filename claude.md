# Enterprise ERP - AI Assistant Rules (.claude.md)

## Project Overview
This project is a high-precision, full-stack Next.js ERP application. It enforces strict financial integrity through an immutable, zero-sum double-entry ledger system.

## Tech Stack
- **Framework:** Next.js 16.2.2 (App Router) + TypeScript
- **Database:** PostgreSQL (Supabase connection pool via port 6543)
- **ORM:** Prisma v7 (using `@prisma/adapter-pg`)
- **Styling:** Vanilla CSS (No Tailwind) using the designated "Monolith of Precision" Design System

## Core Architecture & Guidelines

### 1. The Monolith of Precision Design System
- **No Tailwind CSS.** Rely entirely on strict semantic CSS global variables defined in `src/styles/design-tokens.css` and `src/app/globals.css`.
- **Theme:** "Command Navy" (`#0e1629`) base tones, precise unbordered tables, integrity anchor, subtle stagger animations. 
- **Typography:** Manrope, Inter, or Public Sans strings with precision tracking.
- **Currency:** Ensure *every* financial value uses INR (`₹`) formatting strictly conforming to the Indian locale via `Intl.NumberFormat('en-IN')` (producing lakhs and crores). Never use `$`.

### 2. General UI & State Rules
- **View Layer:** Component layers inside `src/components/views/*` should always stay isolated to their domain.
- **API Fetching:** Always adhere to the custom `useApi` hook located at `src/lib/hooks/useApi.ts` for all client-to-server data-fetching and POST mutations (`loading`, `data`, `error` handling).
- **Backend Routing:** Adhere strictly to dynamic Next.js App Router API configurations (`/api/[domain]/route.ts`).

### 3. Ledger & Financial Integrity Engine
- **Immutability:** Financial entries are immutable. Once transactions hit "posted" status, they CANNOT be edited. Instead, rely on the "Contra-Entry Protocol" designed inside `posting-engine.ts` (dr/cr reversal and recreation).
- **Zero-Sum Mechanics:** Always ensure ledger updates sum perfectly to 0 (`Dr` + `Cr` = `0`). Dr values are strictly positive, Cr values are continuously negative.
- **Transaction Atomicity:** All financial engine events (`receipts-engine.ts`, `invoice-engine.ts`, `inventory-engine.ts`) *must* be implemented cohesively within `prisma.$transaction`. Partial entries cause systemic failure.
- **Account Types:** Maintain strict adherence to Chart of Account categorizations (Asset, Liability, Equity, Revenue, Expense) as established by the seed data.

### 4. Code Structuring & Execution Strategy
- Put all shared UI primitives in `src/components/ui/` with rigorous typed properties.
- Keep business logic segregated within their dedicated engines (`src/lib/ledger`, `src/lib/inventory`, `src/lib/invoicing`, `src/lib/compliance`). Do not overload Next.js API Routes with monolithic procedural loops. 
- During API adapter implementations (e.g., E-Invoicing & IRP responses), gracefully mock the provider Sandbox until live credentials are confirmed, but guarantee the exact JSON schemas and typed schemas are rigorously upheld. Validations use `zod`.

## Testing & Quality Assurance
- Zero TypeScript errors are an absolute requirement before confirming a task complete.
- Verify UI and build artifacts locally (`npm run build`).

Follow these foundational rules to keep the Enterprise ERP resilient and performant.
