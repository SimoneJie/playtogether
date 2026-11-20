// PostgreSQL data layer (Supabase) built on `pg`.
// SERVER ONLY — do not import this module from client components.

import { Pool } from "pg";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { User, Activity, Registration, ParticipationStatus } from "./types";

type Row = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const AVATAR_COLORS = [
  "#267a50",
  "#f4a261",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickColor(nickname: string): string {
  return AVATAR_COLORS[hashString(nickname) % AVATAR_COLORS.length];
}

// Transaction-pooler friendly: a single connection is enough for this small app.
const globalForDb = globalThis as unknown as { __ptPool?: Pool };

export const pool: Pool =
  globalForDb.__ptPool ??
  (globalForDb.__ptPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  }));

// Idempotent schema creation — runs once per warm serverless instance.
let schemaReady = false;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#267a50',
    password_hash TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS signature TEXT NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    deadline BIGINT,
    target_participants INTEGER,
    max_participants INTEGER,
    expected_cost TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    allow_tentative BOOLEAN NOT NULL DEFAULT TRUE,
    allow_status_change BOOLEAN NOT NULL DEFAULT TRUE,
    public_roster BOOLEAN NOT NULL DEFAULT TRUE,
    require_password BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    creator_id TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS require_password BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    participation_status TEXT NOT NULL,
    probability INTEGER NOT NULL DEFAULT 100,
    participant_count INTEGER NOT NULL DEFAULT 1,
    remark TEXT NOT NULL DEFAULT '',
    updated_at BIGINT NOT NULL,
    UNIQUE(activity_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_reg_activity ON registrations(activity_id);
  CREATE INDEX IF NOT EXISTS idx_act_creator ON activities(creator_id);
`;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(SCHEMA);
  await ensureAdmin();
  schemaReady = true;
}

/** 确保管理员账号存在（admin / admin123），并保留该用户名。 */
async function ensureAdmin(): Promise<void> {
  // 原子、幂等：并发/多实例下也不会重复插入；已存在则仅标记为管理员。
  await pool.query(
    `INSERT INTO users (id, nickname, avatar, color, created_at, password_hash, is_admin)
     VALUES ($1, 'admin', '', '#267a50', $2, $3, TRUE)
     ON CONFLICT (nickname) DO UPDATE SET is_admin = TRUE`,
    [randomUUID(), Date.now(), hashPassword("admin123")]
  );
}

// ---------- mappers ----------

function mapUser(r: Row): User {
  return {
    id: String(r.id),
    nickname: String(r.nickname),
    signature: String(r.signature ?? ""),
    avatar: String(r.avatar ?? ""),
    color: String(r.color ?? "#267a50"),
    is_admin: !!r.is_admin,
    created_at: Number(r.created_at),
  };
}

function mapActivity(r: Row): Activity {
  return {
    id: String(r.id),
    title: String(r.title),
    category: String(r.category),
    description: String(r.description ?? ""),
    location: String(r.location ?? ""),
    start_time: Number(r.start_time),
    end_time: r.end_time == null ? null : Number(r.end_time),
    deadline: r.deadline == null ? null : Number(r.deadline),
    target_participants:
      r.target_participants == null ? null : Number(r.target_participants),
    max_participants:
      r.max_participants == null ? null : Number(r.max_participants),
    expected_cost: String(r.expected_cost ?? ""),
    cover: String(r.cover ?? ""),
    allow_tentative: !!r.allow_tentative,
    allow_status_change: !!r.allow_status_change,
    public_roster: !!r.public_roster,
    require_password: !!r.require_password,
    status: String(r.status) as Activity["status"],
    creator_id: String(r.creator_id),
    created_at: Number(r.created_at),
  };
}

function mapRegistration(r: Row): Registration {
  return {
    id: String(r.id),
    activity_id: String(r.activity_id),
    user_id: String(r.user_id),
    participation_status: String(r.participation_status) as ParticipationStatus,
    probability: Number(r.probability),
    participant_count: Number(r.participant_count),
    remark: String(r.remark ?? ""),
    updated_at: Number(r.updated_at),
  };
}

// ---------- users ----------

export async function getUser(id: string): Promise<User | null> {
  await ensureSchema();
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

export async function getUserByNickname(nickname: string): Promise<User | null> {
  await ensureSchema();
  const r = await pool.query("SELECT * FROM users WHERE nickname = $1", [nickname]);
  return r.rows[0] ? mapUser(r.rows[0]) : null;
}

/** 一次性批量取多个用户（避免名单 N+1 查询）。 */
export async function getUsersByIds(ids: string[]): Promise<Map<string, User>> {
  await ensureSchema();
  const map = new Map<string, User>();
  if (ids.length === 0) return map;
  const r = await pool.query("SELECT * FROM users WHERE id = ANY($1)", [ids]);
  for (const row of r.rows) {
    const u = mapUser(row);
    map.set(u.id, u);
  }
  return map;
}

// ---------- password hashing (scrypt, Node built-in crypto) ----------

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Register a new account. Username must be unique. */
export async function registerUser(
  username: string,
  password: string
): Promise<{ user: User } | { error: string }> {
  await ensureSchema();
  if (username.toLowerCase() === "admin") {
    return { error: "该用户名不可用" };
  }
  const existing = await getUserByNickname(username);
  if (existing) return { error: "该用户名已被注册" };
  const id = randomUUID();
  const color = pickColor(username);
  const now = Date.now();
  try {
    const inserted = await pool.query(
      `INSERT INTO users (id, nickname, avatar, color, created_at, password_hash)
       VALUES ($1, $2, '', $3, $4, $5)
       RETURNING *`,
      [id, username, color, now, hashPassword(password)]
    );
    return { user: mapUser(inserted.rows[0]) };
  } catch (e: any) {
    if (e?.code === "23505") return { error: "该用户名已被注册" };
    throw e;
  }
}

/** Verify username + password, returns the user or null. */
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  await ensureSchema();
  const r = await pool.query("SELECT * FROM users WHERE nickname = $1", [username]);
  const row = r.rows[0];
  if (!row || !row.password_hash) return null;
  if (!verifyPassword(password, String(row.password_hash))) return null;
  return mapUser(row);
}

export async function updateUser(
  id: string,
  patch: { nickname?: string; signature?: string }
): Promise<User | null> {
  await ensureSchema();
  if (patch.nickname !== undefined) {
    await pool.query("UPDATE users SET nickname = $1 WHERE id = $2", [
      patch.nickname,
      id,
    ]);
  }
  if (patch.signature !== undefined) {
    await pool.query("UPDATE users SET signature = $1 WHERE id = $2", [
      patch.signature,
      id,
    ]);
  }
  return getUser(id);
}

// ---------- activities ----------

export interface ActivityInput {
  title: string;
  category: string;
  description: string;
  location: string;
  start_time: number;
  end_time: number | null;
  deadline: number | null;
  target_participants: number | null;
  max_participants: number | null;
  expected_cost: string;
  cover: string;
  allow_tentative: boolean;
  allow_status_change: boolean;
  public_roster: boolean;
  /** 报名是否需要密码 */
  require_password: boolean;
  /** 明文密码；为空表示不设置（创建）或不修改（编辑） */
  password: string;
}

export async function getActivity(id: string): Promise<Activity | null> {
  await ensureSchema();
  const r = await pool.query("SELECT * FROM activities WHERE id = $1", [id]);
  return r.rows[0] ? mapActivity(r.rows[0]) : null;
}

export async function listActivities(): Promise<Activity[]> {
  await ensureSchema();
  const r = await pool.query("SELECT * FROM activities ORDER BY start_time ASC");
  return r.rows.map(mapActivity);
}

export async function createActivity(
  input: ActivityInput,
  creatorId: string
): Promise<Activity> {
  await ensureSchema();
  const id = randomUUID();
  const require_password = !!input.require_password;
  const password_hash = require_password ? hashPassword(input.password) : "";
  const r = await pool.query(
    `INSERT INTO activities
      (id, title, category, description, location, start_time, end_time, deadline,
       target_participants, max_participants, expected_cost, cover,
       allow_tentative, allow_status_change, public_roster, require_password, password_hash,
       status, creator_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'open',$18,$19)
     RETURNING *`,
    [
      id,
      input.title,
      input.category,
      input.description,
      input.location,
      input.start_time,
      input.end_time,
      input.deadline,
      input.target_participants,
      input.max_participants,
      input.expected_cost,
      input.cover,
      input.allow_tentative,
      input.allow_status_change,
      input.public_roster,
      require_password,
      password_hash,
      creatorId,
      Date.now(),
    ]
  );
  return mapActivity(r.rows[0]);
}

export async function updateActivity(
  id: string,
  patch: Partial<ActivityInput>
): Promise<Activity | null> {
  await ensureSchema();
  const existing = await getActivity(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };

  // 报名密码：留空则保留原密码；关闭开关则清空；开启且填写则更新。
  const raw = await pool.query(
    "SELECT password_hash FROM activities WHERE id = $1",
    [id]
  );
  let passwordHash = String(raw.rows[0]?.password_hash ?? "");
  if (next.require_password) {
    if (patch.password) passwordHash = hashPassword(patch.password);
  } else {
    passwordHash = "";
  }

  await pool.query(
    `UPDATE activities SET
      title=$1, category=$2, description=$3, location=$4, start_time=$5, end_time=$6,
      deadline=$7, target_participants=$8, max_participants=$9, expected_cost=$10,
      cover=$11, allow_tentative=$12, allow_status_change=$13, public_roster=$14,
      require_password=$15, password_hash=$16
     WHERE id=$17`,
    [
      next.title,
      next.category,
      next.description,
      next.location,
      next.start_time,
      next.end_time,
      next.deadline,
      next.target_participants,
      next.max_participants,
      next.expected_cost,
      next.cover,
      next.allow_tentative,
      next.allow_status_change,
      next.public_roster,
      next.require_password,
      passwordHash,
      id,
    ]
  );
  return getActivity(id);
}

export async function setActivityStatus(
  id: string,
  status: "open" | "cancelled"
): Promise<Activity | null> {
  await ensureSchema();
  await pool.query("UPDATE activities SET status = $1 WHERE id = $2", [status, id]);
  return getActivity(id);
}

export async function getActivityPasswordHash(id: string): Promise<string> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT password_hash FROM activities WHERE id = $1",
    [id]
  );
  return String(r.rows[0]?.password_hash ?? "");
}

export async function verifyActivityPassword(
  id: string,
  password: string
): Promise<boolean> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT password_hash FROM activities WHERE id = $1",
    [id]
  );
  const hash = String(r.rows[0]?.password_hash ?? "");
  if (!hash) return true;
  return verifyPassword(password, hash);
}

/** 永久删除活动及其所有报名记录（仅管理员）。 */
export async function deleteActivity(id: string): Promise<void> {
  await ensureSchema();
  await pool.query("DELETE FROM registrations WHERE activity_id = $1", [id]);
  await pool.query("DELETE FROM activities WHERE id = $1", [id]);
}

// ---------- registrations ----------

export interface RegistrationInput {
  participation_status: ParticipationStatus;
  probability: number;
  participant_count: number;
  remark: string;
}

export async function getRegistration(
  activityId: string,
  userId: string
): Promise<Registration | null> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT * FROM registrations WHERE activity_id = $1 AND user_id = $2",
    [activityId, userId]
  );
  return r.rows[0] ? mapRegistration(r.rows[0]) : null;
}

export async function listRegistrations(
  activityId: string
): Promise<Registration[]> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT * FROM registrations WHERE activity_id = $1 ORDER BY updated_at ASC",
    [activityId]
  );
  return r.rows.map(mapRegistration);
}

/** 一次性批量取多个活动的报名记录（避免 N+1 查询）。 */
export async function listRegistrationsForActivities(
  activityIds: string[]
): Promise<Record<string, Registration[]>> {
  await ensureSchema();
  const out: Record<string, Registration[]> = {};
  if (activityIds.length === 0) return out;
  const r = await pool.query(
    "SELECT * FROM registrations WHERE activity_id = ANY($1) ORDER BY updated_at ASC",
    [activityIds]
  );
  for (const row of r.rows) {
    const reg = mapRegistration(row);
    (out[reg.activity_id] ??= []).push(reg);
  }
  return out;
}

export async function upsertRegistration(
  activityId: string,
  userId: string,
  input: RegistrationInput
): Promise<Registration> {
  await ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  const r = await pool.query(
    `INSERT INTO registrations
      (id, activity_id, user_id, participation_status, probability, participant_count, remark, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (activity_id, user_id)
     DO UPDATE SET participation_status=$4, probability=$5, participant_count=$6, remark=$7, updated_at=$8
     RETURNING *`,
    [
      id,
      activityId,
      userId,
      input.participation_status,
      input.probability,
      input.participant_count,
      input.remark,
      now,
    ]
  );
  return mapRegistration(r.rows[0]);
}

export async function deleteRegistration(
  activityId: string,
  userId: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    "DELETE FROM registrations WHERE activity_id = $1 AND user_id = $2",
    [activityId, userId]
  );
}
