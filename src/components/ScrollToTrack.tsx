"use client";

import { useEffect } from "react";

export default function ScrollToTrack() {
  useEffect(() => {
    const el = document.getElementById("active-track");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return null;
}
