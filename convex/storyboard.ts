import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

// ── Queries ──────────────────────────────────────────────────────────────────

/** Trả về storyboard của user hiện tại, hoặc null nếu chưa có. */
export const myStoryboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db
      .query('storyboards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Lưu toàn bộ clips array (JSON string) cho user hiện tại. */
export const saveStoryboard = mutation({
  args: {
    clips:   v.string(),
    version: v.string(),
  },
  handler: async (ctx, { clips, version }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const existing = await ctx.db
      .query('storyboards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { clips, version });
    } else {
      await ctx.db.insert('storyboards', { userId, clips, version });
    }
  },
});

/** Xóa storyboard (reset về default). */
export const clearStoryboard = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const existing = await ctx.db
      .query('storyboards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
