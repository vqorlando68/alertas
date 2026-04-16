const oracledb = require("oracledb");
const fs = require("fs");

async function testConnection() {
  const logFile = "test_log.txt";
  const log = (msg) => { console.log(msg); fs.appendFileSync(logFile, msg + "\n"); };
  
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  
  log("Starting connection test...");
  log("User: " + process.env.DB_USER);
  log("Conn String: " + process.env.DB_CONNECTION_STRING);
  log("Password Length: " + (process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : "null"));
  log("Password contains $: " + (process.env.DB_PASSWORD ? process.env.DB_PASSWORD.includes("$") : "false"));
  
  try {
    const conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
    log("Successfully connected to Oracle Database!");
    await conn.close();
  } catch (err) {
    log("Connection failed: " + err.message);
    log("Error Code: " + err.code);
  }
}

testConnection();
