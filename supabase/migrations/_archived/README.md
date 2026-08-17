# Archived migrations

`001_core_tables.sql`, `002_booking_crm_financial_store_website.sql`, and
`004_views_triggers.sql` were moved here because they describe a schema that
was never actually deployed — comparing every `CREATE TABLE` in these three
files against the live production database (project `vhzbhpqsabwgsrtpchaw`)
turned up ~20 mismatches:

- Tables these files create that don't exist live at all: `leads`,
  `collections`, `collection_media`, `booking_packages`, `availability`,
  `booking_questionnaires`, `refunds`, `product_variants`, `coupons`,
  `gift_cards`, `shipping_zones`, `shipping_methods`, `website_blogs`,
  `notification_preferences`, `audit_logs`, `webhook_events`,
  `storage_objects`.
- Live tables these files get wrong (different name/shape entirely):
  `team_members` here vs. real `studio_members`, `media_files` vs. real
  `media`, `gallery_shares`/`gallery_favorites`/`gallery_comments`/
  `gallery_proofing` vs. real `gallery_share_settings`, `contract_signatures`
  vs. real `contract_signers`, `albums`/`collections` vs. real
  `gallery_albums`.
- `004_views_triggers.sql` is entirely built on top of the above (its views
  and triggers reference `media_files`, `leads`, `team_members`,
  `gallery_shares`, `audit_logs`, none of which exist live), so it's archived
  alongside them rather than fixed in place.

`016_plan_entitlements.sql`'s own header comment already flagged part of
this ("replacing... columns referenced in older, unapplied local migration
drafts — the live `studios` table never actually had those columns"), but
nobody had gone back to correct 001/002/004 themselves until now.

Migrations `013` onward are unaffected — none of them depend on anything
these three files were supposed to create; `013_gallery_media_upload.sql`
only touches `galleries` (real) and the `storage` schema, and `015` is the
first to touch `media`, which comes from the new baseline below.

**Replaced by:** `001_baseline_reality.sql`, reconstructed directly from the
live database's actual schema (introspected via the Supabase MCP tools —
`pg_attribute`/`pg_constraint`/`pg_indexes`/`pg_policies`/`pg_proc`, not
guessed), scoped to exactly what predates migration `013` so that `013`
through `028` still replay cleanly on top of it. Do not restore these files
to the active `migrations/` directory.
