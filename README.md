# Advanced Kanban Board

High-performance, mobile-first Kanban project management tool designed for modern teams.

---

## Core Features
* **Advanced Drag-and-Drop**: A high-performance drag-and-drop system built with dnd-kit that manages both individual card movements and cross-column reordering.
* **Mobile Optimized Experience**: A fully responsive design that eliminates scrolling conflicts on touchscreens, ensuring a fluid experience on mobile devices.
* **Centralized Task Management**: A comprehensive task management structure where titles, descriptions, due dates and assignees are edited through a centralized modal interface.
* **Advanced Invitation & Member Management**: A robust administrative infrastructure allowing board owners to invite users, featuring role-based access control (RBAC).
* **Dynamic Labeling System**: A color-coded and quickly assignable label infrastructure for visual task categorization.
* **Comprehensive Activity History**: A detailed activity log system that tracks every action on the board (movements, edits), including who performed them and when.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Database / ORM** | PostgreSQL + Prisma |
| **DND** | dnd-kit |
| **Styling** | Tailwind CSS + Shadcn/UI |
| **Auth** | Next-Auth |
| **Deployment** | Vercel |