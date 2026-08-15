-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 019: TASKS, EXPENSES, QUESTIONNAIRES
-- =============================================================================

-- =============================================================================
-- TASKS
-- =============================================================================

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_studio_id ON tasks(studio_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage studio tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (is_studio_member(studio_id))
  WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- EXPENSES
-- =============================================================================

CREATE TYPE expense_category AS ENUM (
  'equipment', 'software', 'travel', 'marketing', 'venue', 'staff', 'supplies', 'other'
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category expense_category NOT NULL DEFAULT 'other',
  vendor TEXT,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_studio_id ON expenses(studio_id, expense_date DESC);
CREATE INDEX idx_expenses_project_id ON expenses(project_id) WHERE project_id IS NOT NULL;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage studio expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (is_studio_member(studio_id))
  WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- QUESTIONNAIRES
-- =============================================================================

CREATE TABLE questionnaire_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- [{ id, type, label, required, options? }], type is one of: text, long_text,
  -- email, phone, date, time, number, dropdown, checkbox, radio, file_upload, signature
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES questionnaire_templates(id) ON DELETE CASCADE,
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  share_token TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE questionnaire_responses IS 'One row per questionnaire sent to a client. Public fill-out access is via share_token through trusted server code (service-role client), the same model already used for gallery share links -- there is no anon RLS policy here by design.';

CREATE INDEX idx_questionnaire_templates_studio_id ON questionnaire_templates(studio_id);
CREATE INDEX idx_questionnaire_responses_studio_id ON questionnaire_responses(studio_id);
CREATE INDEX idx_questionnaire_responses_template_id ON questionnaire_responses(template_id);
CREATE UNIQUE INDEX idx_questionnaire_responses_share_token ON questionnaire_responses(share_token);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage studio questionnaire templates"
  ON questionnaire_templates FOR ALL
  TO authenticated
  USING (is_studio_member(studio_id))
  WITH CHECK (is_studio_member(studio_id));

CREATE POLICY "Members can view studio questionnaire responses"
  ON questionnaire_responses FOR SELECT
  TO authenticated
  USING (is_studio_member(studio_id));
