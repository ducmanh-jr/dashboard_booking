const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://nowayhome:nowayhome@localhost:5432/nowayhome?schema=public"
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('Tables in public schema:');
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}

run().catch(console.error);
