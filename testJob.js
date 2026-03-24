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

    // Traemos un alert ID real para usar
    const resAlerts = await connection.execute(`SELECT ID FROM TKR_ALERTAS FETCH FIRST 1 ROWS ONLY`);
    const id_alerta = resAlerts.rows[0][0];
    
    console.log("Probando crear programacion para id_alerta:", id_alerta);

    const binds = {
      p_id_alerta: { val: id_alerta, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_tipo_frecuencia: { val: 'DIARIO', type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_hora_ejecucion: { val: '10:00', type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_repetir_cada: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_dias_operacion: { val: 'LUN', type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_fecha_inicio: { val: new Date(), type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_fecha_fin: { val: null, type: oracledb.DATE, dir: oracledb.BIND_IN }
    };

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_save_programacion(
           p_id_alerta       => :p_id_alerta,
           p_tipo_frecuencia => :p_tipo_frecuencia,
           p_hora_ejecucion  => :p_hora_ejecucion,
           p_repetir_cada    => :p_repetir_cada,
           p_dias_operacion  => :p_dias_operacion,
           p_fecha_inicio    => :p_fecha_inicio,
           p_fecha_fin       => :p_fecha_fin
         );
       END;`,
      binds,
      { autoCommit: true }
    );
    
    console.log("EXECUTE PROCEDIMIENTO TERMINADO CORRECTAMENTE.");

    const resJobs = await connection.execute(`SELECT ID, ID_ALERTA, NOMBRE_JOB FROM TKR_PROGRAMACION_ALERTAS`);
    console.log("Jobs guardados:", resJobs.rows);

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
