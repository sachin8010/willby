const mysql = require("mysql2");


const db = mysql.createConnection({
  // host: "65.254.81.141",
  host: "localhost",
  user: "root",
  password: "",
  database: "localseocompany_willby",
});

module.exports = db;