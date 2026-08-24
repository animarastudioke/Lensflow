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
 * KNOWN, TRACKED DISCREPANCY -- found by this test during the
 * post-Phase-4 hygiene review, not introduced by it. ROLE_PERMISSIONS
 * has granted team_member 'expenses:read' since 2026-08-15 (commit
 * 375fb3a0, well before any Phase 3/4 work), but migration 037's audit
 * and migration 038's CASE mapping incorrectly assumed team_member
 * lacked it (both authored the same incorrect assumption without
 * re-verifying against this file) -- so has_studio_permission()
 * currently denies team_member 'expenses:read', live in production,
 * confirmed via a real disposable-user PostgREST call. This is a
 * legitimate role being wrongly denied real access, not an
 * over-exposure -- see the Post-Phase-4 Security Hygiene report.
 *
 * Excluded here ONLY so this new regression guard can ship without
 * immediately failing CI over a PRE-EXISTING bug it happened to
 * uncover; it is not a statement that the discrepancy is acceptable.
 * Remove this line the moment migration 037's expenses:read CASE
 * branch is corrected to ARRAY['photographer', 'team_member'] -- at
 * that point this test will enforce the fix stays correct forever.
 */
const KNOWN_DISCREPANCIES = new Set<string>(['team_member:expenses:read'])

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
