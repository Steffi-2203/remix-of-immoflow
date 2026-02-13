import { supabase } from "@/integrations/supabase/client";

export interface PasswordLeakResult {
  leaked: boolean;
  count: number;
}

/**
 * Checks a password against the HaveIBeenPwned database
 * via k-anonymity (only SHA-1 prefix is sent to HIBP).
 * Fails open: returns { leaked: false } on errors.
 */
export async function checkPasswordLeak(password: string): Promise<PasswordLeakResult> {
  try {
    const { data, error } = await supabase.functions.invoke("check-password-leak", {
      body: { password },
    });

    if (error) {
      console.error("Password leak check error:", error);
      return { leaked: false, count: 0 };
    }

    return data as PasswordLeakResult;
  } catch {
    return { leaked: false, count: 0 };
  }
}
