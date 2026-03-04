# 🧪 Test Your PadelPro Application

Your app is ready! Test these features:

## ✅ Test 1: User Registration

1. Go to: http://localhost:3001/register
2. Fill in the form:
   - Name: Your Name
   - Email: test@example.com
   - Phone: +20 12 3456 7890 (optional)
   - Password: password123
   - Confirm Password: password123
3. Click "Register"

**Expected Result:**

- You're redirected to `/login`
- A success message appears (if you added one)
- Check Supabase Table Editor → User table → you'll see your user!

---

## ✅ Test 2: User Login

1. Go to: http://localhost:3001/login
2. Enter:
   - Email: test@example.com
   - Password: password123
3. Click "Login"

**Expected Result:**

- You're redirected to home page `/`
- Your name appears in the navbar (top right)
- "Login" button changes to show your name + "Logout"

---

## ✅ Test 3: Logout

1. Click "Logout" in navbar
2. You're logged out
3. "Login" and "Sign Up" buttons appear again

---

## ✅ Test 4: Check Database

1. Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/editor
2. Click on "User" table
3. You should see:
   - Your email
   - Your name
   - Your phone (if provided)
   - Hashed password
   - Role: "user"
   - Timestamps

---

## ✅ Test 5: Browse Pages

While logged out:

- Home page works
- Booking page works (shows mock data)
- Coaching page works (shows mock coaches)
- Tournaments page works
- Point System page works

Try clicking around - everything should load!

---

## 🎉 Success Checklist

After testing, you should have:

- ✅ Created a user account
- ✅ Logged in successfully
- ✅ Your name appears in navbar
- ✅ User record visible in Supabase
- ✅ Can logout
- ✅ All pages load without errors

---

## 🐛 If Something Doesn't Work

### Can't register?

- Check browser console (F12) for errors
- Check Supabase for any issues
- Make sure dev server is running

### Can't login?

- Check password is correct
- Check browser console for errors
- Verify user exists in Supabase User table

### Pages don't load?

- Check terminal for errors
- Restart dev server: Ctrl+C then `npm run dev`

---

## 📊 What's Working Now

✅ **Backend:**

- Database (Supabase)
- 12 tables created
- Prisma client generated

✅ **Authentication:**

- Registration page
- Login page
- Session management
- Protected routes ready

✅ **API Routes:**

- `/api/register` - User registration
- `/api/bookings` - Bookings CRUD
- `/api/locations` - Get locations
- `/api/coaches` - Get coaches
- `/api/tournaments` - Get tournaments

✅ **Frontend:**

- All pages working
- Navbar with auth buttons
- Responsive design
- Animations working

---

## 🚀 Next Steps

After testing works:

1. **Add Initial Data:**

   - Add locations to Location table
   - Add courts to Court table
   - Add coaches to Coach table

2. **Connect API:**

   - Update booking page to fetch from real API
   - Show real availability
   - Submit real bookings

3. **Enhance Features:**

   - Payment integration
   - Email notifications
   - User profile page
   - Booking history

4. **Deploy:**
   - Push to GitHub
   - Deploy to Vercel
   - Update environment variables
   - Go live!

---

## 💡 Quick Commands

```bash
# Restart server (if needed)
npm run dev

# View database
npx prisma studio

# Check database directly
# Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/editor
```

---

## 🎊 You're Almost Ready to Launch!

Once you test successfully:

- Your app is fully functional
- Users can register and login
- You can add data through Supabase
- Ready to connect real features

**Great job getting here!** 🎉
