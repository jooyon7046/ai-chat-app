import { getSupabaseWithUser } from "@/lib/supabase/client-auth";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";
import {
  createEmptySession,
  deriveSessionTitle,
} from "@/lib/chat/sessions-storage";
import type { Message, Session } from "@/lib/types";

type ChatSessionRow = Tables<"chat_sessions">;

function rowToSession(row: ChatSessionRow): Session {
  return {
    id: row.id,
    title: row.title,
    messages: (row.messages ?? []) as Session["messages"],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function sessionToInsert(
  session: Session,
  userId: string,
): TablesInsert<"chat_sessions"> {
  return {
    id: session.id,
    user_id: userId,
    title: session.title,
    messages: session.messages as unknown as ChatSessionRow["messages"],
    created_at: new Date(session.createdAt).toISOString(),
    updated_at: new Date(session.updatedAt).toISOString(),
  };
}

export async function listSessions(): Promise<Session[]> {
  const { supabase } = await getSupabaseWithUser();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToSession);
}

export async function insertSession(session: Session): Promise<void> {
  const { supabase, user } = await getSupabaseWithUser();

  const { error } = await supabase
    .from("chat_sessions")
    .insert(sessionToInsert(session, user.id));

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSessionRecord(
  id: string,
  messages: Message[],
): Promise<void> {
  const { supabase } = await getSupabaseWithUser();
  const title = deriveSessionTitle(messages);
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      messages: messages as unknown as ChatSessionRow["messages"],
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSessionRecord(id: string): Promise<void> {
  const { supabase } = await getSupabaseWithUser();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export { createEmptySession, deriveSessionTitle };
