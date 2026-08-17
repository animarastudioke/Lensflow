-- =============================================================================
-- LENSFLOW DATABASE SCHEMA - MIGRATION 004: VIEWS & TRIGGERS
-- =============================================================================
-- This migration creates useful views and additional triggers.
-- =============================================================================

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Studio dashboard stats view
CREATE VIEW studio_dashboard_stats AS
SELECT
  s.id AS studio_id,
  (SELECT COUNT(*) FROM projects WHERE studio_id = s.id AND deleted_at IS NULL) AS total_projects,
  (SELECT COUNT(*) FROM projects WHERE studio_id = s.id AND status = 'in_progress' AND deleted_at IS NULL) AS active_projects,
  (SELECT COUNT(*) FROM clients WHERE studio_id = s.id AND deleted_at IS NULL) AS total_clients,
  (SELECT COUNT(*) FROM leads WHERE studio_id = s.id AND deleted_at IS NULL) AS total_leads,
  (SELECT COUNT(*) FROM leads WHERE studio_id = s.id AND status = 'new' AND deleted_at IS NULL) AS new_leads,
  (SELECT COUNT(*) FROM galleries WHERE studio_id = s.id AND deleted_at IS NULL) AS total_galleries,
  (SELECT COUNT(*) FROM galleries WHERE studio_id = s.id AND status IN ('shared', 'public') AND deleted_at IS NULL) AS active_galleries,
  (SELECT COUNT(*) FROM media_files WHERE studio_id = s.id AND deleted_at IS NULL) AS total_media,
  (SELECT COALESCE(SUM(size), 0) FROM media_files WHERE studio_id = s.id AND deleted_at IS NULL) AS total_storage_bytes,
  (SELECT COUNT(*) FROM bookings WHERE studio_id = s.id AND deleted_at IS NULL) AS total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE studio_id = s.id AND status = 'confirmed' AND start_date_time > NOW() AND deleted_at IS NULL) AS upcoming_bookings,
  (SELECT COUNT(*) FROM invoices WHERE studio_id = s.id AND deleted_at IS NULL) AS total_invoices,
  (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE studio_id = s.id AND deleted_at IS NULL) AS total_revenue,
  (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE studio_id = s.id AND deleted_at IS NULL) AS collected_revenue,
  (SELECT COUNT(*) FROM orders WHERE studio_id = s.id AND deleted_at IS NULL) AS total_orders,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE studio_id = s.id AND deleted_at IS NULL) AS store_revenue,
  NOW() AS generated_at
FROM studios s
WHERE s.deleted_at IS NULL;

-- Client dashboard view
CREATE VIEW client_dashboard AS
SELECT
  c.id AS client_id,
  c.studio_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.status,
  c.total_spent,
  c.total_orders,
  c.last_order_at,
  p.id AS profile_id,
  p.avatar_url,
  p.timezone,
  p.locale,
  -- Projects
  (SELECT json_agg(json_build_object(
    'id', pr.id,
    'title', pr.title,
    'type', pr.type,
    'status', pr.status,
    'start_date', pr.start_date,
    'end_date', pr.end_date
  ) ORDER BY pr.created_at DESC)
  FROM projects pr WHERE pr.client_id = c.id AND pr.deleted_at IS NULL) AS projects,
  -- Galleries
  (SELECT json_agg(json_build_object(
    'id', g.id,
    'title', g.title,
    'slug', g.slug,
    'status', g.status,
    'cover_image_id', g.cover_image_id,
    'media_count', (
      SELECT COUNT(*) FROM media_files mf WHERE mf.gallery_id = g.id AND mf.deleted_at IS NULL
    )
  ) ORDER BY g.created_at DESC)
  FROM galleries g
  JOIN projects p2 ON g.project_id = p2.id
  WHERE p2.client_id = c.id AND g.deleted_at IS NULL AND g.status IN ('shared', 'public')) AS galleries,
  -- Invoices
  (SELECT json_agg(json_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'total', i.total,
    'currency', i.currency,
    'status', i.status,
    'due_date', i.due_date,
    'paid_amount', i.paid_amount
  ) ORDER BY i.created_at DESC)
  FROM invoices i WHERE i.client_id = c.id AND i.deleted_at IS NULL) AS invoices,
  -- Orders
  (SELECT json_agg(json_build_object(
    'id', o.id,
    'total', o.total,
    'currency', o.currency,
    'status', o.status,
    'payment_status', o.payment_status,
    'fulfillment_status', o.fulfillment_status,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC)
  FROM orders o WHERE o.client_id = c.id AND o.deleted_at IS NULL) AS orders
FROM clients c
LEFT JOIN profiles p ON c.profile_id = p.id
WHERE c.deleted_at IS NULL;

-- Gallery analytics view
CREATE VIEW gallery_analytics AS
SELECT
  g.id AS gallery_id,
  g.studio_id,
  g.title,
  g.slug,
  g.status,
  g.views_count,
  g.downloads_count,
  g.favorites_count,
  g.comments_count,
  g.created_at,
  g.expires_at,
  -- Media stats
  (SELECT COUNT(*) FROM media_files mf WHERE mf.gallery_id = g.id AND mf.deleted_at IS NULL) AS total_media,
  (SELECT COUNT(*) FROM media_files mf WHERE mf.gallery_id = g.id AND mf.type = 'image' AND mf.deleted_at IS NULL) AS image_count,
  (SELECT COUNT(*) FROM media_files mf WHERE mf.gallery_id = g.id AND mf.type = 'video' AND mf.deleted_at IS NULL) AS video_count,
  (SELECT COALESCE(SUM(mf.size), 0) FROM media_files mf WHERE mf.gallery_id = g.id AND mf.deleted_at IS NULL) AS total_size_bytes,
  -- Share stats
  (SELECT COUNT(*) FROM gallery_shares gs WHERE gs.gallery_id = g.id AND gs.deleted_at IS NULL) AS total_shares,
  (SELECT COALESCE(SUM(gs.view_count), 0) FROM gallery_shares gs WHERE gs.gallery_id = g.id AND gs.deleted_at IS NULL) AS share_views,
  (SELECT COALESCE(SUM(gs.download_count), 0) FROM gallery_shares gs WHERE gs.gallery_id = g.id AND gs.deleted_at IS NULL) AS share_downloads,
  -- Favorites
  (SELECT COUNT(DISTINCT gf.profile_id) FROM gallery_favorites gf WHERE gf.gallery_id = g.id AND gf.profile_id IS NOT NULL) AS unique_favorited_users,
  -- Comments
  (SELECT COUNT(*) FROM gallery_comments gc WHERE gc.gallery_id = g.id AND gc.deleted_at IS NULL) AS total_comments,
  -- Proofing
  (SELECT COUNT(*) FROM gallery_proofing gp WHERE gp.gallery_id = g.id) AS proofing_submissions,
  (SELECT COUNT(*) FROM gallery_proofing gp WHERE gp.gallery_id = g.id AND gp.status = 'approved') AS approved_count,
  (SELECT COUNT(*) FROM gallery_proofing gp WHERE gp.gallery_id = g.id AND gp.status = 'rejected') AS rejected_count
FROM galleries g
WHERE g.deleted_at IS NULL;

-- Revenue report view
CREATE VIEW revenue_report AS
SELECT
  s.id AS studio_id,
  DATE_TRUNC('month', i.created_at)::DATE AS month,
  COUNT(i.id) AS invoice_count,
  COALESCE(SUM(i.total), 0) AS total_invoiced,
  COALESCE(SUM(i.paid_amount), 0) AS total_collected,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total), 0) AS store_revenue,
  COALESCE(SUM(o.total), 0) + COALESCE(SUM(i.paid_amount), 0) AS total_revenue
FROM studios s
LEFT JOIN invoices i ON i.studio_id = s.id AND i.deleted_at IS NULL
LEFT JOIN orders o ON o.studio_id = s.id AND o.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, DATE_TRUNC('month', COALESCE(i.created_at, o.created_at))
ORDER BY month DESC;

-- Expense report view (placeholder for future expense tracking)
CREATE VIEW expense_report AS
SELECT
  s.id AS studio_id,
  DATE_TRUNC('month', NOW())::DATE AS month,
  0 AS total_expenses,
  0 AS net_profit
FROM studios s
WHERE s.deleted_at IS NULL;

-- Booking calendar view
CREATE VIEW booking_calendar AS
SELECT
  b.id,
  b.studio_id,
  b.package_id,
  bp.name AS package_name,
  bp.color AS package_color,
  b.client_id,
  c.first_name || ' ' || c.last_name AS client_name,
  c.email AS client_email,
  b.start_date_time,
  b.end_date_time,
  b.timezone,
  b.status,
  b.deposit_paid,
  b.deposit_amount,
  p.title AS project_title
FROM bookings b
JOIN booking_packages bp ON b.package_id = bp.id
JOIN clients c ON b.client_id = c.id
LEFT JOIN projects p ON b.project_id = p.id
WHERE b.deleted_at IS NULL
AND bp.deleted_at IS NULL
AND c.deleted_at IS NULL;

-- Media storage usage view
CREATE VIEW studio_storage_usage AS
SELECT
  mf.studio_id,
  DATE_TRUNC('day', mf.created_at)::DATE AS date,
  COUNT(*) AS files_uploaded,
  COALESCE(SUM(mf.size), 0) AS bytes_uploaded,
  COUNT(*) FILTER (WHERE mf.type = 'image') AS images_uploaded,
  COUNT(*) FILTER (WHERE mf.type = 'video') AS videos_uploaded
FROM media_files mf
WHERE mf.deleted_at IS NULL
GROUP BY mf.studio_id, DATE_TRUNC('day', mf.created_at)
ORDER BY date DESC;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC COUNTS
-- =============================================================================

-- Update gallery media_count on media insert/delete
CREATE OR REPLACE FUNCTION update_gallery_media_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE galleries SET
      views_count = views_count + 0 -- placeholder to trigger updated_at
    WHERE id = NEW.gallery_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE galleries SET
      views_count = views_count + 0
    WHERE id = OLD.gallery_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gallery_media_count
AFTER INSERT OR DELETE ON media_files
FOR EACH ROW EXECUTE FUNCTION update_gallery_media_count();

-- Update album media_count
CREATE OR REPLACE FUNCTION update_album_media_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.album_id IS NOT NULL THEN
    UPDATE albums SET media_count = media_count + 1 WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' AND OLD.album_id IS NOT NULL THEN
    UPDATE albums SET media_count = media_count - 1 WHERE id = OLD.album_id;
  ELSIF TG_OP = 'UPDATE' AND (OLD.album_id IS NOT NULL OR NEW.album_id IS NOT NULL) THEN
    IF OLD.album_id IS NOT NULL AND (NEW.album_id IS NULL OR OLD.album_id != NEW.album_id) THEN
      UPDATE albums SET media_count = media_count - 1 WHERE id = OLD.album_id;
    END IF;
    IF NEW.album_id IS NOT NULL AND (OLD.album_id IS NULL OR OLD.album_id != NEW.album_id) THEN
      UPDATE albums SET media_count = media_count + 1 WHERE id = NEW.album_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_album_media_count
AFTER INSERT OR DELETE OR UPDATE OF album_id ON media_files
FOR EACH ROW EXECUTE FUNCTION update_album_media_count();

-- Update client totals on order/invoice
CREATE OR REPLACE FUNCTION update_client_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clients SET
      total_spent = total_spent + NEW.total,
      total_orders = total_orders + 1,
      last_order_at = NOW()
    WHERE id = NEW.client_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.total != NEW.total THEN
    UPDATE clients SET
      total_spent = total_spent + (NEW.total - OLD.total)
    WHERE id = NEW.client_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clients SET
      total_spent = total_spent - OLD.total,
      total_orders = total_orders - 1
    WHERE id = OLD.client_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_totals_orders
AFTER INSERT OR UPDATE OF total OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION update_client_totals();

CREATE TRIGGER trigger_client_totals_invoices
AFTER INSERT OR UPDATE OF paid_amount OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_client_totals();

-- Update gallery counts
CREATE OR REPLACE FUNCTION update_gallery_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE galleries SET favorites_count = favorites_count + 1 WHERE id = NEW.gallery_id;
    UPDATE media_files SET favorite_count = favorite_count + 1 WHERE id = NEW.media_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE galleries SET favorites_count = favorites_count - 1 WHERE id = OLD.gallery_id;
    UPDATE media_files SET favorite_count = favorite_count - 1 WHERE id = OLD.media_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gallery_favorites_count
AFTER INSERT OR DELETE ON gallery_favorites
FOR EACH ROW EXECUTE FUNCTION update_gallery_favorites_count();

CREATE OR REPLACE FUNCTION update_gallery_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE galleries SET comments_count = comments_count + 1 WHERE id = NEW.gallery_id;
    UPDATE media_files SET comment_count = comment_count + 1 WHERE id = NEW.media_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE galleries SET comments_count = comments_count - 1 WHERE id = OLD.gallery_id;
    UPDATE media_files SET comment_count = comment_count - 1 WHERE id = OLD.media_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gallery_comments_count
AFTER INSERT OR DELETE ON gallery_comments
FOR EACH ROW EXECUTE FUNCTION update_gallery_comments_count();

-- Update gallery view/download counts from shares
CREATE OR REPLACE FUNCTION update_gallery_share_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.view_count != NEW.view_count THEN
      UPDATE galleries SET views_count = views_count + (NEW.view_count - OLD.view_count) WHERE id = NEW.gallery_id;
    END IF;
    IF OLD.download_count != NEW.download_count THEN
      UPDATE galleries SET downloads_count = downloads_count + (NEW.download_count - OLD.download_count) WHERE id = NEW.gallery_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gallery_share_counts
AFTER UPDATE OF view_count, download_count ON gallery_shares
FOR EACH ROW EXECUTE FUNCTION update_gallery_share_counts();

-- Auto-generate quote/invoice numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.quote_number IS NULL THEN
    SELECT COALESCE(MAX(
      (quote_number)::INT
    ), 0) + 1 INTO next_num
    FROM quotes
    WHERE studio_id = NEW.studio_id
    AND quote_number ~ '^\d+$';
    NEW.quote_number := LPAD(next_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    SELECT COALESCE(MAX(
      (invoice_number)::INT
    ), 0) + 1 INTO next_num
    FROM invoices
    WHERE studio_id = NEW.studio_id
    AND invoice_number ~ '^\d+$';
    NEW.invoice_number := LPAD(next_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Invoice payment status sync
CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid BIGINT;
  inv_total BIGINT;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE invoice_id = NEW.id
    AND status = 'succeeded';

    SELECT total INTO inv_total FROM invoices WHERE id = NEW.invoice_id;

    IF total_paid >= inv_total THEN
      UPDATE invoices SET status = 'paid', paid_at = NOW(), paid_amount = total_paid WHERE id = NEW.invoice_id;
    ELSIF total_paid > 0 THEN
      UPDATE invoices SET status = 'partial', paid_amount = total_paid WHERE id = NEW.invoice_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE invoice_id = OLD.invoice_id
    AND status = 'succeeded';

    SELECT total INTO inv_total FROM invoices WHERE id = OLD.invoice_id;

    IF total_paid >= inv_total THEN
      UPDATE invoices SET status = 'paid', paid_amount = total_paid WHERE id = OLD.invoice_id;
    ELSIF total_paid > 0 THEN
      UPDATE invoices SET status = 'partial', paid_amount = total_paid WHERE id = OLD.invoice_id;
    ELSE
      UPDATE invoices SET status = 'sent', paid_amount = 0 WHERE id = OLD.invoice_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_invoice_payment
AFTER INSERT OR UPDATE OF status OR DELETE ON payments
FOR EACH ROW
WHEN (OLD.invoice_id IS NOT NULL OR NEW.invoice_id IS NOT NULL)
EXECUTE FUNCTION sync_invoice_payment_status();

-- Booking deposit sync
CREATE OR REPLACE FUNCTION sync_booking_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.booking_id IS NOT NULL AND NEW.status = 'succeeded' THEN
    UPDATE bookings SET
      deposit_paid = TRUE,
      deposit_paid_at = COALESCE(deposit_paid_at, NOW()),
      deposit_amount = NEW.amount,
      deposit_payment_id = NEW.id
    WHERE id = NEW.booking_id AND deposit_paid = FALSE;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_booking_deposit
AFTER INSERT OR UPDATE OF status ON payments
FOR EACH ROW
WHEN (OLD.booking_id IS NOT NULL OR NEW.booking_id IS NOT NULL)
EXECUTE FUNCTION sync_booking_deposit();

-- =============================================================================
-- AUDIT LOG TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  action TEXT;
  old_row JSONB;
  new_row JSONB;
BEGIN
  action := TG_OP;
  old_row := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_row := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

  -- Remove sensitive fields
  IF old_row IS NOT NULL THEN
    old_row := old_row - 'password' - 'password_hash' - 'pin_hash' - 'two_factor_secret' - 'stripe_customer_id' - 'stripe_subscription_id';
  END IF;
  IF new_row IS NOT NULL THEN
    new_row := new_row - 'password' - 'password_hash' - 'pin_hash' - 'two_factor_secret' - 'stripe_customer_id' - 'stripe_subscription_id';
  END IF;

  INSERT INTO audit_logs (studio_id, actor_id, action, resource_type, resource_id, old_values, new_values, metadata)
  VALUES (
    COALESCE(NEW.studio_id, OLD.studio_id),
    auth.uid(),
    action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_row,
    new_row,
    jsonb_build_object('table', TG_TABLE_NAME)
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_studios AFTER INSERT OR UPDATE OR DELETE ON studios FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_galleries AFTER INSERT OR UPDATE OR DELETE ON galleries FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_media_files AFTER INSERT OR UPDATE OR DELETE ON media_files FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_quotes AFTER INSERT OR UPDATE OR DELETE ON quotes FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_team_members AFTER INSERT OR UPDATE OR DELETE ON team_members FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Anon can only access public views
GRANT SELECT ON studio_dashboard_stats TO anon;
GRANT SELECT ON gallery_analytics TO anon;

-- Authenticated users get RLS-enforced access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;