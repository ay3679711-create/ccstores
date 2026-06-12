// Derives a stable per-user "admin chat" code from the user's id.
// Not stored in the database — admin therefore never sees it.
// Format: AC-XXXXXXXX (uppercase hex from the user UUID).
export function deriveAdminChatCode(userId: string): string {
  if (!userId) return "";
  const hex = userId.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `AC-${hex}`;
}

// Friends-chat code is stored on profiles.community_code (e.g. FR-XXXXXXXX).
export function isValidAdminChatCode(input: string, userId: string): boolean {
  return input.trim().toUpperCase() === deriveAdminChatCode(userId);
}
