import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Checks if a user has admin role using the database has_role function
 * @param supabaseClient - Supabase client with service role or user auth
 * @param userId - UUID of the user to check
 * @returns boolean indicating if user is admin
 */
export async function isAdmin(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Exception checking admin role:", error);
    return false;
  }
}

/**
 * Validates that the current user is an admin, throws error if not
 * @param supabaseClient - Supabase client with service role or user auth
 * @param userId - UUID of the user to check
 * @throws Error if user is not an admin
 */
export async function requireAdmin(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<void> {
  const hasAdminRole = await isAdmin(supabaseClient, userId);
  
  if (!hasAdminRole) {
    throw new Error("Unauthorized: Admin access required");
  }
}
