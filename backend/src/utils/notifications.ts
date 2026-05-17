import { pool } from "../db.js";

export interface NotificationPayload {
  userId?: number | null;
  title: string;
  content: string;
  type?: string;
  targetId?: number | null;
}

export async function createNotification(data: NotificationPayload): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, title, body, type, entity_id, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [data.userId || null, data.title, data.content, data.type || "system", data.targetId || null]
  );
}

export async function notifyAdmins(data: Omit<NotificationPayload, "userId">): Promise<void> {
  const [admins]: any = await pool.query(
    `SELECT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
      WHERE r.slug = 'admin'`
  );
  
  for (const admin of admins) {
    await createNotification({ ...data, userId: admin.id });
  }
}
