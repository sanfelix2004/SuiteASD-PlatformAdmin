import { newId, sql } from "./db";

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  created_at: string | Date;
};

const AVATAR_COLORS = [
  "#2f4bff",
  "#1f9d7a",
  "#c45c16",
  "#b42318",
  "#0f766e",
  "#7c3aed",
  "#0369a1",
  "#a16207",
];

export function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

export async function listProfilesForUser(userId: string) {
  const rows = await sql<ProfileRow>(
    `select * from access_profile where user_id = $1 order by created_at asc`,
    [userId],
  );
  return rows.map(mapProfile);
}

export async function getProfileForUser(profileId: string, userId: string) {
  const rows = await sql<ProfileRow>(
    `select * from access_profile where id = $1 and user_id = $2 limit 1`,
    [profileId, userId],
  );
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function createProfile(input: {
  userId: string;
  name: string;
  avatarColor?: string;
}) {
  const existing = await listProfilesForUser(input.userId);
  const color =
    input.avatarColor ||
    AVATAR_COLORS[existing.length % AVATAR_COLORS.length];
  const id = newId();
  await sql(
    `insert into access_profile (id, user_id, name, avatar_color) values ($1,$2,$3,$4)`,
    [id, input.userId, input.name.trim(), color],
  );
  return getProfileForUser(id, input.userId);
}

export async function deleteProfile(profileId: string, userId: string) {
  const profiles = await listProfilesForUser(userId);
  if (profiles.length <= 1) {
    throw new Error("last_profile");
  }
  await sql(`delete from access_profile where id = $1 and user_id = $2`, [
    profileId,
    userId,
  ]);
}

export { AVATAR_COLORS };
