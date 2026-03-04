import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import type { Location, Court } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const searchParams = request.nextUrl.searchParams;
    const publicOnly = searchParams.get("public") === "true";
    const organizerId = searchParams.get("organizerId");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");

    const where: any = {};

    // If public only, show only REGISTRATION_OPEN and above
    if (publicOnly) {
      where.status = {
        in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ONGOING", "FINISHED"],
      };
    }

    // Filter by organizer
    if (organizerId) {
      where.organizerId = organizerId;
    }

    // Filter by location
    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        organizer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        rankCategory: {
          select: {
            id: true,
            name: true,
            minPoints: true,
            maxPoints: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            teams: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format response based on user role
    const formattedTournaments = tournaments.map((tournament) => {
      const base = {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        tournamentSystem: tournament.tournamentSystem,
        tournamentLevel: tournament.tournamentLevel,
        registrationStartDate: tournament.registrationStartDate,
        registrationDeadline: tournament.registrationDeadline,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        registrationPrice: tournament.registrationPrice,
        prizes: tournament.prizes,
        maxTeamPoints: tournament.maxTeamPoints,
        location: tournament.location,
        organizer: tournament.organizer?.user,
        registeredTeamsCount: tournament._count.registrations,
      };

      // Hide maxTeams and internalNotes for public
      if (publicOnly) {
        return base;
      }

      // Show all data for organizers/admins
      return {
        ...base,
        maxTeams: tournament.maxTeams,
        internalNotes: tournament.internalNotes,
        description: tournament.description,
        termsAndConditions: tournament.termsAndConditions,
        rankCategory: tournament.rankCategory,
      };
    });

    return NextResponse.json({
      tournaments: formattedTournaments,
      total: formattedTournaments.length,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Check if user is a tournament organizer
    if (user.role !== "admin" || user.adminType !== "tournament_organizer") {
      return NextResponse.json(
        { error: "Only tournament organizers can create tournaments" },
        { status: 403 }
      );
    }

    // Check if organizer is approved
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!organizerProfile || !organizerProfile.isApproved) {
      return NextResponse.json(
        { error: "Your organizer account is not approved yet" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      startDate,
      endDate,
      startTime,
      endTime,
      tournamentSystem,
      locationId,
      customLocation,
      customLocationCourts,
      courtIds,
      description,
      maxTeamPoints,
    } = body;

    // Validation
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name and dates are required" },
        { status: 400 }
      );
    }

    // Location validation - either locationId or customLocation must be provided
    if (!locationId && !customLocation) {
      return NextResponse.json(
        { error: "Location is required (either select from website or provide custom location)" },
        { status: 400 }
      );
    }

    // If using custom location, number of courts is required
    if (customLocation && (!customLocationCourts || customLocationCourts <= 0)) {
      return NextResponse.json(
        { error: "Number of courts is required for custom locations" },
        { status: 400 }
      );
    }

    // Court validation - only required if using website location
    if (locationId && (!courtIds || !Array.isArray(courtIds) || courtIds.length === 0)) {
      return NextResponse.json(
        { error: "At least one court must be selected" },
        { status: 400 }
      );
    }

    // Max team points validation
    if (!maxTeamPoints || maxTeamPoints <= 0) {
      return NextResponse.json(
        { error: "Max team points is required and must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify location exists (only if using website location)
    let location: (Location & { courts: Court[] }) | null = null;
    if (locationId) {
      location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { courts: true },
      });

      if (!location) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }

      // Verify all courts belong to the location (location is non-null after check above)
      const invalidCourts = courtIds.filter(
        (courtId: string) => !location!.courts.some((c) => c.id === courtId)
      );

      if (invalidCourts.length > 0) {
        return NextResponse.json(
          { error: "Some selected courts do not belong to the selected location" },
          { status: 400 }
        );
      }
    }

    // Validate tournament system
    const validTournamentSystems = ["knockout", "league", "groups"];
    const finalTournamentSystem = tournamentSystem && validTournamentSystems.includes(tournamentSystem) 
      ? tournamentSystem 
      : "knockout"; // Default to knockout if invalid

    // Create tournament (DRAFT status)
    const tournament = await prisma.tournament.create({
      data: {
        name,
        organizerId: organizerProfile.id,
        locationId: locationId || null, // null if custom location
        tournamentSystem: finalTournamentSystem,
        tournamentLevel: "Open", // Default, can be changed later
        registrationStartDate: new Date(startDate),
        registrationDeadline: new Date(endDate),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationPrice: 0, // Default, can be changed later
        prizes: "", // Default, can be changed later
        termsAndConditions: "", // Default, can be changed later
        description: description || null,
        maxTeamPoints: maxTeamPoints,
        status: "DRAFT",
        // Store court IDs, custom location, and times in internalNotes as JSON
        internalNotes: JSON.stringify({ 
          courtIds: courtIds || [], 
          startTime, 
          endTime,
          customLocation: customLocation || null,
          customLocationCourts: customLocationCourts || null,
        }),
      },
      include: {
        organizer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          location: tournament.location,
          organizer: tournament.organizer?.user,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}
