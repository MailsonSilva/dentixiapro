# DentixiaPro App Documentation

This document outlines the current state and architecture of the DentixiaPro application.

## Overview

DentixiaPro is a multi-tenant web application built to manage dental clinics ("company" or "tenant"). It serves as a CRM, scheduling system, and settings manager. The system heavily leverages AI automation for chatbots and appointments, alongside standard SaaS capabilities.

**Location:** `d:\m_fer\Documents\DaLua Apps\Projetos\DentixiaPro\app`
**Tech Stack:** Next.js (App Directory), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS).

## Architecture

The system uses a robust **RBAC (Role-Based Access Control) Multi-Tenant Architecture**. 

*   **Tenant Binding:** All domains are strictly bound to a `company_id`.
*   **User Roles (Global):** Stored in `usuarios.tipo` (`comum`, `parceiro`, `super_admin`).
*   **Company Roles:** Stored in `user_company.role` (`admin`, `manager`, `user`).
*   **Security Policies (RLS):** Data access is governed by Supabase Row Level Security using functions like `can_access_company()`, `is_admin_of()`, and `is_super_admin()`.

*For deep architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).*

## Directory Structure

*   **/api**: Next.js API routes (e.g., evolution webhook endpoints).
*   **/components**: Reusable React components (UI elements, layout wrappers).
*   **/lib**: Utility functions, React contexts (e.g., `DrawerContext.tsx`), and configuration files.
*   **/supabase**: Contains database migrations and setup scripts (`/migrations`).
*   *Application Routes:*
    *   **/agenda**: Calendar and appointment management.
    *   **/clientes**: Patient and contact management CRM.
    *   **/configuracoes**: System and business hours settings.
    *   **/crm**: Kanban boards and sales pipelines.
    *   **/mensagens**: Hybrid AI/Human chat interface.
    *   **/simulacoes**: Treatment simulation features and results.
    *   **/perfil**, **/planos**, **/indique-e-ganhe**: Account and billing management.
    *   **/login**, **/register**, **/forgot**: Authentication flows.

## Recent Features & Core Workflows

1.  **Hybrid Chat AI (Mensagens):** Integrates with Evolution API and n8n to provide a seamless chatbot experience where human agents can take over, pausing the AI automatically. It differentiates between AI messages and human agent messages dynamically in real-time.
2.  **Scheduling via n8n:** N8n automation handles complex scheduling scenarios by factoring in clinic business hours and checking existing slots directly.
3.  **Simulation & Autocomplete:** Implements an advanced UI for client search predicting results from the `contacts` table, ensuring proper patient logging.
4.  **Vídeo de Boas-Vindas Vertical (Admin & Todos os Usuários Comuns):** O vídeo do YouTube cadastrado pelo Admin (`system_settings.welcome_video_url`) é distribuído publicamente para todos os usuários comuns ao entrarem no sistema. Exibido em modal de proporção vertical 1080x1920 (9:16) ocupando ~80% da altura da tela (`h-[80vh]`), contendo botões estilizados de confirmação "Já assisti a este vídeo" que persistem em `usuarios.check_video`.

## Clean Up Notes
Unnecessary debug scripts (`check_supabase*.mjs`, `query.mjs`, `query.ts`, `eslint_report.json`) have been removed from the root to maintain a clean workspace. Database migrations have been properly organized into `supabase/migrations/`.

## Spec-Driven Decisions (April 2026)

*   **Procedure Unification:** All logic for listing, checking, and validating procedures across components (Calendar, Scheduling, History) MUST use a global single source of truth for the CRUD of Procedures (e.g., `ProcedureGrid` / `useProcedures` hook).
*   **Business Hours Constraints:** Calendar processing must strictly respect 'Horário de Funcionamento' settings on both frontend (UI disablement like cross-hatching) and backend API validation. No appointments should be allowed outside the designated business hours.
*   **UI Structure:** Multi-item configurations (like adding procedures) must utilize full-width responsive grids instead of fixed mobile-like widths to leverage desktop space efficiently.
