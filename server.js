const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());
app.use(express.json());


/* =========================================
   DATABASE CONNECTION - NEON POSTGRESQL
========================================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


/* =========================================
   DATABASE CONNECTION TEST
========================================= */

pool.connect()
  .then((client) => {
    console.log("=================================");
    console.log("DATABASE CONNECTED SUCCESSFULLY");
    console.log("User:", process.env.DB_USER || "Neon PostgreSQL");
    console.log("Database:", process.env.DB_NAME || "jtc_wat");
    console.log("=================================");

    client.release();
  })
  .catch((error) => {
    console.error("=================================");
    console.error("DATABASE CONNECTION FAILED");
    console.error(error.message);
    console.error("=================================");
  });


/* =========================================
   ROOT ROUTE
========================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "JTC WAT Backend is running!",
  });
});


/* =========================================
   DATABASE TEST API
========================================= */

app.get("/api/test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_user, current_database()"
    );

    res.json({
      success: true,
      message: "JTC WAT Database Connected Successfully!",
      database: result.rows[0],
    });

  } catch (error) {
    console.error("Database Error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});


/* =========================================
   GET ALL WAT SETS
========================================= */

app.get("/api/sets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'wat_set_%_words'
      ORDER BY table_name;
    `);

    const sets = result.rows.map((row, index) => {
      const tableName = row.table_name;

      const match = tableName.match(
        /^wat_set_(\d+)_words$/
      );

      const setNumber = match
        ? parseInt(match[1])
        : index + 1;

      return {
        id: setNumber,
        name: `WAT Set ${setNumber}`,
      };
    });

    res.json({
      success: true,
      sets,
    });

  } catch (error) {
    console.error("SET ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load WAT sets",
      error: error.message,
    });
  }
});


/* =========================================
   GET WORDS OF SPECIFIC WAT SET
========================================= */

app.get("/api/sets/:setId/words", async (req, res) => {
  try {
    const setId = parseInt(req.params.setId);

    if (!Number.isInteger(setId) || setId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid WAT set.",
      });
    }

    /*
      Table name is generated only from
      validated numeric setId.
    */

    const tableName = `wat_set_${setId}_words`;


    /* =====================================
       CHECK WHETHER TABLE EXISTS
    ===================================== */

    const tableCheck = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
      `,
      [tableName]
    );

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: `WAT Set ${setId} does not exist.`,
      });
    }


    /* =====================================
       GET WORDS
    ===================================== */

    const result = await pool.query(
      `
      SELECT id, word
      FROM "${tableName}"
      ORDER BY id ASC;
      `
    );

    res.json({
      success: true,
      setId,
      words: result.rows,
    });

  } catch (error) {
    console.error("WORDS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load WAT words",
      error: error.message,
    });
  }
});


/* =========================================
   404 ROUTE
========================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});


/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});


/* =========================================
   START SERVER
========================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`JTC WAT Backend running on port ${PORT}`);
  console.log("=================================");
});