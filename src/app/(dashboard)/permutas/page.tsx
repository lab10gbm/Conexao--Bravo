"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../contexts/SessionContext";
import { PermutaModule } from "../../../components/PermutaModule";
import { RequestPermuta } from "../../../components/RequestPermuta";

export default function PermutasPage() {
  const router = useRouter();
  const {
    effectiveProfile,
    obmContext,
    isOfficerMode,
    adminModeActive,
    setAdminModeActive,
  } = useSession();

  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (!effectiveProfile) return null;

  const handleDateClick = (date?: Date) => {
    setSelectedDate(date || new Date());
    setIsPermutaModalOpen(true);
  };

  return (
    <div className="w-full">
      <PermutaModule
        user={effectiveProfile}
        obmContext={obmContext}
        isOfficerMode={isOfficerMode}
        adminModeActive={adminModeActive}
        onToggleAdminMode={() => setAdminModeActive((prev) => !prev)}
        onDateClick={handleDateClick}
        onMonthSelect={() => {}}
        onBackToPortal={() => router.push("/")}
      />

      <RequestPermuta
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        user={effectiveProfile}
        obmContext={obmContext}
        initialDate={selectedDate}
      />
    </div>
  );
}
