import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,

  // Profiles ứng dụng — tách riêng khỏi bảng users của authTables
  userProfiles: defineTable({
    email:       v.string(),
    displayName: v.string(),
    photoURL:    v.string(),
    role:        v.union(v.literal('viewer'), v.literal('editor')),
    status:      v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    isAdmin:     v.boolean(),
    mock:        v.boolean(),
  }).index('by_email', ['email']),

  rejectedEmails: defineTable({
    email:      v.string(),
    rejectedAt: v.number(),
    rejectedBy: v.string(),
  }).index('by_email', ['email']),

  // Storyboard của mỗi user — thay IndexedDB 'meta' store
  storyboards: defineTable({
    userId:  v.string(),
    clips:   v.string(), // JSON array of clip objects
    version: v.string(), // SEQ_VERSION để detect reset
  }).index('by_user', ['userId']),

  // Metadata cho ảnh upload — thay IndexedDB 'imgs' store
  images: defineTable({
    userId:    v.string(),
    storageId: v.id('_storage'),
    imgKey:    v.string(), // key cũ ('up_<stamp>_<i>') để map với clip
  }).index('by_user_key', ['userId', 'imgKey']),
});
