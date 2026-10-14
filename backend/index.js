const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Create a persistent SQLite database file.
const db = new Database("deadlines.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
  )
`);

app.get("/", (req, res) => {
  res.json({ message: "Class Deadline Tracker API is running!" });
});

// READ: get all assignments.
app.get("/api/assignments", (req, res) => {
  const assignments = db
    .prepare("SELECT * FROM assignments ORDER BY dueDate ASC")
    .all();

  res.json(assignments);
});

// CREATE: add an assignment.
app.post("/api/assignments", (req, res) => {
  const { title, subject, dueDate, status = "Pending" } = req.body;

  if (
    typeof title !== "string" || !title.trim() ||
    typeof subject !== "string" || !subject.trim() ||
    typeof dueDate !== "string" || !dueDate.trim() ||
    !["Pending", "In Progress", "Completed"].includes(status)
  ) {
    return res.status(400).json({ error: "Enter valid assignment details." });
  }

  const result = db.prepare(`
    INSERT INTO assignments (title, subject, dueDate, status)
    VALUES (?, ?, ?, ?)
  `).run(title.trim(), subject.trim(), dueDate, status);

  const assignment = db.prepare(
    "SELECT * FROM assignments WHERE id = ?"
  ).get(result.lastInsertRowid);

  res.status(201).json(assignment);
});

// UPDATE: edit an assignment.
app.put("/api/assignments/:id", (req, res) => {
  const { title, subject, dueDate, status } = req.body;
  const id = Number(req.params.id);

  if (
    !Number.isInteger(id) || id < 1 ||
    typeof title !== "string" || !title.trim() ||
    typeof subject !== "string" || !subject.trim() ||
    typeof dueDate !== "string" || !dueDate.trim() ||
    !["Pending", "In Progress", "Completed"].includes(status)
  ) {
    return res.status(400).json({ error: "Enter valid assignment details." });
  }

  const result = db.prepare(`
    UPDATE assignments
    SET title = ?, subject = ?, dueDate = ?, status = ?
    WHERE id = ?
  `).run(title.trim(), subject.trim(), dueDate, status, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Assignment not found." });
  }

  res.json(db.prepare(
    "SELECT * FROM assignments WHERE id = ?"
  ).get(id));
});

// DELETE: remove an assignment.
app.delete("/api/assignments/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid assignment ID." });
  }

  const result = db.prepare(
    "DELETE FROM assignments WHERE id = ?"
  ).run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Assignment not found." });
  }

  res.json({ message: "Assignment deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
