-- URGENT REGRESSION FIX (discovered during Phase 3 audit, not a new
-- Phase 3 change): migration 032 replaced each table's single "Members can
-- manage studio X" FOR ALL policy with permission-scoped INSERT/UPDATE/
-- DELETE policies, on the assumption that every affected table also had a
-- separate, dedicated "Members can view studio X" SELECT policy it could
-- leave untouched (true for clients, contracts, bookings, projects,
-- websites, quotes, invoices, products, orders — all confirmed to still
-- have their own SELECT policy after 032).
--
-- tasks, expenses, and questionnaire_templates did NOT have a separate
-- SELECT policy — their only SELECT-covering policy was the FOR ALL one
-- that 032 dropped. Since FOR ALL includes SELECT, dropping it with no
-- replacement left these three tables with RLS enabled and zero SELECT
-- policy, which defaults to deny-all: confirmed live against production
-- that even a studio_owner reading their own studio's tasks/expenses/
-- questionnaire_templates via the normal (non-service-role) client gets
-- an empty result. getTasks/getExpenses/getTemplates (src/lib/actions/
-- tasks.ts, expenses.ts, questionnaires.ts) all read through the RLS-bound
-- client, so this broke those three dashboards for every role in every
-- studio the moment 032 was deployed.
--
-- Fix: add back the same "Members can view studio X" SELECT policy shape
-- already used by every other table 032 touched. Purely additive/
-- restorative — restores exactly the read access that existed before 032,
-- does not touch or weaken anything 032 added for INSERT/UPDATE/DELETE.

CREATE POLICY "Members can view studio tasks" ON tasks FOR SELECT
  USING (is_studio_member(studio_id));

CREATE POLICY "Members can view studio expenses" ON expenses FOR SELECT
  USING (is_studio_member(studio_id));

CREATE POLICY "Members can view studio questionnaire templates" ON questionnaire_templates FOR SELECT
  USING (is_studio_member(studio_id));
