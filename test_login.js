const oracledb = require("oracledb");

async function testLogin(username, password) {
  let connection;
  try {
    console.log("Starting test login for user:", username);
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
    console.log("Oracle connection successful.");

    const result = await connection.execute(
      `BEGIN
         :ret := pkgln_seguridad.f_validar_clave(:p_username, :p_password, 1);
       END;`,
      {
        p_username: username,
        p_password: password,
        ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const out = result.outBinds;
    console.log("Oracle F_VALIDAR_CLAVE outBinds:", out);
    
    const isValid = out?.ret === 1 || out?.ret === "1";
    console.log("isValid computed:", isValid);

  } catch (error) {
    console.error("Test Login Error:", error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Emulate process.env if needed or use --env-file
testLogin(process.argv[2], process.argv[3]);
