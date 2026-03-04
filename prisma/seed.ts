import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data (in reverse order of dependencies)
  console.log("🧹 Clearing existing data...");
  await (prisma as any).financialTransaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.court.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash("password123", 10);

  // ============================================
  // USERS
  // ============================================
  console.log("👥 Creating test users...");

  // 1. Super Admin (approved)
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@test.com",
      name: "Super Admin",
      password: hashedPassword,
      role: "admin",
      adminType: "super_admin",
      isApproved: true,
    },
  });

  // 2. Club Owner A (approved, owns Location A)
  const clubOwnerA = await prisma.user.create({
    data: {
      email: "clubownera@test.com",
      name: "Club Owner A",
      password: hashedPassword,
      role: "club_owner",
      isApproved: true,
    },
  });

  // 3. Club Owner B (unapproved)
  const clubOwnerB = await prisma.user.create({
    data: {
      email: "clubownerb@test.com",
      name: "Club Owner B",
      password: hashedPassword,
      role: "club_owner",
      isApproved: false, // NOT APPROVED
    },
  });

  // 4. Owner Partner (approved, read-only)
  const ownerPartner = await prisma.user.create({
    data: {
      email: "ownerpartner@test.com",
      name: "Owner Partner",
      password: hashedPassword,
      role: "admin",
      adminType: "owner_partner",
      isApproved: true,
    },
  });

  // 5. Moderator (approved, limited)
  const moderator = await prisma.user.create({
    data: {
      email: "moderator@test.com",
      name: "Moderator",
      password: hashedPassword,
      role: "admin",
      adminType: "moderator",
      isApproved: true,
    },
  });

  // 6. Club Admin (approved, booking-only power)
  const clubAdmin = await prisma.user.create({
    data: {
      email: "clubadmin@test.com",
      name: "Club Admin",
      password: hashedPassword,
      role: "user",
      userType: "club_admin" as any,
      isApproved: true,
    },
  });

  // 7. Tournament Organizer (approved, has organizer profile)
  const tournamentOrganizer = await prisma.user.create({
    data: {
      email: "tournamentorganizer@test.com",
      name: "Tournament Organizer",
      password: hashedPassword,
      role: "admin",
      adminType: "tournament_organizer",
      isApproved: true,
    },
  });

  // 8. Coach Admin (approved)
  const coachAdmin = await prisma.user.create({
    data: {
      email: "coachadmin@test.com",
      name: "Coach Admin",
      password: hashedPassword,
      role: "admin",
      adminType: "coach_admin",
      isApproved: true,
    },
  });

  // 9. Timing Organizer (approved)
  const timingOrganizer = await prisma.user.create({
    data: {
      email: "timingorganizer@test.com",
      name: "Timing Organizer",
      password: hashedPassword,
      role: "admin",
      adminType: "timing_organizer",
      isApproved: true,
    },
  });

  // 10. Regular User (approved) – has phone for forgot-password OTP testing
  const regularUser = await prisma.user.create({
    data: {
      email: "user@test.com",
      name: "Regular User",
      phone: "01289208053", // use this number on /forgot-password to get OTP in dev (see FORGOT_PASSWORD_TESTING.md)
      password: hashedPassword,
      role: "user",
      isApproved: true,
    },
  });

  // ============================================
  // LOCATIONS & COURTS
  // ============================================
  console.log("📍 Creating locations and courts...");

  // Location A (owned by Club Owner A)
  const locationA = await prisma.location.create({
    data: {
      name: "Location A",
      address: "123 Test Street",
      ownerId: clubOwnerA.id,
      cancellationHours: 4 as any,
      courts: {
        create: [
          {
            name: "Court A1",
            type: "Indoor",
            pricePerHour: 250,
          },
          {
            name: "Court A2",
            type: "Outdoor",
            pricePerHour: 200,
          },
        ],
      },
    },
    include: { courts: true },
  });

  // Location B (no owner - unassigned)
  const locationB = await prisma.location.create({
    data: {
      name: "Location B",
      address: "456 Test Avenue",
      cancellationHours: 4 as any,
      courts: {
        create: [
          {
            name: "Court B1",
            type: "Indoor",
            pricePerHour: 300,
          },
        ],
      },
    },
    include: { courts: true },
  });

  // ============================================
  // ADMIN ASSIGNMENTS & PROFILES
  // ============================================
  console.log("🔗 Creating moderator location assignment, club admin notification, organizer profile...");

  // Moderator can access Location A (so /admin/club-owner and location-scoped APIs work)
  await (prisma as any).locationAssignment.create({
    data: {
      userId: moderator.id,
      locationId: locationA.id,
      assignedById: superAdmin.id,
    },
  });

  // Club Admin gets location from approval notification (so GET /api/users/me returns clubAdminLocationId)
  await prisma.notification.create({
    data: {
      userId: clubAdmin.id,
      title: "Club admin approved",
      message: "You have been approved as club admin for Location A.",
      type: "admin_approval",
      metadata: {
        pendingUserId: clubAdmin.id,
        userType: "club_admin",
        locationId: locationA.id,
      },
    },
  });

  // Tournament Organizer has approved OrganizerProfile (so /admin/tournament-organizer works)
  await (prisma as any).organizerProfile.create({
    data: {
      userId: tournamentOrganizer.id,
      isApproved: true,
      approvedById: superAdmin.id,
      approvedAt: new Date(),
    },
  });

  // ============================================
  // BOOKINGS
  // ============================================
  console.log("📅 Creating test bookings...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Confirmed booking (Location A, Court A1) - Regular User
  const booking1 = await prisma.booking.create({
    data: {
      userId: regularUser.id,
      locationId: locationA.id,
      courtId: (locationA as any).courts[0].id,
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      status: "confirmed",
      totalPrice: 500, // 2 hours * 250
      category: "regular" as any,
    },
  });

  // Confirmed booking (Location A, Court A2) - Club Admin
  const booking2 = await prisma.booking.create({
    data: {
      userId: clubAdmin.id,
      locationId: locationA.id,
      courtId: (locationA as any).courts[1].id,
      date: today,
      startTime: "14:00",
      endTime: "16:00",
      status: "confirmed",
      totalPrice: 400, // 2 hours * 200
      category: "regular" as any,
    },
  });

  // Cancelled booking (Location A, Court A1) - Regular User
  const booking3 = await prisma.booking.create({
    data: {
      userId: regularUser.id,
      locationId: locationA.id,
      courtId: (locationA as any).courts[0].id,
      date: tomorrow,
      startTime: "10:00",
      endTime: "11:00",
      status: "cancelled",
      totalPrice: 250,
      category: "regular" as any,
      cancelledByUserId: regularUser.id, // Self-cancelled
    },
  });

  // ============================================
  // FINANCIAL TRANSACTIONS
  // ============================================
  console.log("💰 Creating financial transactions...");

  // Booking revenue (from booking1)
  await (prisma as any).financialTransaction.create({
    data: {
      locationId: locationA.id,
      courtId: (locationA as any).courts[0].id,
      amount: 500,
      type: "income",
      source: "booking",
      description: `Booking revenue: ${(locationA as any).courts[0].name} - ${
        today.toISOString().split("T")[0]
      } 10:00-12:00`,
      transactionDate: today,
      createdById: clubOwnerA.id,
    },
  });

  // Booking revenue (from booking2)
  await (prisma as any).financialTransaction.create({
    data: {
      locationId: locationA.id,
      courtId: (locationA as any).courts[1].id,
      amount: 400,
      type: "income",
      source: "booking",
      description: `Booking revenue: ${(locationA as any).courts[1].name} - ${
        today.toISOString().split("T")[0]
      } 14:00-16:00`,
      transactionDate: today,
      createdById: clubOwnerA.id,
    },
  });

  // Cancellation refund (negative income for booking3)
  const cancellationDate = new Date(tomorrow);
  cancellationDate.setHours(0, 0, 0, 0);
  await (prisma as any).financialTransaction.create({
    data: {
      locationId: locationA.id,
      courtId: (locationA as any).courts[0].id,
      amount: -250, // Negative income
      type: "income",
      source: "booking",
      description: `Booking cancellation: ${
        (locationA as any).courts[0].name
      } - ${tomorrow.toISOString().split("T")[0]} 10:00-11:00`,
      transactionDate: cancellationDate,
      createdById: clubOwnerA.id,
    },
  });

  // Manual income
  await (prisma as any).financialTransaction.create({
    data: {
      locationId: locationA.id,
      amount: 1000,
      type: "income",
      source: "manual",
      description: "Manual income entry",
      transactionDate: today,
      createdById: clubOwnerA.id,
    },
  });

  // Manual expense
  await (prisma as any).financialTransaction.create({
    data: {
      locationId: locationA.id,
      amount: 500,
      type: "expense",
      source: "manual",
      description: "Maintenance expense",
      transactionDate: today,
      createdById: clubOwnerA.id,
    },
  });

  console.log("✅ Database seed completed!");
  console.log("\n📋 Test users (all password: password123) – for admin UI testing:");
  console.log("  Super Admin:           superadmin@test.com       → /admin/super-admin");
  console.log("  Club Owner A:          clubownera@test.com      → /admin/club-owner");
  console.log("  Club Owner B (unappr): clubownerb@test.com      → /admin (pending approval)");
  console.log("  Owner Partner:         ownerpartner@test.com    → /admin (read-only)");
  console.log("  Moderator:             moderator@test.com       → /admin/club-owner (Location A)");
  console.log("  Club Admin:            clubadmin@test.com       → /admin/club-admin (Location A)");
  console.log("  Tournament Organizer:  tournamentorganizer@test.com → /admin/tournament-organizer");
  console.log("  Coach Admin:           coachadmin@test.com      → /admin (coach_admin)");
  console.log("  Timing Organizer:      timingorganizer@test.com → /admin (timing_organizer)");
  console.log("  Regular User:          user@test.com            → no admin");
  console.log("\nRun: npx prisma db seed");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
