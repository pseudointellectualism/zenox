"use client";

import { useState } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";

interface AdminClientPageProps {
  initialUser: { username: string; role: string } | null;
}

export default function AdminClientPage({ initialUser }: AdminClientPageProps) {
  const [user, setUser] = useState<{ username: string; role: string } | null>(initialUser);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
  };

  if (!user) {
    return <AdminLoginForm onSuccess={(usr) => setUser(usr)} />;
  }

  return (
    <AdminDashboard
      currentUser={user}
      onLogout={handleLogout}
    />
  );
}
