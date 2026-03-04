# Booking Reminders Setup Guide

## Overview

The booking reminder system sends notifications to players 1 hour before their reservation starts. This is implemented via a cron job endpoint that should be called periodically.

## API Endpoint

**Endpoint:** `/api/cron/booking-reminders`

**Method:** `POST` (or `GET` for testing)

**Authentication:** Optional (recommended for production)

## How It Works

1. The cron job checks for bookings starting in approximately 1 hour (55-65 minute window)
2. For each booking, it checks if a reminder notification already exists
3. If no reminder exists, it creates a notification for the user
4. The notification appears in the user's notification bell in the Navbar

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

Create or update `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

This runs every 10 minutes. Adjust the schedule as needed:

- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes (recommended)
- `*/15 * * * *` - Every 15 minutes

### Option 2: External Cron Service

Use a service like:

- **cron-job.org** (free)
- **EasyCron** (free tier available)
- **UptimeRobot** (free)

**Setup:**

1. Create a new cron job
2. URL: `https://your-domain.com/api/cron/booking-reminders`
3. Method: `POST`
4. Schedule: Every 5-10 minutes
5. (Optional) Add Authorization header: `Bearer YOUR_CRON_SECRET`

### Option 3: Manual Testing

You can test the endpoint manually:

```bash
# Using curl
curl -X POST http://localhost:3001/api/cron/booking-reminders

# Or using GET for quick testing
curl http://localhost:3001/api/cron/booking-reminders
```

## Security (Optional but Recommended)

Add a `CRON_SECRET` to your `.env` file:

```env
CRON_SECRET=your-secret-token-here
```

Then configure your cron service to send:

```
Authorization: Bearer your-secret-token-here
```

## Testing

1. Create a test booking that starts in ~1 hour
2. Call the endpoint: `GET /api/cron/booking-reminders`
3. Check the response to see if the booking was found
4. Check the user's notifications to see if the reminder was created

## Notification Details

- **Type:** `booking_reminder`
- **Title:** "Booking Reminder"
- **Message:** Includes location, court, time, and minutes until booking
- **Metadata:** Contains bookingId, locationId, courtId, times, and date

## Notes

- The system prevents duplicate notifications by checking if a reminder already exists for each booking
- Only `confirmed` and `pending` bookings receive reminders
- Cancelled bookings are automatically excluded
- The 55-65 minute window accounts for cron job timing variations
