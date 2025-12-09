import { useEffect } from "react";
import { parseAndTrackFromUrl } from "@/lib/cookieTracking";

export const useCookieTracking = () => {
  useEffect(() => {
    // Parse URL and track on initial load
    parseAndTrackFromUrl();
  }, []);
};
