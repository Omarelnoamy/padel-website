"use client";

import { useTranslations } from "@/app/translations";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const t = useTranslations("en");
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const user = session.user as any;
      
      // Redirect moderators to club owner dashboard
      if (user.role === "admin" && user.adminType === "moderator") {
        router.push("/admin/club-owner");
        return;
      }
      
      // Redirect club owners to club owner dashboard
      if (
        user.role === "club_owner" ||
        (user.role === "admin" && user.adminType === "club_owner")
      ) {
        router.push("/admin/club-owner");
        return;
      }
      
      // Redirect super admins to super admin dashboard
      if (user.role === "admin" && user.adminType === "super_admin") {
        router.push("/admin/super-admin");
        return;
      }
      
      // Redirect club admins to club admin dashboard
      if (user.role === "user" && user.userType === "club_admin" && user.isApproved) {
        router.push("/admin/club-admin");
        return;
      }
      
      // Redirect tournament organizers to organizer dashboard
      if (user.role === "admin" && user.adminType === "tournament_organizer") {
        router.push("/admin/tournament-organizer");
        return;
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl mb-4">{t.adminDashboard}</h1>
      <p className="text-gray-600">{t.manageBookings}</p>
    </div>
  );
}
