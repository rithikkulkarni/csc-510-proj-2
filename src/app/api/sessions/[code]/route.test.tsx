import { describe, it, expect } from "vitest";
import { supabase } from "../../../../lib/supabaseClient";

// Utility to generate a random 4-letter uppercase code
function generateCode(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

describe("Supabase Automated Session Test", () => {
  it("creates, fetches, and deletes a test session", async () => {
    const testCode = generateCode();

    // 1. Insert test session
    const { data: inserted, error: insertError } = await supabase
      .from("sessions")
      .insert([{ code: testCode }])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert test session: ${insertError.message}`);
    }

    expect(inserted.code).toBe(testCode);

    // 2. Fetch the session by code
    const { data: fetched, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", testCode)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch test session: ${fetchError.message}`);
    }

    expect(fetched.code).toBe(testCode);

    // 3. Delete the test session
    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", inserted.id);

    if (deleteError) {
      throw new Error(`Failed to delete test session: ${deleteError.message}`);
    }

    // 4. Verify deletion
    const { data: verifyDeleted } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", testCode)
      .single();

    expect(verifyDeleted).toBeNull();
  });
});
