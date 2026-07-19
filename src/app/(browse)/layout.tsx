import BrowseContainer from "@/components/BrowseContainer";
import Flex from "@/components/Flex";
import NavBar from "@/components/NavBar";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import MobileBrowseNav from "@/components/MobileBrowseNav";

export default function BrowseLayout({
  children,
  artists,
  years,
  shows,
  songs,
  sources,
}: {
  children: ReactNode;
  artists: ReactNode;
  years: ReactNode;
  shows: ReactNode;
  songs: ReactNode;
  sources: ReactNode;
}) {
  return (
    <Flex column className="lg:h-dvh">
      <Toaster id="audio-error" position="top-center" offset="54px" richColors closeButton />
      <NavBar />
      <MobileBrowseNav />
      <BrowseContainer>
        <div className="browse-col">{artists}</div>
        <div className="browse-col">{years}</div>
        <div className="browse-col">{shows}</div>
        <div className="browse-col">{songs}</div>
        <div className="browse-col">{sources}</div>
        {children}
      </BrowseContainer>
    </Flex>
  );
}
