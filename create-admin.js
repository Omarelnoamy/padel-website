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

async function createAdmin() {
  try {
    console.log("\n🔐 Create Admin Account\n");

    const email = await question("Enter email: ");
    const password = await question("Enter password: ");
    const name = (await question("Enter name (optional): ")) || null;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log("\n⚠️  User already exists. Updating to super_admin...");
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: "admin",
          adminType: "super_admin",
          isApproved: true,
        },
      });
      console.log("✅ User updated to super_admin!");
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
    }

    console.log("\n📧 Login credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n🚀 You can now login at http://localhost:3000/login\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

createAdmin();
