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

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

async function testLogs() {
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
    console.log("Pool created");
    
    connection = await pool.getConnection();

    const binds = {
      p_id_alerta: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_estado: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_fecha_ini: { val: null, type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_fecha_fin: { val: null, type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_resultado: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    console.log("Executing p_get_all_logs...");
    const result = await connection.execute(
      `BEGIN
         pkgln_alertas.p_get_all_logs(
           p_id_alerta => :p_id_alerta,
           p_estado    => :p_estado,
           p_fecha_ini => :p_fecha_ini,
           p_fecha_fin => :p_fecha_fin,
           p_resultado => :p_resultado
         );
       END;`,
      binds
    );

    const resultSet = result.outBinds.p_resultado;
    if (!resultSet) {
      console.log("No cursor returned");
      return;
    }

    let allRows = [];
    let rows;
    while ((rows = await resultSet.getRows(100)) && rows.length > 0) {
      allRows.push(...rows);
    }
    
    console.log("Fetched length:", allRows.length);

    await resultSet.close();
  } catch (err) {
    console.error("ERROR: ", err);
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

testLogs();
