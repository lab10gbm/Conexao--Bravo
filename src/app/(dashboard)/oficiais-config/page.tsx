"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OfficerConfigModule } from "../../../components/OfficerConfigModule";

export default function OficiaisConfigPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      <OfficerConfigModule onClose={() => router.push("/")} />
    </div>
  );
}
