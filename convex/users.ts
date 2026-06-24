import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

function isAdminEmail(email: string) {
  const adminEmail = process.env.CONVEX_ADMIN_EMAIL ?? '';
  return !!adminEmail && email.toLowerCase() === adminEmail.toLowerCase();
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Returns the current user's profile, or null if not signed in / no profile yet. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const authUser = await ctx.db.get(userId);
    if (!authUser?.email) return null;
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_email', (q) => q.eq('email', authUser.email!))
      .unique();
    if (!profile) return null;
    return { ...profile, uid: userId };
  },
});

/** Admin only: list all user profiles. */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const authUser = await ctx.db.get(userId);
    if (!authUser?.email || !isAdminEmail(authUser.email)) return null;
    return ctx.db.query('userProfiles').collect();
  },
});

/** Admin only: list rejected emails. */
export const listRejectedEmails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const authUser = await ctx.db.get(userId);
    if (!authUser?.email || !isAdminEmail(authUser.email)) return null;
    return ctx.db.query('rejectedEmails').collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Called right after sign-in.
 * Creates the user profile on first login, or updates identity fields on subsequent logins.
 */
export const upsertCurrentUser = mutation({
  args: {
    displayName: v.string(),
    photoURL:    v.string(),
    mock:        v.boolean(),
  },
  handler: async (ctx, { displayName, photoURL, mock }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const authUser = await ctx.db.get(userId);
    const email = authUser?.email ?? '';
    const admin = isAdminEmail(email);

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();

    if (!existing) {
      const id = await ctx.db.insert('userProfiles', {
        email,
        displayName: displayName || email,
        photoURL,
        role:    admin ? 'editor' : 'viewer',
        status:  admin ? 'approved' : 'pending',
        isAdmin: admin,
        mock,
      });
      return ctx.db.get(id);
    }

    const patch: Record<string, unknown> = {
      email,
      displayName: displayName || existing.displayName,
      photoURL:    photoURL || existing.photoURL,
    };
    if (admin) {
      patch.role    = 'editor';
      patch.status  = 'approved';
      patch.isAdmin = true;
    }
    await ctx.db.patch(existing._id, patch);
    return ctx.db.get(existing._id);
  },
});

/** Admin: approve a user and optionally set their role. */
export const approveUser = mutation({
  args: {
    userId: v.id('userProfiles'),
    role:   v.optional(v.union(v.literal('viewer'), v.literal('editor'))),
  },
  handler: async (ctx, { userId, role }) => {
    await _assertAdmin(ctx);
    await ctx.db.patch(userId, { status: 'approved', ...(role ? { role } : {}) });
  },
});

/** Admin: set user status to pending (thu hồi / mở lại). */
export const setPendingUser = mutation({
  args: { userId: v.id('userProfiles') },
  handler: async (ctx, { userId }) => {
    await _assertAdmin(ctx);
    await ctx.db.patch(userId, { status: 'pending' });
  },
});

/** Admin: reject a user and record their email in the rejectedEmails blocklist. */
export const rejectUser = mutation({
  args: { userId: v.id('userProfiles') },
  handler: async (ctx, { userId }) => {
    const adminEmail = await _assertAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error('User not found');
    await ctx.db.patch(userId, { status: 'rejected' });
    const already = await ctx.db
      .query('rejectedEmails')
      .withIndex('by_email', (q) => q.eq('email', target.email))
      .unique();
    if (!already) {
      await ctx.db.insert('rejectedEmails', {
        email:      target.email,
        rejectedAt: Date.now(),
        rejectedBy: adminEmail,
      });
    }
  },
});

/** Admin: change a user's role. */
export const setUserRole = mutation({
  args: {
    userId: v.id('userProfiles'),
    role:   v.union(v.literal('viewer'), v.literal('editor')),
  },
  handler: async (ctx, { userId, role }) => {
    await _assertAdmin(ctx);
    await ctx.db.patch(userId, { role });
  },
});

/** Admin: delete a user profile. */
export const deleteUser = mutation({
  args: { userId: v.id('userProfiles') },
  handler: async (ctx, { userId }) => {
    await _assertAdmin(ctx);
    await ctx.db.delete(userId);
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _assertAdmin(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  const authUser = await ctx.db.get(userId);
  const email = authUser?.email ?? '';
  if (!isAdminEmail(email)) throw new Error('Forbidden: admin only');
  return email;
}
