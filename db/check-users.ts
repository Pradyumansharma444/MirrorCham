import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(
    "mysql://NyQq2wf7Ys6pog5.root:QIWU4bvohYXRS86mqfCH1xQA4qSjHr8c@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19ecc90e-ed12-8386-8000-093024aca994"
  );

  const [rows] = await conn.execute(
    "SHOW CREATE TABLE users"
  );
  console.log(JSON.stringify(rows, null, 2));

  await conn.end();
}

check().catch(console.error);
