# Supabase Setup Guide - Step by Step

## ✅ Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Click **Settings** (⚙️ icon in left sidebar)
3. Click **Database** from the settings menu
4. Scroll down to **Connection string** section
5. Click the dropdown that says **URI**
6. You'll see a connection string like:

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

7. **IMPORTANT:** Copy the **full connection string** including the password

---

## ✅ Step 2: Create .env File

Now I'll help you create the .env file with your Supabase credentials.

### Generate the secret first:

<｜ tool▁calls▁begin ｜><｜ tool▁call▁begin ｜>
run_terminal_cmd
