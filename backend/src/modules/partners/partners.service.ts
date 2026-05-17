import { pool } from "../../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface PartnerRegistration {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  businessName: string;
  address?: string;
}

export async function registerPartner(data: PartnerRegistration): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(data.password || "", 10);
    const [userRes]: any = await conn.query(
      `INSERT INTO users (uuid, email, password_hash, full_name, phone, user_type, status)
       VALUES (?, ?, ?, ?, ?, 'partner', 'active')`,
      [crypto.randomUUID(), data.email, hash, data.fullName, data.phone]
    );
    const userId = userRes.insertId;

    await conn.query(
      `INSERT INTO partner_profiles (user_id, business_name, address, kyc_status)
       VALUES (?, ?, ?, 'pending')`,
      [userId, data.businessName, data.address]
    );

    const [roleRows]: any = await conn.query("SELECT id FROM roles WHERE slug = 'partner' LIMIT 1");
    if (roleRows.length) {
      await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleRows[0].id]);
    }

    await conn.commit();
    return userId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getPartnerKYC(userId: number): Promise<any> {
  const [rows]: any = await pool.query(
    "SELECT kyc_status, reject_reason FROM partner_profiles WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] || { kyc_status: "pending" };
}
