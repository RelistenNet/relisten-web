import NavBar from "@/components/NavBar";
import { ReactNode } from "react";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
