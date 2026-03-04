const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createQuickAdmin() {
  try {
    const email = "admin@padel.com";
    const password = "admin123";
    const name = "Super Admin";

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log("✅ Admin account already exists!");
      console.log("\n📧 Login credentials:");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "admin",
          adminType: "super_admin",
          isApproved: true,
        },
      });
      console.log("✅ Super admin created successfully!");
      console.log("\n📧 Login credentials:");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    }

    console.log("\n🚀 Login at: http://localhost:3000/login");
    console.log(
      "📊 Admin dashboard: http://localhost:3000/admin/super-admin\n"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createQuickAdmin();
