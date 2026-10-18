"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { EmDesenvolvimento } from "../../../components/EmDesenvolvimento";

export default function EmDesenvolvimentoPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      <EmDesenvolvimento onBack={() => router.push("/")} />
    </div>
  );
}
