-- Phase 5 P4 enabling infrastructure -- and an independently-discovered,
-- more serious live bug found while investigating it.
--
-- questionnaire_responses has RLS enabled but has NEVER had an INSERT
-- or UPDATE policy -- only a membership-only SELECT policy exists (out
-- of this migration's scope, left untouched). Live-confirmed via a
-- disposable studio_owner + real JWT: sendQuestionnaire's INSERT
-- (src/lib/actions/questionnaires.ts, called through the regular
-- RLS-bound client) currently fails in production for EVERY role,
-- including studio_owner, with "new row violates row-level security
-- policy for table \"questionnaire_responses\"". The "send a
-- questionnaire to a client" feature is therefore completely broken
-- today -- not a permissions/role-boundary issue, a fully dead feature,
-- for a reason unrelated to anything touched in migrations 032-040.
-- Not introduced by this migration or any prior one this session --
-- this table's write policies appear to simply never have been created
-- in the first place (checked: no earlier migration adds one either).
--
-- This migration adds both missing policies, since regenerating a
-- response's share token (this phase's actual P4 ask) is meaningless
-- without the ability to create a response in the first place, and both
-- gaps share the same root cause and the same table:
--   INSERT: gated on questionnaires:send, matching exactly the
--     permission sendQuestionnaire already checks at the app layer
--     (requireStudioPermission('questionnaires:send')) -- so this
--     migration doesn't change WHO can send a questionnaire, only makes
--     the already-intended check actually take effect at the DB layer.
--   UPDATE: gated on questionnaires:update, required for
--     regenerateQuestionnaireResponseShareToken (added this phase) to
--     function at all through the RLS-bound client, matching the
--     invoice/quote share-token regeneration pattern (which relies on
--     those tables already having a granular UPDATE policy from
--     migration 032).
--
-- Does not touch the existing SELECT policy or add DELETE -- both out
-- of this migration's scope.

CREATE POLICY "Members can create studio questionnaire responses" ON questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (has_studio_permission(studio_id, 'questionnaires:send'));

CREATE POLICY "Members can update studio questionnaire responses" ON questionnaire_responses FOR UPDATE
  TO authenticated
  USING (is_studio_member(studio_id))
  WITH CHECK (has_studio_permission(studio_id, 'questionnaires:update'));
