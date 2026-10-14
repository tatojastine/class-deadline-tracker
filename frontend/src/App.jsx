import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import "./App.css";

const API = "http://localhost:5000/api/assignments";

const emptyForm = {
  title: "",
  subject: "",
  dueDate: "",
  status: "Pending",
};

function App() {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadAssignments() {
    try {
      const response = await fetch(API);
      if (!response.ok) throw new Error("Could not load assignments.");
      setAssignments(await response.json());
      setError("");
    } catch {
      setError("Cannot connect to the backend. Check that the API is running.");
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Unable to save assignment.");
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAssignments();
    } catch (err) {
      setError(err.message || "Unable to save assignment.");
    }
  }

  function editAssignment(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subject: item.subject,
      dueDate: item.dueDate,
      status: item.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAssignment(id) {
    if (!window.confirm("Delete this assignment?")) return;

    try {
      const response = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete assignment.");
      await loadAssignments();
    } catch (err) {
      setError(err.message);
    }
  }

  const completed = assignments.filter(
    (item) => item.status === "Completed"
  ).length;

  const overdue = assignments.filter(
    (item) =>
      item.dueDate < new Date().toLocaleDateString("en-CA") &&
      item.status !== "Completed"
  ).length;

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <BookOpen size={28} />
          <span>ClassDeadline</span>
        </div>
        <span className="tagline">Stay organized. Meet every deadline.</span>
      </header>

      <section className="intro">
        <p className="eyebrow">STUDENT WORKSPACE</p>
        <h1>Your assignments, under control.</h1>
        <p>Keep track of upcoming tasks and never miss a due date.</p>
      </section>

      <section className="stats">
        <article className="stat-card">
          <span>Total assignments</span>
          <strong>{assignments.length}</strong>
        </article>
        <article className="stat-card">
          <span>Completed</span>
          <strong>{completed}</strong>
        </article>
        <article className="stat-card">
          <span>Overdue</span>
          <strong>{overdue}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>{editingId ? "Edit assignment" : "Add an assignment"}</h2>
        <form onSubmit={handleSubmit} className="assignment-form">
          <label>
            Assignment title
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="e.g. Database project"
              required
            />
          </label>

          <label>
            Subject
            <input
              name="subject"
              value={form.subject}
              onChange={updateField}
              placeholder="e.g. Integrative Programming"
              required
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={updateField}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </label>

          <div className="form-actions">
            <button className="primary" type="submit">
              <Plus size={17} />
              {editingId ? "Save changes" : "Add assignment"}
            </button>
            {editingId && (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <div className="list-heading">
          <h2>Assignment list</h2>
          <span>{assignments.length} records</span>
        </div>

        {assignments.length === 0 ? (
          <div className="empty">
            <CheckCircle size={32} />
            <p>No assignments yet. Add your first assignment above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Subject</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => {
                  const isOverdue =
                    item.dueDate < new Date().toLocaleDateString("en-CA") &&
                    item.status !== "Completed";

                  return (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.subject}</td>
                      <td>
                        {item.dueDate}
                        {isOverdue && <span className="overdue"> Overdue</span>}
                      </td>
                      <td>
                        <span
                          className={`status ${item.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="icon-button"
                          title="Edit assignment"
                          onClick={() => editAssignment(item)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          title="Delete assignment"
                          onClick={() => deleteAssignment(item.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>ClassDeadline Tracker · Built by our Scrum team</footer>
    </main>
  );
}

export default App;
