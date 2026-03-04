# 🔐 How to Create a Super Admin

There are **3 ways** to create a super admin in your system:

---

## Method 1: Use the Script (Easiest) ⭐ Recommended

### Option A: Interactive Script

Run the interactive script that prompts for details:

```bash
node create-admin.js
```

**What it does:**
- Prompts for email, password, and name
- Creates super admin directly (no approval needed)
- If user exists, updates them to super_admin
- Sets `isApproved: true` automatically

**Example:**
```bash
$ node create-admin.js

🔐 Create Admin Account

Enter email: newadmin@padel.com
Enter password: securepassword123
Enter name (optional): New Super Admin

✅ Super admin created successfully!

📧 Login credentials:
   Email: newadmin@padel.com
   Password: securepassword123

🚀 You can now login at http://localhost:3000/login
```

---

### Option B: Quick Script (Hardcoded)

For quick testing, use the pre-configured script:

```bash
node create-quick-admin.js
```

**What it creates:**
- Email: `admin@padel.com`
- Password: `admin123`
- Name: `Super Admin`

**Note:** This creates a fixed account. Use Option A for custom accounts.

---

## Method 2: Register via UI + Manual Database Update

### Step 1: Register as Admin

1. Go to `/register`
2. Fill out the form
3. Select **"Admin (Requires Approval)"**
4. In "Admin Type" dropdown, select any admin type (e.g., "Owner Partner")
5. Click "Register"

**Note:** Super Admin is **NOT** available in the registration dropdown for security reasons.

### Step 2: Update Database Manually

After registration, update the user in the database:

**Using Prisma Studio:**
```bash
npx prisma studio
```

1. Go to `User` table
2. Find the user you just created
3. Edit the record:
   - Set `role` = `"admin"`
   - Set `adminType` = `"super_admin"`
   - Set `isApproved` = `true`
4. Save

**OR Using SQL (Supabase Dashboard):**
```sql
UPDATE "User" 
SET 
  "role" = 'admin',
  "adminType" = 'super_admin',
  "isApproved" = true
WHERE "email" = 'newadmin@padel.com';
```

---

## Method 3: Register + Get Approved by Existing Super Admin

### Step 1: Register as Admin

1. Go to `/register`
2. Select **"Admin (Requires Approval)"**
3. Choose an admin type (e.g., "Owner Partner")
4. Register

### Step 2: Existing Super Admin Approves

1. Existing super admin logs in
2. Goes to `/admin/super-admin`
3. Sees pending approval request
4. Clicks "Approve"

### Step 3: Update to Super Admin

After approval, update the user to super_admin (same as Method 2, Step 2).

---

## 🔒 Why Super Admin Isn't in Registration Dropdown

**Security Reason:**
- Super Admin has full system access
- Should only be created by existing super admins or via scripts
- Prevents unauthorized super admin creation

**Available Admin Types in Registration:**
- Owner Partner
- Moderator
- Timing Organizer
- Tournament Organizer
- Coach Admin

**Not Available:**
- ❌ Super Admin (security)
- ❌ Club Owner (has separate option)

---

## ✅ Recommended Approach

**For Production:**
- Use **Method 1 (Script)** - Most secure and direct
- Only existing super admins should run the script
- Keep track of who has super admin access

**For Development:**
- Use **Method 1 (Quick Script)** - Fast setup
- Or use seed script: `npm run db:seed` (creates `superadmin@test.com`)

---

## 🛡️ Security Best Practices

1. **Limit Super Admins:**
   - Only create super admins when absolutely necessary
   - Keep list of super admin emails secure

2. **Strong Passwords:**
   - Use complex passwords for super admin accounts
   - Consider 2FA in future

3. **Audit Trail:**
   - Track who creates super admins
   - Log super admin actions

4. **Regular Review:**
   - Periodically review super admin list
   - Remove access when no longer needed

---

## 📝 Quick Reference

**Create Super Admin:**
```bash
node create-admin.js
```

**Login:**
```
URL: http://localhost:3000/login
Email: [the email you used]
Password: [the password you set]
```

**Admin Dashboard:**
```
URL: http://localhost:3000/admin/super-admin
```

---

## 🚨 Troubleshooting

### "User already exists"
- Script will update existing user to super_admin
- Or use different email

### "Cannot access admin dashboard"
- Check `isApproved` is `true`
- Check `role` is `"admin"`
- Check `adminType` is `"super_admin"`

### "Permission denied"
- Verify user has super_admin type
- Check session is valid (try logging out/in)

---

## Summary

**Easiest:** `node create-admin.js` ⭐  
**Fastest:** `node create-quick-admin.js`  
**Via UI:** Register → Update database manually
