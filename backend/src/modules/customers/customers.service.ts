import { pool } from "../../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface CustomerRegistration {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
}

export async function registerCustomer(data: CustomerRegistration): Promise<number> {
  const hash = await bcrypt.hash(data.password || "", 10);
  const [res]: any = await pool.query(
    `INSERT INTO users (uuid, email, password_hash, full_name, phone, user_type, status)
     VALUES (?, ?, ?, ?, ?, 'customer', 'active')`,
    [crypto.randomUUID(), data.email, hash, data.fullName, data.phone]
  );
  
  const userId = res.insertId;
  const [roleRows]: any = await pool.query("SELECT id FROM roles WHERE slug = 'customer' LIMIT 1");
  if (roleRows.length) {
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleRows[0].id]);
  }
  
  return userId;
}
