import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingPlayer } from "@/lib/point-system";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      email,
      password,
      name,
      phone,
      role,
      adminType,
      userType,
      locationId,
    } = data;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine user role and approval status
    // Club owners are stored as admin with adminType="club_owner"
    const userRole =
      role === "admin"
        ? "admin"
        : role === "club_owner"
        ? "admin" // Club owners are stored as admin with adminType="club_owner"
        : "user";

    // Handle adminType for club_owner case
    const finalAdminType =
      role === "club_owner" ? "club_owner" : adminType || null;

    // Approval rules:
    // - owner_partner, moderator, club_owner, admin → requires approval
    // - club_admin → requires approval from club owner (if locationId provided)
    // - regular users → auto-approved
    const isClubAdmin = userType === "club_admin";
    const requiresApproval =
      role === "admin" ||
      role === "club_owner" ||
      finalAdminType === "owner_partner" ||
      finalAdminType === "moderator" ||
      finalAdminType === "club_owner" ||
      (isClubAdmin && locationId); // Club admin requires approval if location is selected
    const isApproved = !requiresApproval;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || undefined,
        phone: phone || undefined,
        role: userRole,
        adminType: finalAdminType,
        userType: userType || null,
        isApproved,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminType: true,
        isApproved: true,
      },
    });

    // If not admin, notify user to confirm if they are in the point system
    if (userRole !== "admin") {
      const candidateName = (
        name && name.trim().length > 0 ? name.trim() : email.split("@")[0]
      ) as string;

      try {
        const { match, similarity } = findMatchingPlayer(candidateName);
        if (match && similarity >= 0.7) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Is this you?",
              message: `We found \"${match.name}\" with ${match.points} points in Port Said rankings. Confirm if this is you to import the points.`,
              type: "player_match",
              metadata: {
                candidateName,
                matchedName: match.name,
                matchedPoints: match.points,
                similarity: Math.round(similarity * 100),
              },
            },
          });
        }
      } catch (checkError) {
        console.warn("Failed to evaluate player point match", checkError);
      }
    }

    // Handle notifications for pending approvals
    if (!isApproved) {
      try {
        const isModerator = finalAdminType === "moderator";
        
        if ((isClubAdmin || isModerator) && locationId) {
          // Club admin or Moderator registration - notify the club owner of the selected location
          const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (location && location.owner) {
            const roleLabel = isModerator ? "Moderator" : "Club Admin";
            const roleType = isModerator ? "moderator" : "club_admin";
            
            await prisma.notification.create({
              data: {
                userId: location.owner.id,
                title: `New ${roleLabel} Registration Pending Approval`,
                message: `${
                  name || email
                } has requested to become a ${roleLabel} for ${
                  location.name
                }. Please review and approve their request.`,
                type: "admin_approval",
                metadata: {
                  pendingUserId: user.id,
                  pendingUserEmail: email,
                  pendingUserName: name,
                  userType: isModerator ? null : "club_admin",
                  adminType: isModerator ? "moderator" : null,
                  locationId: locationId,
                  locationName: location.name,
                },
              },
            });
          } else {
            console.warn(
              `Location ${locationId} not found or has no owner for ${isModerator ? "moderator" : "club admin"} registration`
            );
          }
        } else if (userRole === "admin" && !isModerator) {
          // Admin/club owner/owner_partner/moderator registration - notify all super admins
          const superAdmins = await prisma.user.findMany({
            where: {
              role: "admin",
              adminType: "super_admin",
              isApproved: true,
            },
            select: {
              id: true,
            },
          });

          // Create notification for each super admin
          const adminTypeLabel =
            finalAdminType === "club_owner"
              ? "Club Owner"
              : finalAdminType === "owner_partner"
              ? "Owner (Partner)"
              : finalAdminType === "moderator"
              ? "Moderator"
              : finalAdminType === "timing_organizer"
              ? "Timing Organizer"
              : finalAdminType === "tournament_organizer"
              ? "Tournament Organizer"
              : finalAdminType === "coach_admin"
              ? "Coach Admin"
              : "Admin";

          for (const superAdmin of superAdmins) {
            await prisma.notification.create({
              data: {
                userId: superAdmin.id,
                title: "New Admin Registration Pending Approval",
                message: `${
                  name || email
                } has requested ${adminTypeLabel} access. Please review and approve their request.`,
                type: "admin_approval",
                metadata: {
                  pendingUserId: user.id,
                  pendingUserEmail: email,
                  pendingUserName: name,
                  adminType: finalAdminType,
                },
              },
            });
          }
        }
      } catch (notificationError) {
        console.warn(
          "Failed to create admin approval notifications",
          notificationError
        );
        // Don't fail registration if notification fails
      }
    }

    const message = requiresApproval
      ? "Registration submitted. Waiting for approval."
      : "User created successfully";

    return NextResponse.json({ message, user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
