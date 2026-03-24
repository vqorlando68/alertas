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

    const result = await connection.execute(
      `SELECT LINE, POSITION, TEXT FROM USER_ERRORS WHERE NAME = 'TRG_BI_TKR_PROGRAMACION_ALERTAS'`
    );
    console.log("Trigger Errors:", result.rows);
    
    const seqResult = await connection.execute(
      `SELECT SEQUENCE_NAME FROM USER_SEQUENCES WHERE SEQUENCE_NAME = 'TKR_PROGRAMACION_ALERTAS_SEQ'`
    );
    console.log("Sequence check:", seqResult.rows);

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
