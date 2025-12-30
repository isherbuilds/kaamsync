# KaamSync

The operating system for field teams. KaamSync is an offline-first task management platform designed to bridge the gap between office managers and frontline workers.

## 🚀 Tech Stack

Built with a modern, performance-focused stack:

- **Framework**: [React Router v7](https://reactrouter.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Sync Engine**: [Zero](https://zero.rocicorp.dev/) for local-first, offline-capable data sync
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) & [Lucide Icons](https://lucide.dev/)

## ✨ Key Features

Based on our robust schema design:

### 🏢 Organization & Teams
- Multi-tenant architecture with **Organizations**.
- **Teams** for granular team separation (e.g., "Maintenance", "Logistics").
- Role-based access control (Manager, Member, Viewer).

### 📋 Matters (Tasks & Requests)
The core unit of work is a "Matter", which can be:
- **Tasks**: Standard to-do items with assignees, due dates, and priorities.
- **Requests**: Formal requests from field workers that require approval.
- **Short IDs**: Linear-style identifiers (e.g., `GEN-123`) for easy reference.

### 🔄 Workflows
- **Request/Approval**: Built-in workflow for submitting requests and getting manager approval.
- **Status Tracking**: Customizable statuses per team.
- **Timelines**: Complete audit log of every action (creation, status changes, comments).

### 👁️ Oversight
- **Watchers**: Stakeholders can "watch" matters to stay informed without being assigned.
- **Views**: Track who has viewed a matter and when.
- **Subscriptions**: Customizable notification settings.

### ⚡ Offline First
- Built on **Zero**, ensuring the app works perfectly without an internet connection.
- Changes sync automatically when connectivity is restored.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/better-tasks.git
   cd better-tasks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env` and configure your database credentials and auth secrets.
   ```bash
   cp .env.example .env
   ```

4. **Database Setup**
   Generate the database schema:
   ```bash
   npm run db:generate
   ```

5. **Zero Database Setup**
   Generate schema for zero:
   ```bash
   npm run db:generate-zero
   ```
   
6. **Seed database (Optional)**
   ```bash
   npm run db:seed
   ```

### Running the App

The project uses several services that need to run simultaneously make sure **docker is started with postgres:17-alpine**.

**Development Server `scripts/dev.ts`**
```bash
npm run dev
```

**Runs all the required commands check `scripts/dev.ts` and `scripts/` folder**

## 📂 Project Structure

- `app/routes`: React Router file-system routing.
- `app/db/schema`: Drizzle ORM schema definitions.
- `app/components`: Reusable UI components.
- `app/lib`: Utilities and helpers.
- `zero`: Zero sync configuration and generated schema.
