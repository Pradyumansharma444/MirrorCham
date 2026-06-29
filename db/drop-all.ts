import mysql from "mysql2/promise";

async function dropAll() {
  const conn = await mysql.createConnection(
    "mysql://NyQq2wf7Ys6pog5.root:QIWU4bvohYXRS86mqfCH1xQA4qSjHr8c@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19ecc90e-ed12-8386-8000-093024aca994"
  );

  const tables = [
    "leaderboard_entries",
    "user_badges",
    "sessions",
    "user_profiles",
    "badges",
  ];

  for (const table of tables) {
    try {
      await conn.execute(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Dropped ${table}`);
    } catch (e: any) {
      console.log(`Error dropping ${table}:`, e.message);
    }
  }

  await conn.end();
  console.log("All tables dropped!");
}

dropAll().catch(console.error);
