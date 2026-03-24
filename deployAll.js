const oracledb = require("oracledb");
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim().replace(/\\/g, '');
  }
});

async function runSQL() {
  let pool;
  let connection;
  try {
    pool = await oracledb.createPool({
      user: envVars['DB_USER'],
      password: envVars['DB_PASSWORD'],
      connectString: envVars['DB_CONNECTION_STRING'],
      poolMin: 1,
      poolMax: 2,
    });
    
    connection = await pool.getConnection();

    // 1. Omit tkr_programacion.sql execution as it is already deployed and stable.

    // 2. Ejecutar el Paquete
    const sqlFile = fs.readFileSync('pkgln_alertas.sql', 'utf-8');
    const blocks = sqlFile.split('/').filter(b => b.trim().length > 0);

    for (const block of blocks) {
      if (block.trim()) {
        await connection.execute(block);
        console.log("Compiled Package block successfully.");
      }
    }

  } catch (err) {
    console.error("DB ERROR: ", err.message);
  } finally {
    if (connection) {
      try { await connection.close(); } catch(e) { }
    }
    if (pool) {
      try { await pool.close(); } catch(e) { }
    }
    process.exit(0);
  }
}

runSQL();
