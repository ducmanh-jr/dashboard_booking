import { pool } from "../db.js";

/**
 * Utility to create a notification in DB
 */
export async function createNotification(conn, { userId, type, title, body, data, entityType, entityId }) {
  const target = conn || pool;
  await target.query(
    `INSERT INTO notifications
     (user_id, type, channel, title, body, data, entity_type, entity_id, sent_at)
     VALUES (?, ?, 'in_app', ?, ?, CAST(? AS JSON), ?, ?, NOW())`,
    [
      userId,
      type,
      title,
      body || null,
      JSON.stringify(data || {}),
      entityType || null,
      entityId || null,
    ]
  );
}

/**
 * Notify all admin/staff users
 */
export async function notifyAdmins(conn, { type, title, body, data, entityType, entityId }) {
  const target = conn || pool;
  const [admins] = await target.query("SELECT id FROM users WHERE user_type = 'staff'");
  for (const admin of admins) {
    await createNotification(target, {
      userId: admin.id,
      type,
      title,
      body,
      data,
      entityType,
      entityId,
    });
  }
}
