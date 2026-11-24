// PostgreSQL data layer (Supabase) built on `pg`.
// SERVER ONLY — do not import this module from client components.

import { Pool } from "pg";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type {
  User,
  Activity,
  Registration,
  ParticipationStatus,
  Group,
  GroupSummary,
  GroupMemberView,
  GroupInvite,
  CreditEntry,
  TitleRuleDTO,
  MyMembership,
  PendingSettlement,
  Visibility,
  SettlementStatus,
  TitleTag,
  AdminGroup,
} from "./types";
import { CREDIT_CONFIG, DEFAULT_TITLES, round1 } from "./config";
import { titleForScore, type TitleRule } from "./titles";

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

// Transaction-pooler friendly. max>1 allows independent queries to run in parallel.
const globalForDb = globalThis as unknown as {
  __ptPool?: Pool;
  __ptSchemaPromise?: Promise<void>;
};

export const pool: Pool =
  globalForDb.__ptPool ??
  (globalForDb.__ptPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  }));

// Idempotent + concurrency-safe: the DDL runs once per server process,
// shared across all route bundles (Next.js dev duplicates modules per route).
function ensureSchema(): Promise<void> {
  if (!globalForDb.__ptSchemaPromise) {
    globalForDb.__ptSchemaPromise = (async () => {
      await pool.query(SCHEMA);
      await ensureAdmin();
    })().catch((e) => {
      // allow a retry after a transient failure
      globalForDb.__ptSchemaPromise = undefined;
      throw e;
    });
  }
  return globalForDb.__ptSchemaPromise;
}

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
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_id TEXT;
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'group';
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS settlement_status TEXT;
  ALTER TABLE activities ADD COLUMN IF NOT EXISTS settled_at BIGINT;
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

  -- V2: 团体组织
  CREATE TABLE IF NOT EXISTS app_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    announcement TEXT NOT NULL DEFAULT '',
    owner_id TEXT NOT NULL,
    default_invite_code TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    credit_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    leave_until BIGINT,
    leave_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at BIGINT NOT NULL,
    UNIQUE(group_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS group_invites (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    expires_at BIGINT,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credit_ledger (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    activity_id TEXT,
    change_amount DOUBLE PRECISION NOT NULL,
    balance_after DOUBLE PRECISION NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS title_rules (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    min_score DOUBLE PRECISION NOT NULL,
    max_score DOUBLE PRECISION,
    title_name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS activity_attendance (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    attendance_status TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    UNIQUE(activity_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members(group_id);
  CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_gi_code ON group_invites(invite_code);
  CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id, group_id);
  CREATE INDEX IF NOT EXISTS idx_att_activity ON activity_attendance(activity_id);
  CREATE INDEX IF NOT EXISTS idx_tr_group ON title_rules(group_id);
  CREATE INDEX IF NOT EXISTS idx_act_group ON activities(group_id);
`;

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
    group_id: r.group_id == null ? null : String(r.group_id),
    visibility: (r.visibility === "public" ? "public" : "group") as Visibility,
    settlement_status: (r.settlement_status ?? null) as SettlementStatus | null,
    settled_at: r.settled_at == null ? null : Number(r.settled_at),
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
  /** 所属团体；null = 全站独立活动 */
  group_id: string | null;
  /** 可见范围 */
  visibility: Visibility;
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
  const group_id = input.group_id || null;
  const visibility: Visibility = group_id
    ? input.visibility === "public"
      ? "public"
      : "group"
    : "public";
  const r = await pool.query(
    `INSERT INTO activities
      (id, title, category, description, location, start_time, end_time, deadline,
       target_participants, max_participants, expected_cost, cover,
       allow_tentative, allow_status_change, public_roster, require_password, password_hash,
       group_id, visibility, status, creator_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'open',$20,$21)
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
      group_id,
      visibility,
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

  const group_id = next.group_id || null;
  const visibility: Visibility = group_id
    ? next.visibility === "public"
      ? "public"
      : "group"
    : "public";

  await pool.query(
    `UPDATE activities SET
      title=$1, category=$2, description=$3, location=$4, start_time=$5, end_time=$6,
      deadline=$7, target_participants=$8, max_participants=$9, expected_cost=$10,
      cover=$11, allow_tentative=$12, allow_status_change=$13, public_roster=$14,
      require_password=$15, password_hash=$16, group_id=$17, visibility=$18
     WHERE id=$19`,
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
      group_id,
      visibility,
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

/** 永久删除活动及其所有报名/出勤记录（仅管理员）。积分流水保留以便追溯。 */
export async function deleteActivity(id: string): Promise<void> {
  await ensureSchema();
  await pool.query("DELETE FROM activity_attendance WHERE activity_id = $1", [id]);
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

// ============================================================
// V2: 团体组织 / 信用积分 / 出勤结算
// ============================================================

function genInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/** 当前用户可见的活动：全站独立活动 + 公开活动 + 本人所在团体的私有活动；Admin 全部。 */
export async function listVisibleActivities(
  uid: string | null,
  isAdmin: boolean
): Promise<Activity[]> {
  await ensureSchema();
  const r = await pool.query(
    `SELECT a.* FROM activities a
     WHERE $2::boolean = TRUE
        OR a.group_id IS NULL
        OR a.visibility = 'public'
        OR ($1::text IS NOT NULL AND EXISTS (
              SELECT 1 FROM group_members gm
              WHERE gm.group_id = a.group_id AND gm.user_id = $1 AND gm.status = 'active'
           ))
     ORDER BY a.start_time ASC`,
    [uid, isAdmin]
  );
  return r.rows.map(mapActivity);
}

// ---------- title rules ----------

async function titleRulesByGroup(
  groupIds: string[]
): Promise<Map<string, TitleRule[]>> {
  const out = new Map<string, TitleRule[]>();
  for (const id of groupIds) out.set(id, []);
  if (groupIds.length === 0) return out;
  const r = await pool.query(
    `SELECT group_id, min_score, max_score, title_name, emoji
     FROM title_rules WHERE group_id = ANY($1)
     ORDER BY sort_order ASC, min_score ASC`,
    [groupIds]
  );
  for (const row of r.rows) {
    const gid = String(row.group_id);
    const arr = out.get(gid) ?? [];
    arr.push({
      min: Number(row.min_score),
      max: row.max_score == null ? null : Number(row.max_score),
      name: String(row.title_name),
      emoji: String(row.emoji),
    });
    out.set(gid, arr);
  }
  for (const [gid, arr] of out) {
    if (arr.length === 0) out.set(gid, DEFAULT_TITLES);
  }
  return out;
}

export async function getTitleRulesForGroup(
  groupId: string
): Promise<TitleRule[]> {
  await ensureSchema();
  const map = await titleRulesByGroup([groupId]);
  return map.get(groupId) ?? DEFAULT_TITLES;
}

export async function saveTitleRules(
  groupId: string,
  rules: TitleRule[],
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0] || String(g.rows[0].owner_id) !== actorId)
    return { error: "只有会长可以修改称号" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM title_rules WHERE group_id=$1", [groupId]);
    for (let i = 0; i < rules.length; i++) {
      const t = rules[i];
      await client.query(
        `INSERT INTO title_rules (id,group_id,min_score,max_score,title_name,emoji,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), groupId, t.min, t.max, t.name, t.emoji, i]
      );
    }
    await client.query("COMMIT");
    return { ok: true };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return { error: "保存失败，请重试" };
  } finally {
    client.release();
  }
}

// ---------- groups ----------

function mapGroup(r: Row, uid: string, rules: TitleRule[]): Group {
  const score = Number(r.credit_score ?? CREDIT_CONFIG.INITIAL_SCORE);
  const leaveUntil = r.leave_until == null ? null : Number(r.leave_until);
  return {
    id: String(r.id),
    name: String(r.name),
    avatar: String(r.avatar ?? ""),
    description: String(r.description ?? ""),
    announcement: String(r.announcement ?? ""),
    owner_id: String(r.owner_id),
    created_at: Number(r.created_at),
    member_count: Number(r.member_count ?? 0),
    my_role: String(r.owner_id) === uid ? "owner" : "member",
    my_score: score,
    my_title: titleForScore(score, rules),
    on_leave: leaveUntil != null && leaveUntil > Date.now(),
    leave_title: String(r.leave_title ?? ""),
    leave_until: leaveUntil,
  };
}

const GROUP_SELECT = `
  SELECT g.*, gm.credit_score, gm.leave_until, gm.leave_title,
         (SELECT count(*)::int FROM group_members m
          WHERE m.group_id = g.id AND m.status = 'active') AS member_count
  FROM app_groups g
  JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1 AND gm.status = 'active'
`;

export async function listGroupsForUser(userId: string): Promise<Group[]> {
  await ensureSchema();
  const r = await pool.query(`${GROUP_SELECT} ORDER BY g.created_at ASC`, [userId]);
  const rulesMap = await titleRulesByGroup(r.rows.map((row) => String(row.id)));
  return r.rows.map((row) =>
    mapGroup(row, userId, rulesMap.get(String(row.id)) ?? DEFAULT_TITLES)
  );
}

export async function getGroupForUser(
  groupId: string,
  userId: string
): Promise<Group | null> {
  await ensureSchema();
  const r = await pool.query(`${GROUP_SELECT} WHERE g.id = $2`, [userId, groupId]);
  if (!r.rows[0]) return null;
  const rules = await getTitleRulesForGroup(groupId);
  return mapGroup(r.rows[0], userId, rules);
}

export async function getGroupSummary(id: string): Promise<GroupSummary | null> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT id, name, avatar FROM app_groups WHERE id=$1",
    [id]
  );
  return r.rows[0]
    ? {
        id: String(r.rows[0].id),
        name: String(r.rows[0].name),
        avatar: String(r.rows[0].avatar ?? ""),
      }
    : null;
}

/** 批量取团体摘要（避免列表 N+1）。 */
export async function getGroupSummaries(
  ids: string[]
): Promise<Map<string, GroupSummary>> {
  await ensureSchema();
  const map = new Map<string, GroupSummary>();
  if (ids.length === 0) return map;
  const r = await pool.query(
    "SELECT id, name, avatar FROM app_groups WHERE id = ANY($1)",
    [ids]
  );
  for (const row of r.rows) {
    map.set(String(row.id), {
      id: String(row.id),
      name: String(row.name),
      avatar: String(row.avatar ?? ""),
    });
  }
  return map;
}

/** 批量取团体会长（用于列表判断可结算权限）。 */
export async function getGroupOwners(
  ids: string[]
): Promise<Map<string, string>> {
  await ensureSchema();
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const r = await pool.query(
    "SELECT id, owner_id FROM app_groups WHERE id = ANY($1)",
    [ids]
  );
  for (const row of r.rows) map.set(String(row.id), String(row.owner_id));
  return map;
}

export interface GroupCreateInput {
  name: string;
  description: string;
  announcement: string;
  avatar: string;
}

export async function createGroup(
  input: GroupCreateInput,
  ownerId: string
): Promise<Group> {
  await ensureSchema();
  const id = randomUUID();
  const now = Date.now();
  const code = genInviteCode();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO app_groups (id,name,avatar,description,announcement,owner_id,default_invite_code,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, input.name, input.avatar, input.description, input.announcement, ownerId, code, now]
    );
    await client.query(
      `INSERT INTO group_members (id,group_id,user_id,credit_score,status,joined_at)
       VALUES ($1,$2,$3,$4,'active',$5)`,
      [randomUUID(), id, ownerId, CREDIT_CONFIG.INITIAL_SCORE, now]
    );
    await client.query(
      `INSERT INTO group_invites (id,group_id,invite_code,used_count,enabled,created_at)
       VALUES ($1,$2,$3,0,TRUE,$4)`,
      [randomUUID(), id, code, now]
    );
    for (let i = 0; i < DEFAULT_TITLES.length; i++) {
      const t = DEFAULT_TITLES[i];
      await client.query(
        `INSERT INTO title_rules (id,group_id,min_score,max_score,title_name,emoji,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [randomUUID(), id, t.min, t.max, t.name, t.emoji, i]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
  return (await getGroupForUser(id, ownerId))!;
}

export async function joinGroupByCode(
  code: string,
  userId: string
): Promise<{ group: Group } | { error: string }> {
  await ensureSchema();
  const inv = await pool.query(
    "SELECT * FROM group_invites WHERE invite_code=$1 AND enabled=TRUE LIMIT 1",
    [code.trim().toUpperCase()]
  );
  if (!inv.rows[0]) return { error: "邀请码无效或已失效" };
  const invite = inv.rows[0];
  const now = Date.now();
  if (invite.expires_at != null && Number(invite.expires_at) < now)
    return { error: "邀请码已过期" };
  if (
    invite.max_uses != null &&
    Number(invite.used_count) >= Number(invite.max_uses)
  )
    return { error: "邀请码使用次数已达上限" };

  const groupId = String(invite.group_id);
  const existing = await pool.query(
    "SELECT status FROM group_members WHERE group_id=$1 AND user_id=$2",
    [groupId, userId]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].status === "active")
      return { error: "你已经加入该团体" };
    await pool.query(
      "UPDATE group_members SET status='active' WHERE group_id=$1 AND user_id=$2",
      [groupId, userId]
    );
  } else {
    await pool.query(
      `INSERT INTO group_members (id,group_id,user_id,credit_score,status,joined_at)
       VALUES ($1,$2,$3,$4,'active',$5)`,
      [randomUUID(), groupId, userId, CREDIT_CONFIG.INITIAL_SCORE, now]
    );
  }
  await pool.query(
    "UPDATE group_invites SET used_count = used_count + 1 WHERE id=$1",
    [invite.id]
  );
  const group = await getGroupForUser(groupId, userId);
  if (!group) return { error: "加入失败，请重试" };
  return { group };
}

export async function listGroupMembers(
  groupId: string
): Promise<GroupMemberView[]> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0]) return [];
  const ownerId = String(g.rows[0].owner_id);
  const r = await pool.query(
    `SELECT gm.user_id, gm.credit_score, gm.leave_until, gm.leave_title, gm.joined_at,
            u.id, u.nickname, u.signature, u.avatar, u.color, u.is_admin, u.created_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id=$1 AND gm.status='active'
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  const rules = await getTitleRulesForGroup(groupId);
  return r.rows.map((row) => {
    const score = Number(row.credit_score);
    const leaveUntil = row.leave_until == null ? null : Number(row.leave_until);
    return {
      user: mapUser(row),
      score,
      title: titleForScore(score, rules),
      on_leave: leaveUntil != null && leaveUntil > Date.now(),
      leave_title: String(row.leave_title ?? ""),
      leave_until: leaveUntil,
      is_owner: String(row.user_id) === ownerId,
      joined_at: Number(row.joined_at),
    };
  });
}

export async function isGroupMember(
  groupId: string,
  userId: string
): Promise<boolean> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active' LIMIT 1",
    [groupId, userId]
  );
  return r.rows.length > 0;
}

export async function isGroupOwner(
  groupId: string,
  userId: string
): Promise<boolean> {
  await ensureSchema();
  const r = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  return r.rows[0] ? String(r.rows[0].owner_id) === userId : false;
}

export async function removeGroupMember(
  groupId: string,
  userId: string,
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0]) return { error: "团体不存在" };
  const ownerId = String(g.rows[0].owner_id);
  if (userId === ownerId) return { error: "会长不能直接退出，请先转让会长" };
  if (ownerId !== actorId && userId !== actorId)
    return { error: "没有权限移除该成员" };
  await pool.query(
    "UPDATE group_members SET status='removed' WHERE group_id=$1 AND user_id=$2 AND status='active'",
    [groupId, userId]
  );
  return { ok: true };
}

export async function transferOwnership(
  groupId: string,
  newOwnerId: string,
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0] || String(g.rows[0].owner_id) !== actorId)
    return { error: "只有会长可以转让" };
  const m = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2 AND status='active'",
    [groupId, newOwnerId]
  );
  if (!m.rows[0]) return { error: "该成员不在团体中" };
  await pool.query("UPDATE app_groups SET owner_id=$1 WHERE id=$2", [
    newOwnerId,
    groupId,
  ]);
  return { ok: true };
}

export async function setMemberLeave(
  groupId: string,
  userId: string,
  leaveUntil: number | null,
  leaveTitle: string,
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0]) return { error: "团体不存在" };
  const isOwner = String(g.rows[0].owner_id) === actorId;
  if (!isOwner && userId !== actorId) return { error: "没有权限" };
  await pool.query(
    "UPDATE group_members SET leave_until=$1, leave_title=$2 WHERE group_id=$3 AND user_id=$4",
    [leaveUntil, leaveTitle.slice(0, 20), groupId, userId]
  );
  return { ok: true };
}

export async function listGroupInvites(
  groupId: string
): Promise<GroupInvite[]> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT * FROM group_invites WHERE group_id=$1 ORDER BY created_at DESC",
    [groupId]
  );
  return r.rows.map(mapInvite);
}

function mapInvite(row: Row): GroupInvite {
  return {
    id: String(row.id),
    group_id: String(row.group_id),
    code: String(row.invite_code),
    expires_at: row.expires_at == null ? null : Number(row.expires_at),
    max_uses: row.max_uses == null ? null : Number(row.max_uses),
    used_count: Number(row.used_count),
    enabled: !!row.enabled,
    created_at: Number(row.created_at),
  };
}

export async function createInvite(
  groupId: string,
  actorId: string,
  opts: { expiresInHours?: number | null; maxUses?: number | null }
): Promise<GroupInvite | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0] || String(g.rows[0].owner_id) !== actorId)
    return { error: "只有会长可以生成邀请码" };

  const now = Date.now();
  const expires_at =
    opts.expiresInHours != null ? now + opts.expiresInHours * 3600 * 1000 : null;
  const max_uses = opts.maxUses ?? null;

  for (let i = 0; i < 5; i++) {
    const code = genInviteCode();
    try {
      const r = await pool.query(
        `INSERT INTO group_invites (id,group_id,invite_code,expires_at,max_uses,used_count,enabled,created_at)
         VALUES ($1,$2,$3,$4,$5,0,TRUE,$6) RETURNING *`,
        [randomUUID(), groupId, code, expires_at, max_uses, now]
      );
      return mapInvite(r.rows[0]);
    } catch (e: any) {
      if (e?.code === "23505") continue;
      throw e;
    }
  }
  return { error: "生成邀请码失败，请重试" };
}

export async function setInviteEnabled(
  inviteId: string,
  groupId: string,
  enabled: boolean,
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0] || String(g.rows[0].owner_id) !== actorId)
    return { error: "只有会长可以操作邀请码" };
  await pool.query(
    "UPDATE group_invites SET enabled=$1 WHERE id=$2 AND group_id=$3",
    [enabled, inviteId, groupId]
  );
  return { ok: true };
}

// ---------- credits ----------

export function canSettleActivity(
  activity: Activity,
  uid: string | null,
  isAdmin: boolean
): boolean {
  if (!uid) return false;
  if (isAdmin) return true;
  return activity.creator_id === uid;
}

export async function listCreditLedger(
  userId: string,
  groupId?: string
): Promise<CreditEntry[]> {
  await ensureSchema();
  const params: any[] = [userId];
  let sql = `SELECT l.*, a.title AS activity_title
             FROM credit_ledger l
             LEFT JOIN activities a ON a.id = l.activity_id
             WHERE l.user_id = $1`;
  if (groupId) {
    params.push(groupId);
    sql += " AND l.group_id = $2";
  }
  sql += " ORDER BY l.created_at DESC LIMIT 100";
  const r = await pool.query(sql, params);
  return r.rows.map((row) => ({
    id: String(row.id),
    group_id: String(row.group_id),
    user_id: String(row.user_id),
    activity_id: row.activity_id == null ? null : String(row.activity_id),
    activity_title:
      row.activity_title == null ? null : String(row.activity_title),
    change_amount: Number(row.change_amount),
    balance_after: Number(row.balance_after),
    reason: String(row.reason ?? ""),
    created_at: Number(row.created_at),
  }));
}

// ---------- pending settlement ----------

export async function listPendingSettlementsForUser(
  userId: string
): Promise<PendingSettlement[]> {
  await ensureSchema();
  const r = await pool.query(
    `SELECT a.id, a.title, a.start_time, a.end_time, a.group_id, g.name AS group_name,
            (SELECT count(*)::int FROM registrations r
             WHERE r.activity_id = a.id AND r.participation_status <> 'declined') AS signup_count
     FROM activities a
     LEFT JOIN app_groups g ON g.id = a.group_id
     WHERE a.creator_id = $1
       AND a.group_id IS NOT NULL
       AND a.status <> 'cancelled'
       AND a.settlement_status IS NULL
       AND a.end_time IS NOT NULL
       AND a.end_time < $2
       AND EXISTS (SELECT 1 FROM registrations r
                   WHERE r.activity_id = a.id AND r.participation_status <> 'declined')
     ORDER BY a.end_time ASC`,
    [userId, Date.now()]
  );
  return r.rows.map((row) => ({
    activity_id: String(row.id),
    title: String(row.title),
    start_time: Number(row.start_time),
    end_time: row.end_time == null ? null : Number(row.end_time),
    signup_count: Number(row.signup_count),
    group_id: row.group_id == null ? null : String(row.group_id),
    group_name: row.group_name == null ? null : String(row.group_name),
  }));
}

export async function hasPendingSettlement(userId: string): Promise<boolean> {
  const list = await listPendingSettlementsForUser(userId);
  return list.length > 0;
}

// ---------- attendance & settlement ----------

export async function listAttendance(
  activityId: string
): Promise<Map<string, "attended" | "absent">> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT user_id, attendance_status FROM activity_attendance WHERE activity_id=$1",
    [activityId]
  );
  const map = new Map<string, "attended" | "absent">();
  for (const row of r.rows)
    map.set(
      String(row.user_id),
      row.attendance_status === "attended" ? "attended" : "absent"
    );
  return map;
}

export interface AttendanceInput {
  user_id: string;
  attendance_status: "attended" | "absent";
}

export interface CreditChange {
  user_id: string;
  delta: number;
  balance: number;
  reason: string;
}

/**
 * 结算一场团体活动：写入出勤、按规则计算积分、更新成员积分并写流水。
 * 幂等：已结算 / 未成行 / 已取消的活动拒绝重复结算。
 */
export async function settleActivity(
  activityId: string,
  attendance: AttendanceInput[],
  submittedBy: string
): Promise<
  { ok: true; changes: CreditChange[] } | { error: string }
> {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const aRes = await client.query(
      "SELECT * FROM activities WHERE id=$1 FOR UPDATE",
      [activityId]
    );
    if (!aRes.rows[0]) {
      await client.query("ROLLBACK");
      return { error: "活动不存在" };
    }
    const activity = mapActivity(aRes.rows[0]);
    if (!activity.group_id) {
      await client.query("ROLLBACK");
      return { error: "该活动不属于团体，无需结算" };
    }
    if (activity.settlement_status) {
      await client.query("ROLLBACK");
      return { error: "该活动已结算" };
    }
    if (activity.status === "cancelled") {
      await client.query("ROLLBACK");
      return { error: "已取消的活动不能结算" };
    }

    const regRes = await client.query(
      "SELECT * FROM registrations WHERE activity_id=$1",
      [activityId]
    );
    const regs = regRes.rows.map(mapRegistration);
    const memRes = await client.query(
      "SELECT user_id, credit_score FROM group_members WHERE group_id=$1 AND status='active'",
      [activity.group_id]
    );
    const scores = new Map<string, number>(
      memRes.rows.map((r) => [String(r.user_id), Number(r.credit_score)])
    );
    const attMap = new Map<string, "attended" | "absent">(
      attendance.map((a) => [a.user_id, a.attendance_status])
    );
    const now = Date.now();
    const changes: CreditChange[] = [];

    for (const reg of regs) {
      if (reg.participation_status === "declined") continue;
      const status = attMap.get(reg.user_id);
      if (!status) continue;

      await client.query(
        `INSERT INTO activity_attendance (id,activity_id,user_id,attendance_status,submitted_by,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (activity_id,user_id)
         DO UPDATE SET attendance_status=$4, submitted_by=$5, updated_at=$6`,
        [randomUUID(), activityId, reg.user_id, status, submittedBy, now]
      );

      const prev = scores.get(reg.user_id);
      if (prev == null) continue; // 非本团体成员：记录出勤但不计积分

      const p =
        reg.participation_status === "going"
          ? 1
          : (reg.probability ?? 50) / 100;
      const raw =
        status === "attended"
          ? CREDIT_CONFIG.BASE_REWARD * p
          : -CREDIT_CONFIG.BASE_REWARD * CREDIT_CONFIG.PENALTY_RATIO * p;
      const delta = round1(raw);
      if (delta === 0) continue;

      const nextScore = Math.max(
        CREDIT_CONFIG.MIN_SCORE,
        round1(prev + delta)
      );
      const actual = round1(nextScore - prev);
      if (actual === 0) continue;
      scores.set(reg.user_id, nextScore);

      await client.query(
        "UPDATE group_members SET credit_score=$1 WHERE group_id=$2 AND user_id=$3",
        [nextScore, activity.group_id, reg.user_id]
      );
      const reason = `${status === "attended" ? "参加活动" : "缺席活动"} · ${activity.title}`;
      await client.query(
        `INSERT INTO credit_ledger (id,group_id,user_id,activity_id,change_amount,balance_after,reason,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [randomUUID(), activity.group_id, reg.user_id, activityId, actual, nextScore, reason, now]
      );
      changes.push({
        user_id: reg.user_id,
        delta: actual,
        balance: nextScore,
        reason,
      });
    }

    // 组织者额外奖励（仅当组织者为该团体有效成员）
    const organizerPrev = scores.get(activity.creator_id);
    if (organizerPrev != null) {
      const nextScore = Math.max(
        CREDIT_CONFIG.MIN_SCORE,
        round1(organizerPrev + CREDIT_CONFIG.ORGANIZER_BONUS)
      );
      const actual = round1(nextScore - organizerPrev);
      if (actual !== 0) {
        scores.set(activity.creator_id, nextScore);
        await client.query(
          "UPDATE group_members SET credit_score=$1 WHERE group_id=$2 AND user_id=$3",
          [nextScore, activity.group_id, activity.creator_id]
        );
        const reason = `组织活动奖励 · ${activity.title}`;
        await client.query(
          `INSERT INTO credit_ledger (id,group_id,user_id,activity_id,change_amount,balance_after,reason,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [randomUUID(), activity.group_id, activity.creator_id, activityId, actual, nextScore, reason, now]
        );
        changes.push({
          user_id: activity.creator_id,
          delta: actual,
          balance: nextScore,
          reason,
        });
      }
    }

    await client.query(
      "UPDATE activities SET settlement_status='settled', settled_at=$1 WHERE id=$2",
      [now, activityId]
    );
    await client.query("COMMIT");
    return { ok: true, changes };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return { error: "结算失败，请稍后重试" };
  } finally {
    client.release();
  }
}

/** 一键标记「活动未成行 / 取消」：全员不加分也不扣分。 */
export async function markActivityNotHeld(
  activityId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const a = await getActivity(activityId);
  if (!a) return { error: "活动不存在" };
  if (a.settlement_status) return { error: "该活动已结算" };
  if (!a.group_id) return { error: "该活动不属于团体" };
  await pool.query(
    "UPDATE activities SET settlement_status='not_held', settled_at=$1 WHERE id=$2",
    [Date.now(), activityId]
  );
  return { ok: true };
}

/**
 * 解析名单成员的称号：
 * - 团体活动：使用该团体自定义称号 + 成员在该团体的积分；
 * - 全站独立/公开活动：取成员「最高积分团体」的默认称号。
 */
export async function rosterTitles(
  activity: Activity,
  userIds: string[]
): Promise<Map<string, { title: TitleTag; score: number | null }>> {
  const out = new Map<string, { title: TitleTag; score: number | null }>();
  if (userIds.length === 0) return out;

  if (activity.group_id) {
    const rules = await getTitleRulesForGroup(activity.group_id);
    const r = await pool.query(
      "SELECT user_id, credit_score FROM group_members WHERE group_id=$1 AND status='active' AND user_id = ANY($2)",
      [activity.group_id, userIds]
    );
    for (const row of r.rows) {
      const score = Number(row.credit_score);
      out.set(String(row.user_id), {
        title: titleForScore(score, rules),
        score,
      });
    }
  } else {
    const r = await pool.query(
      `SELECT user_id, MAX(credit_score) AS best
       FROM group_members WHERE status='active' AND user_id = ANY($1)
       GROUP BY user_id`,
      [userIds]
    );
    for (const row of r.rows) {
      const score = Number(row.best);
      out.set(String(row.user_id), {
        title: titleForScore(score, DEFAULT_TITLES),
        score: null,
      });
    }
  }
  return out;
}

// ---------- group activities & profile ----------

export async function listGroupActivities(
  groupId: string
): Promise<Activity[]> {
  await ensureSchema();
  const r = await pool.query(
    "SELECT * FROM activities WHERE group_id=$1 ORDER BY start_time ASC",
    [groupId]
  );
  return r.rows.map(mapActivity);
}

export async function updateGroup(
  groupId: string,
  patch: {
    name?: string;
    description?: string;
    announcement?: string;
    avatar?: string;
  },
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query("SELECT owner_id FROM app_groups WHERE id=$1", [
    groupId,
  ]);
  if (!g.rows[0] || String(g.rows[0].owner_id) !== actorId)
    return { error: "只有会长可以修改团体信息" };

  const sets: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (patch.name !== undefined) {
    sets.push(`name=$${i++}`);
    params.push(patch.name.slice(0, 30));
  }
  if (patch.description !== undefined) {
    sets.push(`description=$${i++}`);
    params.push(patch.description.slice(0, 500));
  }
  if (patch.announcement !== undefined) {
    sets.push(`announcement=$${i++}`);
    params.push(patch.announcement.slice(0, 1000));
  }
  if (patch.avatar !== undefined) {
    sets.push(`avatar=$${i++}`);
    params.push(patch.avatar.slice(0, 16));
  }
  if (sets.length === 0) return { ok: true };
  params.push(groupId);
  await pool.query(
    `UPDATE app_groups SET ${sets.join(", ")} WHERE id=$${i}`,
    params
  );
  return { ok: true };
}

/** 管理员视角：列出全部团体（不要求管理员是成员）。 */
export async function listAllGroups(): Promise<AdminGroup[]> {
  await ensureSchema();
  const r = await pool.query(
    `SELECT g.id, g.name, g.avatar, g.description, g.owner_id, g.created_at,
            u.nickname AS owner_nickname,
            (SELECT count(*)::int FROM group_members m
             WHERE m.group_id = g.id AND m.status = 'active') AS member_count
     FROM app_groups g
     LEFT JOIN users u ON u.id = g.owner_id
     ORDER BY g.created_at ASC`
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    avatar: String(row.avatar ?? ""),
    description: String(row.description ?? ""),
    owner_id: String(row.owner_id),
    owner_nickname: String(row.owner_nickname ?? "未知"),
    member_count: Number(row.member_count),
    created_at: Number(row.created_at),
  }));
}

/**
 * 解散/删除团体（仅会长或管理员）。
 * 级联删除：团体活动及报名/出勤、成员积分与积分流水、邀请码、称号规则、成员关系、团体本身。
 * 操作不可恢复；不影响其他团体的数据。
 */
export async function deleteGroup(
  groupId: string,
  actorId: string
): Promise<{ ok: true } | { error: string }> {
  await ensureSchema();
  const g = await pool.query(
    "SELECT owner_id, name FROM app_groups WHERE id=$1",
    [groupId]
  );
  if (!g.rows[0]) return { error: "团体不存在" };
  const actor = await getUser(actorId);
  const isAdmin = !!actor?.is_admin;
  const isOwner = String(g.rows[0].owner_id) === actorId;
  if (!isAdmin && !isOwner)
    return { error: "只有会长或管理员可以删除团体" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM activity_attendance WHERE activity_id IN (SELECT id FROM activities WHERE group_id=$1)",
      [groupId]
    );
    await client.query(
      "DELETE FROM registrations WHERE activity_id IN (SELECT id FROM activities WHERE group_id=$1)",
      [groupId]
    );
    await client.query("DELETE FROM credit_ledger WHERE group_id=$1", [groupId]);
    await client.query("DELETE FROM activities WHERE group_id=$1", [groupId]);
    await client.query("DELETE FROM title_rules WHERE group_id=$1", [groupId]);
    await client.query("DELETE FROM group_invites WHERE group_id=$1", [groupId]);
    await client.query("DELETE FROM group_members WHERE group_id=$1", [groupId]);
    await client.query("DELETE FROM app_groups WHERE id=$1", [groupId]);
    await client.query("COMMIT");
    return { ok: true };
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return { error: "删除失败，请稍后重试" };
  } finally {
    client.release();
  }
}

