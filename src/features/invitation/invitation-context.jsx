import { useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchInvitation } from "@/services/api";
import {
  getWeddingUid,
  storeWeddingUid,
  storeGuestName,
  hasInvitationData,
} from "@/lib/invitation-storage";
import { safeBase64 } from "@/lib/base64";
import { InvitationContext } from "./invitation-context-definition";

/**
 * InvitationProvider component
 * Provides the invitation UID and config data throughout the app
 *
 * Security Features:
 * - Stores UID in localStorage to hide from URL
 * - Cleans URL after extracting parameters
 * - Prevents Wayback Machine scraping
 * - 30-day expiration for stored data
 * - Automatically updates when different UID or guest name is provided
 *
 * The UID priority:
 * 1. URL parameters (if different from stored, updates localStorage)
 * 2. localStorage (if not expired and no URL override)
 * 3. Environment variable: VITE_INVITATION_UID
 *
 * @example
 * <InvitationProvider>
 *   <App />
 * </InvitationProvider>
 */
export function InvitationProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const invitationUid = useMemo(() => {
    // Extract UID from URL first (to check if it's different)
    let uidFromUrl = null;

    // 1. Try to get UID from URL path (e.g., /lucas-andressa)
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (pathSegments.length > 0 && pathSegments[0] !== "admin") {
      uidFromUrl = pathSegments[0];
    }

    // 2. Try to get UID from URL query parameter (legacy support)
    if (!uidFromUrl) {
      const urlParams = new URLSearchParams(location.search);
      uidFromUrl = urlParams.get("uid");
    }

    // Check if we have a stored UID
    const storedUid = getWeddingUid();

    // If URL has UID and it's different from stored, update localStorage
    if (uidFromUrl && uidFromUrl !== storedUid) {
      console.log(`Updating invitation from "${storedUid}" to "${uidFromUrl}"`);
      storeWeddingUid(uidFromUrl);
      return uidFromUrl;
    }

    // If URL has UID (same as stored or no stored), use it
    if (uidFromUrl) {
      storeWeddingUid(uidFromUrl);
      return uidFromUrl;
    }

    // If no URL UID but have stored UID, use stored
    if (storedUid) {
      return storedUid;
    }

    // 3. Fallback to environment variable
    const uidFromEnv = import.meta.env.VITE_INVITATION_UID || "lucas-andressa";

    if (uidFromEnv) {
      storeWeddingUid(uidFromEnv);
      return uidFromEnv;
    }

    return uidFromEnv;
  }, [location.pathname, location.search]);

  // Extract and store guest name from URL, then clean URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const guestParam = urlParams.get("guest");

    // Store guest name if present (even if different from stored - auto-update)
    if (guestParam) {
      try {
        const decodedName = safeBase64.decode(guestParam);
        if (decodedName) {
          const storedName = localStorage.getItem("sakeenah_guest_name");
          if (decodedName !== storedName) {
            console.log(
              `Updating guest name from "${storedName}" to "${decodedName}"`,
            );
          }
          storeGuestName(decodedName);
        }
      } catch (error) {
        console.error("Error decoding guest name:", error);
      }
    }

    // Clean URL if we have UID in path or guest in query params
    const hasUidInPath =
      location.pathname !== "/" &&
      location.pathname !== "" &&
      !location.pathname.startsWith("/admin");
    const hasGuestParam = urlParams.has("guest");
    const hasUidParam = urlParams.has("uid");

    if (hasUidInPath || hasGuestParam || hasUidParam) {
      // Only clean URL if we have data stored
      if (hasInvitationData()) {
        // Use window.history.replaceState for clean URL without reload
        window.history.replaceState({}, "", "/");
      }
    }
  }, [location.pathname, location.search, navigate]);

  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", invitationUid],
    queryFn: async () => {
      const response = await fetchInvitation(invitationUid);
      if (response.success) {
        return response.data;
      }
      throw new Error("Failed to load invitation");
    },
    enabled: !!invitationUid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return (
    <InvitationContext.Provider
      value={{ uid: invitationUid, config, isLoading, error: error?.message }}
    >
      {children}
    </InvitationContext.Provider>
  );
}
