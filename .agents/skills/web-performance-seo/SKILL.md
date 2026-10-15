---
name: web-performance-seo
description: Padrões de alta performance web, otimização de Core Web Vitals, SSR/RSC e SEO técnico inspirados nas diretrizes de Addy Osmani.
---

# Skill: Web Performance & SEO Optimization

Esta skill estabelece os padrões técnicos aplicáveis às aplicações em `apps/web/` e `apps/landing/`.

## 1. Core Web Vitals
- **LCP (< 2.5s)**: Imagens hero da primeira dobra com a propriedade `priority`.
- **CLS (< 0.1)**: Mídia com dimensões explícitas (`width` e `height`) e fontes com swap automático.
- **INP (< 200ms)**: Tarefas longas divididas para evitar travamento da thread principal.

## 2. Padrão Server-First (React Server Components)
- Mantenha a maior parte dos componentes como Server Components puros.
- Restrinja `'use client'` às folhas da árvore com interatividade imediata.
- Mutações centralizadas em Server Actions com validação Zod.
