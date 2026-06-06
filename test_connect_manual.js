const oracledb = require("oracledb");
const { loadEnvConfig } = require("@next/env");
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  try {
    console.log("Connecting manually with env vars...");
    console.log("User:", process.env.DB_USER);
    console.log("Password Length:", process.env.DB_PASSWORD?.length);
    console.log("Password:", process.env.DB_PASSWORD);
    console.log("Conn String:", process.env.DB_CONNECTION_STRING);
    
    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
    console.log("SUCCESSFULLY CONNECTED MANUALLY!");
    await conn.close();
  } catch (err) {
    console.error("CONNECTION FAILED:", err.message, "Code:", err.code);
  }
}
run();
