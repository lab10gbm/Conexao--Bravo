"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OficiaisConfigModule } from "../../../components/OficiaisConfigModule";

export default function OficiaisConfigPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <OficiaisConfigModule 
          obmContext="10º GBM" 
          onClose={() => router.push("/gestao-sad")} 
        />
      </div>
    </div>
  );
}
