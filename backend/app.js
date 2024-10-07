require("dotenv").config();
const express = require("express")
const bodyParser = require("body-parser");
const db = require('./db');
const cors = require("cors");
const path = require("path");
const routes = require("./routes")

// const hostname = os.hostname();
const app = express();
const port = 5001;

db.connect((err) => {
  if (err) {
    console.error("Could not connect to the database:", err);
  } else {
    console.log("Connected to the MySQL database");
  }
});


app.use(cors());
app.use(bodyParser.json());
app.use('/node/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/node", routes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

