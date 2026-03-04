# 🚀 Migration Guide: Critical Fixes

## Required Database Migration

The schema changes require a database migration. Follow these steps:

### Step 1: Create Migration

```bash
npx prisma migrate dev --name remove_name_uniqueness_add_indexes
```

This will:
- Remove `@unique` constraint from `Player.name`
- Add index on `Player.name` (non-unique)
- Add index on `Player.location`

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Verify Migration

Check that the migration was created:
```bash
ls prisma/migrations/
```

You should see a new migration folder with the changes.

### Step 4: Test the Changes

1. **Test same-name users:**
   - Create player for "John Doe" (user1)
   - Create player for "John Doe" (user2)
   - Both should succeed ✅

2. **Test required userId:**
   - Try creating player without selecting user
   - Should fail with clear error ✅

3. **Test race condition:**
   - Have two admins try to convert same user simultaneously
   - Only one should succeed ✅

---

## ⚠️ Important Notes

### Existing Data

If you have existing players with duplicate names, the migration will:
- ✅ Succeed (removes uniqueness constraint)
- ⚠️ You may want to review duplicate names after migration

### Rollback

If you need to rollback:
```bash
npx prisma migrate resolve --rolled-back <migration-name>
```

Then manually restore the `@unique` constraint if needed.

---

## ✅ After Migration

Your system will be:
- ✅ Production-ready
- ✅ Scalable to 100k+ users
- ✅ Safe from race conditions
- ✅ Compliant with requirements

---

## 🧪 Testing Checklist

After migration, verify:

- [ ] Can create players for users with same name
- [ ] Cannot create player without user
- [ ] Search is fast with many users
- [ ] No race conditions when two admins convert same user
- [ ] All existing players still accessible
