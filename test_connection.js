const oracledb = require("oracledb");

async function testConnection() {
  console.log("Starting connection test...");
  console.log("User:", process.env.DB_USER);
  console.log("Conn String:", process.env.DB_CONNECTION_STRING);
  console.log("Password Length:", process.env.DB_PASSWORD?.length);
  console.log("Password matches the expected literal?", process.env.DB_PASSWORD === "T3k3r_2025_D3v_$secur3");
  
  try {
    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
    console.log("Successfully connected to Oracle Database!");
    await conn.close();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

testConnection();
