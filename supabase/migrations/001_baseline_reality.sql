-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 001: BASELINE (RECONSTRUCTED FROM REALITY)
-- =============================================================================
-- Replaces the original 001_core_tables.sql / 002_booking_crm_financial_
-- store_website.sql / 004_views_triggers.sql, which described a schema that
-- was never actually deployed (see supabase/migrations/_archived/README.md
-- for the full comparison). This file was reconstructed directly from the
-- live production database's actual schema via introspection
-- (pg_attribute/pg_constraint/pg_indexes/pg_policies/pg_proc), not guessed
-- or copied from the old drafts.
--
-- Scoped deliberately to schema state as it existed immediately before
-- migration 013 — i.e. it does NOT include anything 013 through 028 already
-- create or alter (plans, subscriptions, payments, notifications, tasks,
-- expenses, questionnaire_templates, questionnaire_responses,
-- upload_reservations, signup_risk_signals, the studio_storage_usage view,
-- gallery.layout_type/cover_template, media.original_key/storage_bytes,
-- invoices/quotes/orders.share_token, products.digital_file_key/name,
-- orders.email/currency, payments.plan_id/order_id) so that a fresh
-- `supabase db reset` replays 013-028 cleanly on top of this baseline
-- exactly as they already do against the live database today.
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'studio_owner', 'photographer', 'team_member', 'editor', 'client');
CREATE TYPE studio_member_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE client_status AS ENUM ('lead', 'active', 'inactive', 'archived');
CREATE TYPE gallery_type AS ENUM ('wedding', 'portrait', 'commercial', 'event', 'other');
CREATE TYPE gallery_status AS ENUM ('draft', 'published', 'archived', 'private');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE booking_status AS ENUM ('inquiry', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE project_status AS ENUM ('planning', 'scheduled', 'in_progress', 'editing', 'review', 'delivered', 'archived');
CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'completed', 'expired', 'declined', 'cancelled');
CREATE TYPE signer_status AS ENUM ('pending', 'signed', 'declined');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded');
CREATE TYPE product_type AS ENUM ('digital', 'print', 'album', 'package', 'service');
CREATE TYPE product_status AS ENUM ('active', 'draft', 'archived');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded');
CREATE TYPE website_status AS ENUM ('published', 'draft', 'archived');

-- =============================================================================
-- HELPER FUNCTIONS (used by triggers/RLS policies below)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
begin
  new.updated_at = now();
  return new;
end;
$$ LANGUAGE plpgsql SET search_path TO 'public';

-- =============================================================================
-- STUDIOS
-- =============================================================================

CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT,
  description TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  legal_business_name TEXT,
  tax_id TEXT,
  business_type TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_terms TEXT NOT NULL DEFAULT 'net30',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX studios_owner_id_idx ON studios(owner_id);

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PROFILES
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'studio_owner',
  studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_studio_id_idx ON profiles(studio_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile row for every new auth user, defaulting to
-- studio_owner (a user only becomes a team_member/editor/etc. by being
-- invited into an existing studio, which updates this row separately).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'studio_owner'
  );
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- STUDIO MEMBERS
-- =============================================================================

CREATE TABLE studio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'team_member',
  status studio_member_status NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, user_id)
);

CREATE INDEX studio_members_user_id_idx ON studio_members(user_id);

ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON studio_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Membership/role-check helpers used throughout this file's RLS policies
-- (and by every server action in the app). SECURITY DEFINER + a pinned
-- search_path so they can be safely called from any RLS policy regardless
-- of the calling role, without the caller needing direct SELECT access to
-- studio_members themselves for the check to work.
CREATE OR REPLACE FUNCTION is_studio_member(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.studio_members
    where studio_id = p_studio_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_studio_manager(p_studio_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.studio_members
    where studio_id = p_studio_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('studio_owner', 'photographer')
  );
$$;

-- Studios: created by an authenticated user (owner_id = auth.uid()), then
-- visible/manageable to members via is_studio_member/is_studio_manager.
CREATE POLICY "Authenticated users can create a studio" ON studios FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can view their own studio" ON studios FOR SELECT
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY "Members can view their studio" ON studios FOR SELECT
  USING (is_studio_member(id));
CREATE POLICY "Owners/photographers can update their studio" ON studios FOR UPDATE
  USING (is_studio_manager(id));

-- Studio members: an owner can add themselves as the studio's first member
-- (bootstrapping — there's no manager yet to add them), after which further
-- membership changes go through a manager.
CREATE POLICY "Studio owners can add themselves as the first member" ON studio_members FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'studio_owner'
    AND EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_members.studio_id AND s.owner_id = (SELECT auth.uid()))
  );
CREATE POLICY "Members can view studio membership" ON studio_members FOR SELECT
  USING (is_studio_member(studio_id) OR (user_id = (SELECT auth.uid())));
CREATE POLICY "Managers can manage studio membership" ON studio_members FOR ALL
  USING (is_studio_manager(studio_id)) WITH CHECK (is_studio_manager(studio_id));

-- Profiles: users manage their own; teammates can see each other's basic
-- info (shared studio membership, both active).
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Studio members can view teammate profiles" ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM studio_members sm1 JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
    WHERE sm1.user_id = (SELECT auth.uid()) AND sm1.status = 'active'
      AND sm2.user_id = profiles.id AND sm2.status = 'active'
  ));

-- =============================================================================
-- CLIENTS
-- =============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  name TEXT GENERATED ALWAYS AS (TRIM(BOTH FROM (first_name || ' ' || last_name))) STORED,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  status client_status NOT NULL DEFAULT 'lead',
  source TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  last_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clients_studio_id_idx ON clients(studio_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio clients" ON clients FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio clients" ON clients FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- BOOKINGS
-- =============================================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_name TEXT NOT NULL,
  package_name TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  status booking_status NOT NULL DEFAULT 'inquiry',
  session_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_studio_id_idx ON bookings(studio_id);
CREATE INDEX bookings_client_id_idx ON bookings(client_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio bookings" ON bookings FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio bookings" ON bookings FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- PROJECTS
-- =============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  status project_status NOT NULL DEFAULT 'planning',
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX projects_studio_id_idx ON projects(studio_id);
CREATE INDEX projects_client_id_idx ON projects(client_id);
CREATE INDEX projects_booking_id_idx ON projects(booking_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio projects" ON projects FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio projects" ON projects FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- GALLERIES
-- =============================================================================

CREATE TABLE galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type gallery_type NOT NULL DEFAULT 'other',
  shoot_date DATE,
  status gallery_status NOT NULL DEFAULT 'draft',
  password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_favorites BOOLEAN NOT NULL DEFAULT true,
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,
  expiry_days INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  custom_domain TEXT,
  share_token TEXT NOT NULL UNIQUE,
  cover_image TEXT,
  media_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX galleries_studio_id_idx ON galleries(studio_id);
CREATE INDEX galleries_client_id_idx ON galleries(client_id);
CREATE INDEX galleries_created_by_idx ON galleries(created_by);
CREATE INDEX galleries_share_token_idx ON galleries(share_token);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON galleries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio galleries" ON galleries FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio galleries" ON galleries FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));
CREATE POLICY "Public can view published galleries" ON galleries FOR SELECT USING (status = 'published');

-- Public gallery-viewer RPCs (share_token based, never a raw studio/gallery
-- id from the client) — SECURITY DEFINER so an anonymous visitor can bump
-- these counters without needing direct UPDATE access to galleries.
CREATE OR REPLACE FUNCTION increment_gallery_view(token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  update public.galleries set view_count = view_count + 1 where share_token = token;
end;
$$;

CREATE OR REPLACE FUNCTION increment_gallery_download(token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  update public.galleries set download_count = download_count + 1 where share_token = token;
end;
$$;

-- =============================================================================
-- GALLERY ALBUMS
-- =============================================================================

CREATE TABLE gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  media_count INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX gallery_albums_gallery_id_idx ON gallery_albums(gallery_id);

ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage albums" ON gallery_albums FOR ALL
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_albums.gallery_id AND is_studio_member(g.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_albums.gallery_id AND is_studio_member(g.studio_id)));
CREATE POLICY "Public can view albums of published galleries" ON gallery_albums FOR SELECT
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_albums.gallery_id AND g.status = 'published'));

-- =============================================================================
-- MEDIA
-- =============================================================================
-- Note: original_key/storage_bytes are added later by migration 016.

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  album_id UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  type media_type NOT NULL DEFAULT 'image',
  size BIGINT,
  width INTEGER,
  height INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX media_gallery_id_idx ON media(gallery_id);
CREATE INDEX media_album_id_idx ON media(album_id);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage media" ON media FOR ALL
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = media.gallery_id AND is_studio_member(g.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM galleries g WHERE g.id = media.gallery_id AND is_studio_member(g.studio_id)));
CREATE POLICY "Public can view media of published galleries" ON media FOR SELECT
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = media.gallery_id AND g.status = 'published'));

-- =============================================================================
-- GALLERY SHARE SETTINGS
-- =============================================================================

CREATE TABLE gallery_share_settings (
  gallery_id UUID PRIMARY KEY REFERENCES galleries(id) ON DELETE CASCADE,
  link_name TEXT,
  password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_favorites BOOLEAN NOT NULL DEFAULT true,
  require_email BOOLEAN NOT NULL DEFAULT false,
  collect_email BOOLEAN NOT NULL DEFAULT false,
  custom_branding BOOLEAN NOT NULL DEFAULT false,
  brand_name TEXT,
  brand_logo TEXT,
  brand_color TEXT,
  cover_image TEXT,
  notify_on_view BOOLEAN NOT NULL DEFAULT false,
  notify_on_download BOOLEAN NOT NULL DEFAULT true,
  notify_on_favorite BOOLEAN NOT NULL DEFAULT false,
  notify_on_comment BOOLEAN NOT NULL DEFAULT true,
  allow_embed BOOLEAN NOT NULL DEFAULT false,
  embed_width INTEGER NOT NULL DEFAULT 800,
  embed_height INTEGER NOT NULL DEFAULT 600,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_share_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON gallery_share_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can manage share settings" ON gallery_share_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_share_settings.gallery_id AND is_studio_member(g.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_share_settings.gallery_id AND is_studio_member(g.studio_id)));
CREATE POLICY "Public can view share settings of published galleries" ON gallery_share_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_share_settings.gallery_id AND g.status = 'published'));

-- =============================================================================
-- CONTRACTS
-- =============================================================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  status contract_status NOT NULL DEFAULT 'draft',
  template_id TEXT,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_required NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX contracts_studio_id_idx ON contracts(studio_id);
CREATE INDEX contracts_client_id_idx ON contracts(client_id);
CREATE INDEX contracts_project_id_idx ON contracts(project_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio contracts" ON contracts FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio contracts" ON contracts FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- CONTRACT SIGNERS
-- =============================================================================

CREATE TABLE contract_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status signer_status NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ
);

CREATE INDEX contract_signers_contract_id_idx ON contract_signers(contract_id);

ALTER TABLE contract_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage contract signers" ON contract_signers FOR ALL
  USING (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_signers.contract_id AND is_studio_member(c.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_signers.contract_id AND is_studio_member(c.studio_id)));

-- =============================================================================
-- QUOTES
-- =============================================================================
-- Note: share_token is added later by migration 022.

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, quote_number)
);

CREATE INDEX quotes_studio_id_idx ON quotes(studio_id);
CREATE INDEX quotes_client_id_idx ON quotes(client_id);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio quotes" ON quotes FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio quotes" ON quotes FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- QUOTE ITEMS
-- =============================================================================

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX quote_items_quote_id_idx ON quote_items(quote_id);

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage quote items" ON quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND is_studio_member(q.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND is_studio_member(q.studio_id)));

-- =============================================================================
-- INVOICES
-- =============================================================================
-- Note: share_token is added later by migration 022.

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, invoice_number)
);

CREATE INDEX invoices_studio_id_idx ON invoices(studio_id);
CREATE INDEX invoices_client_id_idx ON invoices(client_id);
CREATE INDEX invoices_project_id_idx ON invoices(project_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio invoices" ON invoices FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio invoices" ON invoices FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- INVOICE ITEMS
-- =============================================================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX invoice_items_invoice_id_idx ON invoice_items(invoice_id);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage invoice items" ON invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND is_studio_member(i.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND is_studio_member(i.studio_id)));

-- =============================================================================
-- PRODUCTS
-- =============================================================================
-- Note: digital_file_key/digital_file_name are added later by migration 023.

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type product_type NOT NULL DEFAULT 'digital',
  status product_status NOT NULL DEFAULT 'draft',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2),
  cost NUMERIC(12,2),
  inventory INTEGER,
  sku TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  sales_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_studio_id_idx ON products(studio_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio products" ON products FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio products" ON products FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (status = 'active');

-- =============================================================================
-- ORDERS
-- =============================================================================
-- Note: email/currency/share_token are added later by migration 023.

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, order_number)
);

CREATE INDEX orders_studio_id_idx ON orders(studio_id);
CREATE INDEX orders_client_id_idx ON orders(client_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio orders" ON orders FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio orders" ON orders FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_product_id_idx ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage order items" ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_studio_member(o.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_studio_member(o.studio_id)));

-- =============================================================================
-- WEBSITES
-- =============================================================================

CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  custom_domain TEXT,
  status website_status NOT NULL DEFAULT 'draft',
  template TEXT NOT NULL DEFAULT 'modern-minimal',
  template_name TEXT,
  theme JSONB NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}',
  ssl_enabled BOOLEAN NOT NULL DEFAULT true,
  password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  visits INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX websites_studio_id_idx ON websites(studio_id);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can view studio websites" ON websites FOR SELECT USING (is_studio_member(studio_id));
CREATE POLICY "Members can manage studio websites" ON websites FOR ALL USING (is_studio_member(studio_id)) WITH CHECK (is_studio_member(studio_id));
CREATE POLICY "Public can view published websites" ON websites FOR SELECT USING (status = 'published');

-- =============================================================================
-- WEBSITE PAGES
-- =============================================================================

CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  content JSONB NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX website_pages_website_id_idx ON website_pages(website_id);

ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Members can manage website pages" ON website_pages FOR ALL
  USING (EXISTS (SELECT 1 FROM websites w WHERE w.id = website_pages.website_id AND is_studio_member(w.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM websites w WHERE w.id = website_pages.website_id AND is_studio_member(w.studio_id)));
CREATE POLICY "Public can view published pages of published websites" ON website_pages FOR SELECT
  USING (is_published = true AND EXISTS (SELECT 1 FROM websites w WHERE w.id = website_pages.website_id AND w.status = 'published'));
