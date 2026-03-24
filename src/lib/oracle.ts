import oracledb from "oracledb";

// Ensure thin mode
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let pool: oracledb.Pool | null = null;

export async function getOracleConnection() {
  if (!pool) {
    try {
      pool = await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECTION_STRING,
        // Optional pool configuration
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
      });
      console.log("Oracle DB pool created.");
    } catch (err) {
      console.error("Error creating Oracle DB pool:", err);
      throw err;
    }
  }
  
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (err) {
    console.error("Error getting connection from pool:", err);
    throw err;
  }
}
