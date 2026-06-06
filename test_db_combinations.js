const oracledb = require("oracledb");

async function test(label, config) {
  try {
    console.log(`Testing ${label}...`);
    console.log(`Connecting to ${config.connectString} as ${config.user} with pass length ${config.password.length}...`);
    const conn = await oracledb.getConnection(config);
    console.log(`SUCCESS for ${label}!`);
    await conn.close();
    return true;
  } catch (err) {
    console.log(`FAILED for ${label}: ${err.message} (Code: ${err.code})`);
    return false;
  }
}

async function run() {
  // Option 1: Current values from user's .env.local
  await test("Option 1 (Current .env.local)", {
    user: "TEKER_DEV",
    password: "T3k3r_2025_D3v_$ecur3",
    connectString: "tekersalud-db.maxapex.net:1521/orclpdb1"
  });

  // Option 2: Password with 's' as in test_connection.js
  await test("Option 2 (Password with 's')", {
    user: "TEKER_DEV",
    password: "T3k3r_2025_D3v_$secur3",
    connectString: "tekersalud-db.maxapex.net:1521/orclpdb1"
  });

  // Option 3: Host from README
  await test("Option 3 (README Host)", {
    user: "TEKER_DEV",
    password: "T3k3r_2025_D3v_$ecur3",
    connectString: "tekerapp-db.maxapex.net:1521/orclpdb1"
  });

  // Option 4: Host from README with password 's'
  await test("Option 4 (README Host + password with 's')", {
    user: "TEKER_DEV",
    password: "T3k3r_2025_D3v_$secur3",
    connectString: "tekerapp-db.maxapex.net:1521/orclpdb1"
  });
}

run();
