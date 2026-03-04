const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createModerator() {
  try {
    console.log("\n👮 Create Moderator Account\n");

    const email = await question("Enter email (or press Enter for moderator@padel.com): ");
    const finalEmail = email || "moderator@padel.com";
    
    const password = await question("Enter password (or press Enter for moderator123): ");
    const finalPassword = password || "moderator123";
    
    const name = (await question("Enter name (or press Enter for 'Test Moderator'): ")) || "Test Moderator";

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existing) {
      console.log("\n⚠️  User already exists. Updating to moderator...");
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      await prisma.user.update({
        where: { email: finalEmail },
        data: {
          password: hashedPassword,
          role: "admin",
          adminType: "moderator",
          isApproved: false, // Needs approval from super admin
        },
      });
      console.log("✅ User updated to moderator (pending approval)!");
    } else {
      // Create new moderator
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      await prisma.user.create({
        data: {
          email: finalEmail,
          password: hashedPassword,
          name,
          role: "admin",
          adminType: "moderator",
          isApproved: false, // Needs approval from super admin
        },
      });
      console.log("✅ Moderator created successfully (pending approval)!");
    }

    console.log("\n📧 Login credentials:");
    console.log(`   Email: ${finalEmail}`);
    console.log(`   Password: ${finalPassword}`);
    console.log(`   Role: admin`);
    console.log(`   Admin Type: moderator`);
    console.log(`   Approval Status: Pending (needs super admin approval)`);
    console.log("\n⚠️  IMPORTANT: This moderator needs to be approved by a Super Admin before they can access admin features.");
    console.log("   1. Login as Super Admin at http://localhost:3000/admin/super-admin");
    console.log("   2. Go to the 'Pending Approvals' section");
    console.log("   3. Approve this moderator account");
    console.log("\n🚀 After approval, login at http://localhost:3000/login\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

createModerator();
