import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROLE_PERMISSIONS, type UserRole } from '@/lib/auth/permissions'

/**
 * Regression guard for the Phase 4 deploy-then-rollback incident:
 * migration 037 introduced 14 new :read permission checks in RLS
 * policies, but has_studio_permission()'s CASE statement (migration 032)
 * hadn't been extended to cover them -- every uncased permission
 * silently fell through to ELSE (owner-only), incorrectly denying
 * team_member/photographer their legitimate access. Migration 038 fixed
 * it. This test makes that specific failure mode structurally
 * impossible to reintroduce silently: it statically cross-checks every
 * permission any RLS policy in supabase/migrations/*.sql actually passes
 * to has_studio_permission() against both (a) the function's own CASE
 * mapping (as currently defined by the latest migration that redefines
 * it) and (b) ROLE_PERMISSIONS (the TypeScript source of intended
 * authorization, src/lib/auth/permissions.ts).
 *
 * Pure static analysis -- no database connection, no production impact.
 * Runs as part of `npm run test`, so it fails CI the moment a new
 * migration references a permission has_studio_permission() doesn't
 * (yet) case for a role ROLE_PERMISSIONS says should have it.
 *
 * Deliberately excludes studio_owner (short-circuited to TRUE before
 * the CASE is ever evaluated -- verified by reading the function body)
 * and super_admin (never cased in any branch, by the function's
 * existing, pre-Phase-4 design -- real super_admin access goes through
 * a separate profiles.role check elsewhere, not this studio_members
 * -scoped path; a super_admin studio_members row is an untested edge
 * case, not the real admin path, and asserting it here would just be
 * checking a coincidence, not intended behavior).
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const NON_OWNER_ROLES: UserRole[] = ['photographer', 'team_member', 'editor']

/**
 * Phase 5 P1: fixed by migration 039
 * (039_fix_team_member_expenses_read.sql), which corrects
 * 'expenses:read' to ARRAY['photographer', 'team_member']. No known
 * discrepancies remain -- this set is kept (empty) as the established
 * place to document any future one, rather than removed, so a future
 * exception doesn't require re-deriving this pattern from scratch.
 *
 * Phase 10 Target 1: 'editor:galleries:update' is a deliberate, documented
 * exception, not an oversight. Three independent authorization sources
 * exist for gallery mutation permissions -- ROLE_PERMISSIONS (TypeScript),
 * has_studio_permission() (this DB function), and checkGalleryPermission()
 * (a third, separately-maintained inline map local to
 * src/lib/actions/galleries.ts) -- and they disagree: ROLE_PERMISSIONS
 * grants editor 'galleries:update', but checkGalleryPermission() (the
 * function that actually gates every gallery-editing Server Action today)
 * does not grant editor 'galleries.edit'. Migration 044 aligns the DB
 * boundary with checkGalleryPermission()'s narrower, currently-enforced
 * behavior rather than ROLE_PERMISSIONS' broader claim, per the security
 * principle that the DB boundary must not be broader than the
 * application's actual enforced boundary. Reconciling all three sources
 * (checkGalleryPermission() consolidation) is explicitly out of scope for
 * Phase 10 -- see supabase/migrations/044_phase10_authorization_hardening.sql
 * for the full rationale. This is the one, single, intentional exception;
 * it must not be used as precedent to silently exempt anything else.
 */
const KNOWN_DISCREPANCIES = new Set<string>(['editor:galleries:update'])

function loadMigrationFiles(): { name: string; content: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort() // zero-padded numeric prefixes sort chronologically
    .map((name) => ({ name, content: readFileSync(join(MIGRATIONS_DIR, name), 'utf-8') }))
}

/** Every permission string any RLS policy across all migrations passes to has_studio_permission(). */
function extractPermissionsUsedByPolicies(files: { content: string }[]): Set<string> {
  const used = new Set<string>()
  const pattern = /has_studio_permission\([^,]+,\s*'([a-z_]+:[a-z_]+)'/g
  for (const { content } of files) {
    for (const match of content.matchAll(pattern)) {
      used.add(match[1]!)
    }
  }
  return used
}

/**
 * The CASE mapping from the LATEST migration that (re)defines
 * has_studio_permission -- CREATE OR REPLACE means later definitions
 * fully supersede earlier ones, so only the last one reflects the
 * function's actual current body.
 */
function extractCurrentCaseMapping(files: { name: string; content: string }[]): Map<string, Set<string>> {
  const defining = files.filter((f) => f.content.includes('CREATE OR REPLACE FUNCTION public.has_studio_permission'))
  if (defining.length === 0) {
    throw new Error('No migration defines has_studio_permission() -- expected at least migration 032.')
  }
  const latest = defining[defining.length - 1]!

  const mapping = new Map<string, Set<string>>()
  const branchPattern = /WHEN\s+'([a-z_]+:[a-z_]+)'\s+THEN\s+ARRAY\[([^\]]*)\]/g
  for (const match of latest.content.matchAll(branchPattern)) {
    const permission = match[1]!
    const rolesRaw = match[2]!
    const roles = new Set(
      Array.from(rolesRaw.matchAll(/'([a-z_]+)'/g)).map((m) => m[1]!)
    )
    mapping.set(permission, roles)
  }
  return mapping
}

describe('has_studio_permission() CASE coverage (Phase 4 incident regression guard)', () => {
  const files = loadMigrationFiles()
  const usedPermissions = extractPermissionsUsedByPolicies(files)
  const caseMapping = extractCurrentCaseMapping(files)

  it('sanity: found a non-trivial number of permissions referenced by RLS policies', () => {
    // Guards against the extraction regex itself silently matching nothing
    // (e.g. after a future migration file layout change) and this test
    // suite passing vacuously.
    expect(usedPermissions.size).toBeGreaterThan(30)
  })

  it('sanity: found a non-trivial CASE mapping in the latest has_studio_permission definition', () => {
    expect(caseMapping.size).toBeGreaterThan(30)
  })

  for (const permission of Array.from(usedPermissions).sort()) {
    for (const role of NON_OWNER_ROLES) {
      const roleGrantsIt = ROLE_PERMISSIONS[role].includes(permission as never)
      if (!roleGrantsIt) continue
      if (KNOWN_DISCREPANCIES.has(`${role}:${permission}`)) continue

      it(`${role} is granted '${permission}' in ROLE_PERMISSIONS, so has_studio_permission()'s CASE must include it`, () => {
        const casedRoles = caseMapping.get(permission)
        expect(
          casedRoles?.has(role),
          `has_studio_permission() has no '${role}' entry for '${permission}' (cased roles: ${casedRoles ? Array.from(casedRoles).join(', ') || '(empty array)' : 'PERMISSION NOT CASED AT ALL -- falls through to ELSE, owner-only'}), but ROLE_PERMISSIONS grants ${role} this permission. This is exactly the Phase 4 incident's failure mode.`
        ).toBe(true)
      })
    }
  }
})
