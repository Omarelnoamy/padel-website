/**
 * Script to fix location assignments for moderators who were approved before the migration
 * Run this if you have moderators that were approved but don't have LocationAssignment records
 * 
 * Usage: node fix-moderator-assignments.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixModeratorAssignments() {
  try {
    console.log("\n🔧 Fixing moderator location assignments...\n");

    // Find all approved moderators
    const moderators = await prisma.user.findMany({
      where: {
        role: "admin",
        adminType: "moderator",
        isApproved: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`Found ${moderators.length} approved moderators\n`);

    if (moderators.length === 0) {
      console.log("No moderators to process.");
      return;
    }

    let fixed = 0;
    let skipped = 0;

    for (const moderator of moderators) {
      console.log(`Processing moderator: ${moderator.email || moderator.name || moderator.id}`);

      // Find their approval notification to get locationId
      const notifications = await prisma.notification.findMany({
        where: {
          type: "admin_approval",
          metadata: {
            path: ["pendingUserId"],
            equals: moderator.id,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Find the notification that has locationId in metadata
      const notificationWithLocation = notifications.find((notif) => {
        const metadata = notif.metadata || {};
        return metadata.adminType === "moderator" && metadata.locationId;
      });

      if (!notificationWithLocation) {
        console.log(`  ⚠️  No notification found with locationId for ${moderator.email}`);
        skipped++;
        continue;
      }

      const metadata = notificationWithLocation.metadata || {};
      const locationId = metadata.locationId;

      // Check if assignment already exists
      const existingAssignment = await prisma.locationAssignment.findFirst({
        where: {
          userId: moderator.id,
          locationId: locationId,
        },
      });

      if (existingAssignment) {
        console.log(`  ✅ Assignment already exists for location ${metadata.locationName || locationId}`);
        skipped++;
        continue;
      }

      // Create the assignment
      try {
        await prisma.locationAssignment.create({
          data: {
            userId: moderator.id,
            locationId: locationId,
            assignedById: null, // Can't determine who originally approved
          },
        });
        console.log(`  ✅ Created assignment for location: ${metadata.locationName || locationId}`);
        fixed++;
      } catch (error) {
        console.error(`  ❌ Failed to create assignment: ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${moderators.length}\n`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixModeratorAssignments();
