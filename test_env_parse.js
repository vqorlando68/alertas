const { loadEnvConfig } = require("@next/env");
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const password = process.env.DB_PASSWORD;
console.log("Parsed Password:", password);
console.log("Password Length:", password ? password.length : "undefined");
if (password) {
  for (let i = 0; i < password.length; i++) {
    console.log(`Char at ${i}: ${password[i]} (Code: ${password.charCodeAt(i)})`);
  }
}
