const express = require("express");
const app = express();
const mysql      = require('mysql2');

import * as dbs from "dbwork.js";

var connection = mysql.createConnection({
  host     : 'localhost',
  port     : '3307',
  user     : 'root',
  password : 'password'
});

connection.connect();

connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;
  console.log('The solution is: ', rows[0].solution);
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(8000, () => {
    console.log("Example app listening on port 8000!");
});


connection.end();