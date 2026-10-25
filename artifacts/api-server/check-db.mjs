import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();

  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log(result.rows.map(row => row.table_name).join("\n"));
} catch (error) {
  console.error(error.message);
} finally {
  await client.end();
}
