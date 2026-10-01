
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT =  process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

// Database Pool
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const ALLOWED_CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// Validation 
function validateExpense(body) {
    const errors = [];
    const { title, amount, category, date } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
        errors.push("Title is required and must be a non-empty string");
    }

    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
        errors.push("Amount must be a number greater than 0");
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
        errors.push("Category must be one of: Food, Transport, Bills, Entertainment, Other");
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push("Date is required and must be in YYYY-MM-DD format");
    }

    return errors;
}
//////////////////////////////////////////////////////////////////////////////////////

app.get("/api/expenses", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      ORDER BY id
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//////////////////////////////////////////////////////////////////////////////////////

app.get("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(404).json({ message: "Invalid id" });
    }

    try {
        const result = await pool.query(`
      SELECT 
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//////////////////////////////////////////////////////////////////////////////////////

app.post("/api/expenses", async (req, res) => {
    const errors = validateExpense(req.body);

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors
        });
    }

    const { title, amount, category, date } = req.body;

    try {
        const result = await pool.query(`
      INSERT INTO expenses (title, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
    `, [title.trim(), amount, category, date]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//////////////////////////////////////////////////////////////////////////////////////


app.put("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(404).json({ message: "Invalid id" });
    }

    const errors = validateExpense(req.body);

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors
        });
    }

    const { title, amount, category, date } = req.body;

    try {
        const result = await pool.query(`
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4
      WHERE id = $5
      RETURNING 
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
    `, [title.trim(), amount, category, date, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//////////////////////////////////////////////////////////////////////////////////////

app.delete("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(404).json({ message: "Invalid id" });
    }

    try {
        const result = await pool.query(`
      DELETE FROM expenses
      WHERE id = $1
      RETURNING 
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.json({
            message: "Expense deleted",
            expense: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});