-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 002: BOOKING, CRM, FINANCIAL, STORE, WEBSITE
-- =============================================================================
-- This migration creates tables for bookings, contracts, quotes, invoices, payments,
-- store products, orders, websites, and notifications.
-- =============================================================================

-- =============================================================================
-- BOOKING PACKAGES
-- =============================================================================

CREATE TABLE booking_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  duration INT NOT NULL CHECK (duration BETWEEN 15 AND 480), -- minutes
  includes TEXT[] NOT NULL DEFAULT '{}',
  max_attendees INT NOT NULL DEFAULT 1 CHECK (max_attendees > 0),
  requires_deposit BOOLEAN NOT NULL DEFAULT TRUE,
  deposit_percentage INT NOT NULL DEFAULT 25 CHECK (deposit_percentage BETWEEN 0 AND 100),
  deposit_amount BIGINT CHECK (deposit_amount >= 0),
  cancellation_policy TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_booking_packages_studio_id ON booking_packages(studio_id);
CREATE INDEX idx_booking_packages_is_active ON booking_packages(is_active);
CREATE INDEX idx_booking_packages_sort_order ON booking_packages(studio_id, sort_order);
CREATE INDEX idx_booking_packages_deleted_at ON booking_packages(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- AVAILABILITY
-- =============================================================================

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  package_id UUID REFERENCES booking_packages(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  exceptions DATE[] NOT NULL DEFAULT '{}',
  max_bookings_per_slot INT NOT NULL DEFAULT 1 CHECK (max_bookings_per_slot > 0),
  buffer_before INT NOT NULL DEFAULT 0, -- minutes
  buffer_after INT NOT NULL DEFAULT 0, -- minutes
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_availability_studio_id ON availability(studio_id);
CREATE INDEX idx_availability_package_id ON availability(package_id);
CREATE INDEX idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX idx_availability_is_active ON availability(is_active);
CREATE INDEX idx_availability_deleted_at ON availability(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- BOOKINGS
-- =============================================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES booking_packages(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status booking_status NOT NULL DEFAULT 'pending',
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_amount BIGINT CHECK (deposit_amount >= 0),
  deposit_paid_at TIMESTAMPTZ,
  deposit_payment_id UUID,
  questionnaire_responses JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  rescheduled_from UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rescheduled_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_bookings_studio_id ON bookings(studio_id);
CREATE INDEX idx_bookings_package_id ON bookings(package_id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_project_id ON bookings(project_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_date_time ON bookings(start_date_time);
CREATE INDEX idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- BOOKING QUESTIONNAIRES
-- =============================================================================

CREATE TABLE booking_questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  package_id UUID REFERENCES booking_packages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_booking_questionnaires_studio_id ON booking_questionnaires(studio_id);
CREATE INDEX idx_booking_questionnaires_package_id ON booking_questionnaires(package_id);
CREATE INDEX idx_booking_questionnaires_deleted_at ON booking_questionnaires(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- CONTRACTS
-- =============================================================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status contract_status NOT NULL DEFAULT 'draft',
  template_id UUID,
  signature_fields JSONB NOT NULL DEFAULT '[]',
  requires_signature BOOLEAN NOT NULL DEFAULT TRUE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signed_ip TEXT,
  signed_user_agent TEXT,
  expires_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_contracts_studio_id ON contracts(studio_id);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_expires_at ON contracts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_contracts_deleted_at ON contracts(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- CONTRACT SIGNATURES
-- =============================================================================

CREATE TABLE contract_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'initials', 'date', 'text', 'checkbox')),
  value TEXT,
  signed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id);

-- =============================================================================
-- QUOTES
-- =============================================================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
  tax_total BIGINT NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  discount_total BIGINT NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total BIGINT NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  status quote_status NOT NULL DEFAULT 'draft',
  quote_number TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  expires_at TIMESTAMPTZ,
  converted_to_invoice_id UUID,
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, quote_number)
);

CREATE INDEX idx_quotes_studio_id ON quotes(studio_id);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_expires_at ON quotes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_quotes_deleted_at ON quotes(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- INVOICES
-- =============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
  tax_total BIGINT NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  discount_total BIGINT NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total BIGINT NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  status invoice_status NOT NULL DEFAULT 'draft',
  invoice_number TEXT NOT NULL,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refunded_amount BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  notes TEXT,
  terms TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, invoice_number)
);

CREATE INDEX idx_invoices_studio_id ON invoices(studio_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  status payment_status NOT NULL DEFAULT 'pending',
  provider payment_provider NOT NULL,
  provider_payment_id TEXT,
  provider_fee BIGINT DEFAULT 0,
  provider_data JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  failure_reason TEXT,
  failure_code TEXT,
  refunded_amount BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_studio_id ON payments(studio_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- REFUNDS
-- =============================================================================

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  provider_refund_id TEXT,
  provider_data JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type product_type NOT NULL,
  category TEXT,
  sku TEXT,
  base_price BIGINT NOT NULL CHECK (base_price >= 0),
  sale_price BIGINT CHECK (sale_price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  track_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  inventory INT NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  weight INT, -- grams
  dimensions JSONB, -- { length, width, height } in cm
  shipping_class TEXT,
  images JSONB NOT NULL DEFAULT '[]', -- array of { url, alt, sort_order }
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  seo JSONB,
  digital_files JSONB NOT NULL DEFAULT '[]', -- for digital products
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_studio_id ON products(studio_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_sort_order ON products(studio_id, sort_order);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- PRODUCT VARIANTS
-- =============================================================================

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  sale_price BIGINT CHECK (sale_price >= 0),
  weight INT,
  dimensions JSONB,
  inventory INT NOT NULL DEFAULT 0 CHECK (inventory >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  attributes JSONB NOT NULL DEFAULT '{}', -- e.g., { "size": "8x10", "finish": "matte" }
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_product_variants_is_active ON product_variants(is_active);
CREATE INDEX idx_product_variants_sort_order ON product_variants(product_id, sort_order);
CREATE INDEX idx_product_variants_deleted_at ON product_variants(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- COUPONS
-- =============================================================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type coupon_type NOT NULL,
  value BIGINT NOT NULL CHECK (value > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  min_order_amount BIGINT CHECK (min_order_amount >= 0),
  max_discount BIGINT CHECK (max_discount >= 0),
  usage_limit INT CHECK (usage_limit > 0),
  usage_limit_per_customer INT NOT NULL DEFAULT 1 CHECK (usage_limit_per_customer > 0),
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  applicable_product_ids UUID[] NOT NULL DEFAULT '{}',
  applicable_categories TEXT[] NOT NULL DEFAULT '{}',
  excluded_product_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(studio_id, code)
);

CREATE INDEX idx_coupons_studio_id ON coupons(studio_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_coupons_deleted_at ON coupons(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- GIFT CARDS
-- =============================================================================

CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  initial_balance BIGINT NOT NULL CHECK (initial_balance > 0),
  current_balance BIGINT NOT NULL CHECK (current_balance >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  purchaser_email CITEXT,
  purchaser_name TEXT,
  recipient_email CITEXT,
  recipient_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_gift_cards_studio_id ON gift_cards(studio_id);
CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_deleted_at ON gift_cards(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- ORDERS
-- =============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email CITEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
  discount_total BIGINT NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total BIGINT NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  shipping_total BIGINT NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
  total BIGINT NOT NULL CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  payment_status order_payment_status NOT NULL DEFAULT 'pending',
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  customer_notes TEXT,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL,
  gift_card_code TEXT,
  shipping_method TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refunded_amount BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  refund_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_studio_id ON orders(studio_id);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  total_price BIGINT NOT NULL CHECK (total_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount BIGINT NOT NULL DEFAULT 0,
  discount BIGINT NOT NULL DEFAULT 0,
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  fulfilled_quantity INT NOT NULL DEFAULT 0,
  digital_delivery JSONB, -- for digital products
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

-- =============================================================================
-- SHIPPING ZONES
-- =============================================================================

CREATE TABLE shipping_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  countries TEXT[] NOT NULL DEFAULT '{}', -- ISO 3166-1 alpha-2 codes
  regions TEXT[], -- state/province codes
  postal_codes TEXT[],
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shipping_zones_studio_id ON shipping_zones(studio_id);
CREATE INDEX idx_shipping_zones_is_active ON shipping_zones(is_active);
CREATE INDEX idx_shipping_zones_deleted_at ON shipping_zones(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- SHIPPING METHODS
-- =============================================================================

CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  estimated_days_min INT,
  estimated_days_max INT,
  min_order_amount BIGINT CHECK (min_order_amount >= 0),
  max_order_amount BIGINT CHECK (max_order_amount >= 0),
  min_weight INT,
  max_weight INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shipping_methods_studio_id ON shipping_methods(studio_id);
CREATE INDEX idx_shipping_methods_zone_id ON shipping_methods(zone_id);
CREATE INDEX idx_shipping_methods_is_active ON shipping_methods(is_active);
CREATE INDEX idx_shipping_methods_deleted_at ON shipping_methods(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- WEBSITES
-- =============================================================================

CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN NOT NULL DEFAULT FALSE,
  domain_verification_token TEXT,
  theme TEXT NOT NULL DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}',
  seo JSONB,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_websites_studio_id ON websites(studio_id);
CREATE INDEX idx_websites_subdomain ON websites(subdomain);
CREATE INDEX idx_websites_custom_domain ON websites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_websites_is_published ON websites(is_published);
CREATE INDEX idx_websites_deleted_at ON websites(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- WEBSITE PAGES
-- =============================================================================

CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES website_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  template TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,
  is_home BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_nav BOOLEAN NOT NULL DEFAULT TRUE,
  nav_order INT NOT NULL DEFAULT 0,
  password_protected BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(website_id, slug)
);

CREATE INDEX idx_website_pages_website_id ON website_pages(website_id);
CREATE INDEX idx_website_pages_parent_id ON website_pages(parent_id);
CREATE INDEX idx_website_pages_slug ON website_pages(slug);
CREATE INDEX idx_website_pages_is_home ON website_pages(is_home) WHERE is_home = TRUE;
CREATE INDEX idx_website_pages_deleted_at ON website_pages(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- WEBSITE BLOGS
-- =============================================================================

CREATE TABLE website_blogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  cover_image TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(website_id, slug)
);

CREATE INDEX idx_website_blogs_website_id ON website_blogs(website_id);
CREATE INDEX idx_website_blogs_slug ON website_blogs(slug);
CREATE INDEX idx_website_blogs_status ON website_blogs(status);
CREATE INDEX idx_website_blogs_published_at ON website_blogs(published_at);
CREATE INDEX idx_website_blogs_tags ON website_blogs USING GIN(tags);
CREATE INDEX idx_website_blogs_deleted_at ON website_blogs(deleted_at) WHERE deleted_at IS NOT NULL.

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  channels notification_channel[] NOT NULL DEFAULT '{in_app}',
  priority notification_priority NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
  push_sent BOOLEAN NOT NULL DEFAULT FALSE,
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_studio_id ON notifications(studio_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_related ON notifications(related_type, related_id);

-- =============================================================================
-- NOTIFICATION PREFERENCES
-- =============================================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  digest_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
  categories JSONB NOT NULL DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_ip TEXT,
  actor_user_agent TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_studio_id ON audit_logs(studio_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- =============================================================================
-- WEBHOOK EVENTS
-- =============================================================================

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhook_events_studio_id ON webhook_events(studio_id);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

-- =============================================================================
-- STORAGE OBJECTS (mirror of Supabase Storage metadata)
-- =============================================================================

CREATE TABLE storage_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id TEXT NOT NULL,
  name TEXT NOT NULL,
  owner UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  version TEXT,
  path_tokens TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}',
  size BIGINT NOT NULL,
  mime_type TEXT,
  etag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(bucket_id, name)
);

CREATE INDEX idx_storage_objects_bucket_id ON storage_objects(bucket_id);
CREATE INDEX idx_storage_objects_owner ON storage_objects(owner);
CREATE INDEX idx_storage_objects_path_tokens ON storage_objects USING GIN(path_tokens);

-- =============================================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- =============================================================================

CREATE TRIGGER update_booking_packages_updated_at BEFORE UPDATE ON booking_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_questionnaires_updated_at BEFORE UPDATE ON booking_questionnaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON gift_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_methods_updated_at BEFORE UPDATE ON shipping_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_blogs_updated_at BEFORE UPDATE ON website_blogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_objects_updated_at BEFORE UPDATE ON storage_objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();