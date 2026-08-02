-- Distinguishes master templates from athlete-specific assigned plan copies.
-- Existing plans become templates (is_template = true by default).
-- When a template is assigned, copyAndAssignPlan creates a copy with is_template = false
-- and template_id pointing back to the source, so edits to the copy never touch the template.

alter table public.training_plans
  add column if not exists is_template boolean not null default true;

alter table public.training_plans
  add column if not exists template_id uuid references public.training_plans(id);
