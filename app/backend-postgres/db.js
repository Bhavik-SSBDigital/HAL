import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "root",
  password: "check",
  host: "localhost",
  database: "dms",
  port: 5432,
});

export default pool;
