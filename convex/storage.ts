import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

// ── Upload flow ───────────────────────────────────────────────────────────────
// Client gọi theo thứ tự:
// 1. generateUploadUrl()  → uploadUrl
// 2. fetch(uploadUrl, { method: 'POST', body: blob })  → { storageId }
// 3. saveImage({ imgKey, storageId })

/** Tạo URL upload tạm thời cho Convex Storage. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    return ctx.storage.generateUploadUrl();
  },
});

/** Lưu mapping imgKey → storageId cho user hiện tại. */
export const saveImage = mutation({
  args: {
    imgKey:    v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { imgKey, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    // Xóa record cũ nếu cùng imgKey (re-upload)
    const existing = await ctx.db
      .query('images')
      .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('imgKey', imgKey))
      .unique();
    if (existing) {
      // Xóa file cũ khỏi storage
      try { await ctx.storage.delete(existing.storageId); } catch (_) {}
      await ctx.db.patch(existing._id, { storageId });
    } else {
      await ctx.db.insert('images', { userId, imgKey, storageId });
    }
  },
});

/** Xóa một ảnh (khi user xóa clip). */
export const deleteImage = mutation({
  args: { imgKey: v.string() },
  handler: async (ctx, { imgKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const record = await ctx.db
      .query('images')
      .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('imgKey', imgKey))
      .unique();
    if (record) {
      try { await ctx.storage.delete(record.storageId); } catch (_) {}
      await ctx.db.delete(record._id);
    }
  },
});

/** Xóa tất cả ảnh của user (khi reset/clear all). */
export const deleteAllImages = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const records = await ctx.db
      .query('images')
      .withIndex('by_user_key', (q) => q.eq('userId', userId))
      .collect();
    for (const r of records) {
      try { await ctx.storage.delete(r.storageId); } catch (_) {}
      await ctx.db.delete(r._id);
    }
  },
});

// ── Query URLs ────────────────────────────────────────────────────────────────

/** Lấy tất cả URL ảnh của user hiện tại dưới dạng { imgKey → url }. */
export const myImageUrls = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};
    const records = await ctx.db
      .query('images')
      .withIndex('by_user_key', (q) => q.eq('userId', userId))
      .collect();
    const result: Record<string, string | null> = {};
    for (const r of records) {
      result[r.imgKey] = await ctx.storage.getUrl(r.storageId);
    }
    return result;
  },
});
