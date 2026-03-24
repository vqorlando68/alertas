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

    const triggerSql = `
CREATE OR REPLACE TRIGGER TRG_BI_TKR_PROGRAMACION_ALERTAS
    BEFORE INSERT
    ON TKR_PROGRAMACION_ALERTAS
    FOR EACH ROW
    WHEN (new.id IS NULL)
BEGIN
    :new.id := TKR_PROGRAMACION_ALERTAS_SEQ.NEXTVAL;
END;
    `;
    
    await connection.execute(triggerSql);
    console.log("Trigger created successfully.");

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
