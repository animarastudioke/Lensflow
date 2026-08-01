-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 001: CORE TABLES
-- =============================================================================
-- This migration creates the core tables for the LensFlow application.
-- Run with: supabase db push
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'studio_owner',
  'photographer',
  'team_member',
  'editor',
  'client'
);

CREATE TYPE member_status AS ENUM (
  'pending',
  'active',
  'inactive'
);

CREATE TYPE client_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost'
);

CREATE TYPE project_type AS ENUM (
  'wedding',
  'portrait',
  'event',
  'commercial',
  'product',
  'real_estate',
  'other'
);

CREATE TYPE project_status AS ENUM (
  'inquiry',
  'booked',
  'in_progress',
  'delivered',
  'completed',
  'cancelled'
);

CREATE TYPE gallery_status AS ENUM (
  'draft',
  'private',
  'shared',
  'public',
  'archived'
);

CREATE TYPE media_type AS ENUM (
  'image',
  'video'
);

CREATE TYPE media_status AS ENUM (
  'uploading',
  'processing',
  'ready',
  'failed',
  'deleted'
);

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

CREATE TYPE contract_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'signed',
  'declined',
  'expired'
);

CREATE TYPE quote_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'converted'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'paid',
  'partial',
  'overdue',
  'void',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partial'
);

CREATE TYPE payment_provider AS ENUM (
  'stripe',
  'flutterwave',
  'mpesa',
  'paypal',
  'manual',
  'other'
);

CREATE TYPE product_type AS ENUM (
  'digital',
  'print',
  'frame',
  'album',
  'book',
  'canvas',
  'usb',
  'package'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TYPE order_payment_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'refunded',
  'failed'
);

CREATE TYPE fulfillment_status AS ENUM (
  'unfulfilled',
  'partial',
  'fulfilled'
);

CREATE TYPE coupon_type AS ENUM (
  'percentage',
  'fixed',
  'free_shipping'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'whatsapp',
  'in_app',
  'push'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  role user_role NOT NULL DEFAULT 'client',
  status member_status NOT NULL DEFAULT 'pending',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- STUDIOS
-- =============================================================================

CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  domain TEXT UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  locale TEXT NOT NULL DEFAULT 'en',
  settings JSONB NOT NULL DEFAULT '{}',
  billing_email TEXT,
  billing_address JSONB,
  tax_id TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_studios_owner_id ON studios(owner_id);
CREATE INDEX idx_studios_slug ON studios(slug);
CREATE INDEX idx_studios_domain ON studios(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_studios_is_active ON studios(is_active);
CREATE INDEX idx_studios_deleted_at ON studios(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- TEAM MEMBERS
-- =============================================================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'team_member',
  status member_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT '[]',
  custom_permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, profile_id)
);

CREATE INDEX idx_team_members_studio_id ON team_members(studio_id);
CREATE INDEX idx_team_members_profile_id ON team_members(profile_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE INDEX idx_team_members_deleted_at ON team_members(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- CLIENTS
-- =============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email CITEXT NOT NULL,
  phone TEXT,
  address JSONB,
  status client_status NOT NULL DEFAULT 'active',
  source TEXT,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  total_spent BIGINT NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, email)
);

CREATE INDEX idx_clients_studio_id ON clients(studio_id);
CREATE INDEX idx_clients_profile_id ON clients(profile_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);
CREATE INDEX idx_clients_created_at ON clients(created_at);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- LEADS
-- =============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email CITEXT NOT NULL,
  phone TEXT,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  estimated_value BIGINT,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, email)
);

CREATE INDEX idx_leads_studio_id ON leads(studio_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_next_follow_up_at ON leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- PROJECTS
-- =============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type project_type NOT NULL DEFAULT 'other',
  status project_status NOT NULL DEFAULT 'inquiry',
  start_date DATE,
  end_date DATE,
  location TEXT,
  cover_image_id UUID,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_studio_id ON projects(studio_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_lead_id ON projects(lead_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_assigned_to ON projects(assigned_to);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- GALLERIES
-- =============================================================================

CREATE TABLE galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  status gallery_status NOT NULL DEFAULT 'draft',
  password_hash TEXT,
  pin_hash TEXT,
  allow_download BOOLEAN NOT NULL DEFAULT TRUE,
  allow_favorites BOOLEAN NOT NULL DEFAULT TRUE,
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  allow_proofing BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  watermark_opacity INT NOT NULL DEFAULT 50 CHECK (watermark_opacity BETWEEN 10 AND 100),
  watermark_position TEXT NOT NULL DEFAULT 'center' CHECK (watermark_position IN ('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right')),
  watermark_image_id UUID,
  cover_image_id UUID,
  expires_at TIMESTAMPTZ,
  views_count BIGINT NOT NULL DEFAULT 0,
  downloads_count BIGINT NOT NULL DEFAULT 0,
  favorites_count BIGINT NOT NULL DEFAULT 0,
  comments_count BIGINT NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, slug)
);

CREATE INDEX idx_galleries_studio_id ON galleries(studio_id);
CREATE INDEX idx_galleries_project_id ON galleries(project_id);
CREATE INDEX idx_galleries_slug ON galleries(slug);
CREATE INDEX idx_galleries_status ON galleries(status);
CREATE INDEX idx_galleries_expires_at ON galleries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_galleries_created_at ON galleries(created_at);
CREATE INDEX idx_galleries_deleted_at ON galleries(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- ALBUMS
-- =============================================================================

CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_id UUID,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  media_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_albums_gallery_id ON albums(gallery_id);
CREATE INDEX idx_albums_sort_order ON albums(gallery_id, sort_order);
CREATE INDEX idx_albums_is_visible ON albums(is_visible);
CREATE INDEX idx_albums_deleted_at ON albums(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- COLLECTIONS
-- =============================================================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_id UUID,
  is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
  collaborators UUID[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_collections_gallery_id ON collections(gallery_id);
CREATE INDEX idx_collections_created_by ON collections(created_by);
CREATE INDEX idx_collections_deleted_at ON collections(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- COLLECTION MEDIA (many-to-many)
-- =============================================================================

CREATE TABLE collection_media (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (collection_id, media_id)
);

CREATE INDEX idx_collection_media_media_id ON collection_media(media_id);

-- =============================================================================
-- MEDIA FILES
-- =============================================================================

CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  type media_type NOT NULL,
  status media_status NOT NULL DEFAULT 'uploading',
  size BIGINT NOT NULL,
  width INT,
  height INT,
  duration NUMERIC, -- seconds for video
  checksum TEXT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'private',
  thumbnail_paths JSONB NOT NULL DEFAULT '{}', -- { "150": "path", "300": "path", ... }
  preview_paths JSONB NOT NULL DEFAULT '{}', -- { "1920": "path", "2560": "path", ... }
  metadata JSONB NOT NULL DEFAULT '{}', -- EXIF, IPTC, XMP data
  alt_text TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  download_count BIGINT NOT NULL DEFAULT 0,
  favorite_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_media_files_studio_id ON media_files(studio_id);
CREATE INDEX idx_media_files_gallery_id ON media_files(gallery_id);
CREATE INDEX idx_media_files_album_id ON media_files(album_id);
CREATE INDEX idx_media_files_type ON media_files(type);
CREATE INDEX idx_media_files_status ON media_files(status);
CREATE INDEX idx_media_files_is_hidden ON media_files(is_hidden);
CREATE INDEX idx_media_files_storage_path ON media_files(storage_path);
CREATE INDEX idx_media_files_checksum ON media_files(checksum);
CREATE INDEX idx_media_files_sort_order ON media_files(gallery_id, album_id, sort_order);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);
CREATE INDEX idx_media_files_deleted_at ON media_files(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- GALLERY SHARES
-- =============================================================================

CREATE TABLE gallery_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  pin_hash TEXT,
  allow_download BOOLEAN NOT NULL DEFAULT TRUE,
  allow_favorites BOOLEAN NOT NULL DEFAULT TRUE,
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  allow_proofing BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  max_views INT,
  view_count BIGINT NOT NULL DEFAULT 0,
  download_count BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gallery_shares_gallery_id ON gallery_shares(gallery_id);
CREATE INDEX idx_gallery_shares_token ON gallery_shares(token);
CREATE INDEX idx_gallery_shares_expires_at ON gallery_shares(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_gallery_shares_is_active ON gallery_shares(is_active);
CREATE INDEX idx_gallery_shares_deleted_at ON gallery_shares(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- GALLERY FAVORITES
-- =============================================================================

CREATE TABLE gallery_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_token TEXT REFERENCES gallery_shares(token) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gallery_id, media_id, profile_id, share_token)
);

CREATE INDEX idx_gallery_favorites_gallery_id ON gallery_favorites(gallery_id);
CREATE INDEX idx_gallery_favorites_media_id ON gallery_favorites(media_id);
CREATE INDEX idx_gallery_favorites_profile_id ON gallery_favorites(profile_id);
CREATE INDEX idx_gallery_favorites_share_token ON gallery_favorites(share_token);

-- =============================================================================
-- GALLERY COMMENTS
-- =============================================================================

CREATE TABLE gallery_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_token TEXT REFERENCES gallery_shares(token) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email CITEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  parent_id UUID REFERENCES gallery_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gallery_comments_gallery_id ON gallery_comments(gallery_id);
CREATE INDEX idx_gallery_comments_media_id ON gallery_comments(media_id);
CREATE INDEX idx_gallery_comments_profile_id ON gallery_comments(profile_id);
CREATE INDEX idx_gallery_comments_parent_id ON gallery_comments(parent_id);
CREATE INDEX idx_gallery_comments_created_at ON gallery_comments(created_at);
CREATE INDEX idx_gallery_comments_deleted_at ON gallery_comments(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- GALLERY PROOFING
-- =============================================================================

CREATE TABLE gallery_proofing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_token TEXT REFERENCES gallery_shares(token) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'maybe')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gallery_id, media_id, profile_id, share_token)
);

CREATE INDEX idx_gallery_proofing_gallery_id ON gallery_proofing(gallery_id);
CREATE INDEX idx_gallery_proofing_media_id ON gallery_proofing(media_id);
CREATE INDEX idx_gallery_proofing_profile_id ON gallery_proofing(profile_id);
CREATE INDEX idx_gallery_proofing_share_token ON gallery_proofing(share_token);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON galleries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gallery_shares_updated_at BEFORE UPDATE ON gallery_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gallery_comments_updated_at BEFORE UPDATE ON gallery_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gallery_proofing_updated_at BEFORE UPDATE ON gallery_proofing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();