# Testing Forgot / Reset Password

## 1. Start the app and (optional) seed a user with phone

```bash
npm run dev
```

To have a user with a phone for **OTP reset** testing, run the seed (resets DB):

```bash
npm run db:seed
```

This creates `user@test.com` / `password123` with phone **01234567890**.

---

## 2. Method 1: Change password with current password (logged in)

1. Go to **http://localhost:3000/login**
2. Log in as **user@test.com** / **password123**
3. Open **http://localhost:3000/forgot-password**
4. Click the **“I know my password”** tab
5. Fill in:
   - **Current password:** `password123`
   - **New password:** e.g. `NewPass123` (min 8 chars, one letter + one number)
   - **Confirm new password:** same as new
6. Click **Change password**
7. You should see success; then log in again with the new password.

---

## 3. Method 2: Reset with mobile OTP (forgot password)

Use a user that has a **phone number** in the DB (e.g. after seed: **01234567890**).

1. Go to **http://localhost:3000/forgot-password**
2. Leave **“Reset with mobile”** selected
3. **Step 1:** Enter mobile **01289208053** (or **01289208053** — both work)
4. Click **Send verification code**
5. **Get the OTP:** In development the 6-digit code is printed in the **terminal** where `npm run dev` is running. Look for a line like:
   ```text
   --- [DEV] PASSWORD RESET OTP ---
   Phone: 01289208053 | Code: 123456
   ```
6. **Step 2:** Enter that 6-digit code, set **New password** and **Confirm new password** (e.g. `NewPass123`)
7. Click **Reset password**
8. You should see success; then log in at **/login** with the new password.

---

## If you don’t have a user with a phone

- Run **`npm run db:seed`** so **user@test.com** has phone **01234567890**, or
- Log in, go to your profile/settings (if your app has one) and add a phone, or
- Register a new user and enter a phone, then use that number on the forgot-password page.

---

## Quick checks

| What to check          | How                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Login page link        | Login → “Forgot Password?” → should go to `/forgot-password`                                                 |
| Method 1 (logged in)   | Log in → Forgot password → “I know my password” → change password                                            |
| Method 2 (OTP)         | Forgot password → “Reset with mobile” → enter phone → get code from **terminal** → enter code + new password |
| Wrong current password | Method 1: wrong current password → error “Current password is incorrect”                                     |
| Wrong OTP              | Method 2: wrong code → “Invalid or expired code. Please request a new one.”                                  |
| Rate limit             | Send OTP 4+ times in a short time for same number → “Too many requests” (after 3 in 15 min)                  |
