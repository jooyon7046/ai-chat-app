import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousUser } from "@/lib/supabase/ensure-anonymous-auth";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type AppSupabase = SupabaseClient<Database>;

const AUTH_ERROR_MESSAGE =
  "익명 인증에 실패했습니다. Supabase Dashboard → Authentication → Providers에서 Anonymous sign-ins를 활성화했는지 확인해 주세요.";

export async function getSupabaseWithUser(): Promise<{
  supabase: AppSupabase;
  user: User;
}> {
  const supabase = createClient();
  const user = await ensureAnonymousUser(supabase);

  if (!user) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  return { supabase, user };
}

export { AUTH_ERROR_MESSAGE };
