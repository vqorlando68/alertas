const oracledb = require("oracledb");
const fs = require('fs');

async function compilePackage() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
    
    console.log("Connected to DB. Starting compilation...");
    const sqlFile = fs.readFileSync('pkgln_alertas.sql', 'utf-8');
    const blocks = sqlFile.split('/').filter(b => b.trim().length > 0);

    for (let block of blocks) {
      block = block.trim();
      if (block) {
        try {
          await connection.execute(block);
        } catch (err) {
          console.error("COMPILATION ERROR in block:\n", block.substring(0, 100));
          console.error(err.message);
        }
      }
    }

    // Check for errors in user_errors
    const res = await connection.execute(
      `SELECT name, line, position, text FROM user_errors WHERE name = 'PKGLN_ALERTAS' AND type IN ('PACKAGE', 'PACKAGE BODY') ORDER BY type, line`
    );
    if (res.rows.length > 0) {
      console.log("\n--- COMPILATION WARNINGS/ERRORS ---");
      res.rows.forEach(row => {
        console.log(`[${row.NAME}] Line ${row.LINE}, Pos ${row.POSITION}: ${row.TEXT}`);
      });
    } else {
      console.log("\nPackage compiled successfully with no errors in user_errors.");
    }
    
  } catch (err) {
    console.error("FATAL ERROR: ", err.message);
  } finally {
    if (connection) {
      await connection.close();
    }
    process.exit(0);
  }
}

compilePackage();
