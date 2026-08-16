export type AvatarId = "lion" | "elephant" | "monkey" | "tiger" | "giraffe" | "zebra";

export const AVATARS: { id: AvatarId; emoji: string }[] = [
  { id: "lion", emoji: "🦁" },
  { id: "elephant", emoji: "🐘" },
  { id: "monkey", emoji: "🐒" },
  { id: "tiger", emoji: "🐅" },
  { id: "giraffe", emoji: "🦒" },
  { id: "zebra", emoji: "🦓" },
];

export const DEFAULT_AVATAR_EMOJI = "👤";

// Firebase Auth's `photoURL` field just stores a string — there's no real
// image behind it, so a predefined avatar choice is encoded as
// "avatar:<id>" instead of an actual URL. This reuses the exact same
// updateProfile()/photoURL sync already in place for display names, with
// no new backend (Storage, Firestore doc, etc.) required.
const AVATAR_SCHEME = "avatar:";

export function avatarIdFromPhotoURL(photoURL: string | null | undefined): AvatarId | null {
  if (!photoURL || !photoURL.startsWith(AVATAR_SCHEME)) return null;
  const id = photoURL.slice(AVATAR_SCHEME.length);
  return AVATARS.some((a) => a.id === id) ? (id as AvatarId) : null;
}

export function photoURLFromAvatarId(id: AvatarId): string {
  return `${AVATAR_SCHEME}${id}`;
}

export function emojiForAvatarId(id: AvatarId | null): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? DEFAULT_AVATAR_EMOJI;
}
