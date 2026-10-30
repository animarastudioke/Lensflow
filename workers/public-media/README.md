# LensFlow public media Worker

This Worker serves only gallery `preview.webp` / `thumb.webp` objects and studio logo files from the existing `lensflow-media` R2 bucket. It does not serve original, raw, or product-download keys. Keep the bucket's `r2.dev` public endpoint enabled until the cutover steps below are complete.

## Deploy and cut over

1. Authenticate Wrangler to the Cloudflare account that owns the `lensflow.co.ke` zone and the `lensflow-media` bucket.
2. From the repository root, run `npx wrangler deploy --config workers/public-media/wrangler.toml`.
3. Verify `https://media.lensflow.co.ke/studios/<studio UUID>/galleries/<gallery UUID>/assets/<media UUID>/preview.webp` returns the preview and that the matching `original.*` path returns 404. Also verify a studio logo URL.
4. Set Vercel's `R2_PUBLIC_URL` to `https://media.lensflow.co.ke` for Production, Preview, and Development as appropriate, then deploy. Existing database URLs continue to use the old host until the migration is applied.
5. Apply the Supabase migration `20261031000000_r2_public_media_worker.sql`. It changes only stored LensFlow R2 URLs from the previous `r2.dev` host to the Worker host.
6. Open at least one real client gallery and confirm preview and thumbnail images load. Confirm originals still download only through LensFlow's authorized download flow.
7. Only after those checks pass, disable Public Development URL access (`r2.dev`) on the `lensflow-media` bucket. Do not connect `media.lensflow.co.ke` directly to the R2 bucket; it must remain attached to this Worker.

Rollback: re-enable the R2 public development URL and restore the previous `R2_PUBLIC_URL`. The migration is reversible by replacing the Worker host with the previous `r2.dev` host in the same columns.
