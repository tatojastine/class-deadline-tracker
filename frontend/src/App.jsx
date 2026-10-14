import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  CircleCheck,
  ClipboardList,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000/api/assignments";

const emptyForm = {
  title: "",
  subject: "",
  due_date: "",
  description: "",
};

function normalizeAssignment(item) {
  return {
    ...item,
    due_date: item.due_date ?? item.dueDate ?? "",
    completed: Boolean(item.completed ?? item.is_completed ?? item.returned),
  };
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDeadlineStatus(assignment) {
  if (assignment.completed) {
    return { label: "Completed", type: "completed" };
  }

  if (!assignment.due_date) {
    return { label: "No deadline", type: "neutral" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${assignment.due_date.slice(0, 10)}T00:00:00`);

  if (dueDate < today) {
    return { label: "Overdue", type: "overdue" };
  }

  if (dueDate.getTime() === today.getTime()) {
    return { label: "Due today", type: "today" };
  }

  return { label: "Upcoming", type: "upcoming" };
}

function App() {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Could not load assignments from the server.");
      }

      const data = await response.json();
      const rows = Array.isArray(data)
        ? data
        : data.assignments ?? data.data ?? [];

      setAssignments(rows.map(normalizeAssignment));
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Make sure your Express server is running on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((item) => item.completed).length;
    const pending = total - completed;
    const overdue = assignments.filter(
      (item) => getDeadlineStatus(item).type === "overdue"
    ).length;

    return { total, completed, pending, overdue };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        const query = search.toLowerCase();

        const matchesSearch =
          (item.title ?? "").toLowerCase().includes(query) ||
          (item.subject ?? "").toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query);

        const status = getDeadlineStatus(item).type;

        const matchesFilter =
          filter === "all" ||
          (filter === "pending" && !item.completed) ||
          (filter === "completed" && item.completed) ||
          (filter === "overdue" && status === "overdue");

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [assignments, search, filter]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.title.trim() || !form.subject.trim()) {
      setError("Please enter both an assignment title and a subject.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      due_date: form.due_date || null,
      dueDate: form.due_date || null,
      description: form.description.trim(),
    };

    try {
      const response = await fetch(
        editingId !== null ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId !== null ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Unable to save the assignment.");
      }
      
      await loadAssignments();
      setNotice(editingId !== null ? "Assignment updated successfully." : "Assignment added successfully.");
      resetForm();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setForm({
      title: item.title ?? "",
      subject: item.subject ?? "",
      due_date: item.due_date ? item.due_date.slice(0, 10) : "",
      description: item.description ?? "",
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAssignment(id) {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete this assignment.");
      }

      setAssignments((previous) => previous.filter((item) => item.id !== id));
      setNotice("Assignment deleted successfully.");

      if (editingId === id) resetForm();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    }
  }

  async function toggleCompleted(item) {
    setError("");
    setNotice("");

    const nextCompleted = !item.completed;

    try {
      const response = await fetch(`${API_URL}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          subject: item.subject,
          due_date: item.due_date || null,
          dueDate: item.due_date || null,
          description: item.description ?? "",
          completed: nextCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to update the assignment status.");
      }

      setAssignments((previous) =>
        previous.map((assignment) =>
          assignment.id === item.id
            ? { ...assignment, completed: nextCompleted }
            : assignment
        )
      );
      setNotice(nextCompleted ? "Great work! Assignment completed." : "Assignment marked as pending.");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that your server is running."
          : err.message
      );
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Class Deadline Tracker home">
          <div className="brand-icon">
            <GraduationCap size={25} />
          </div>
          <div>
            <span className="brand-name">StudySpace</span>
            <span className="brand-caption">STUDENT PLANNER</span>
          </div>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>

        <button className="nav-link active" type="button">
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </button>

        <button
          className="nav-link"
          type="button"
          onClick={() => {
            setFilter("all");
            document.getElementById("assignments")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <ClipboardList size={19} />
          <span>My assignments</span>
          <span className="nav-count">{stats.total}</span>
        </button>

        <button
          className="nav-link"
          type="button"
          onClick={() => {
            setFilter("pending");
            document.getElementById("assignments")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Clock3 size={19} />
          <span>Pending tasks</span>
        </button>

        <button
          className="nav-link"
          type="button"
          onClick={() => {
            setFilter("completed");
            document.getElementById("assignments")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <CheckCircle2 size={19} />
          <span>Completed</span>
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-tip-icon">
            <Sparkles size={20} />
          </div>
          <p className="sidebar-tip-title">Small steps count!</p>
          <p className="sidebar-tip-text">
            Stay organized, finish your tasks, and make time for yourself.
          </p>
          <div className="tip-progress">
            <span style={{ width: `${stats.total ? (stats.completed / stats.total) * 100 : 0}%` }} />
          </div>
          <span className="tip-progress-label">
            {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}% of tasks completed
          </span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Dashboard</strong>
          </div>
          <div className="topbar-right">
            <span className="today-label">
              <CalendarDays size={16} />
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <div className="avatar">S</div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> YOUR PERSONAL STUDY SPACE</div>
            <h1>Good things take <span>deadline.</span></h1>
            <p className="welcome-description">
              Keep your assignments organized and make every study session count.
            </p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-circle art-circle-one" />
            <div className="art-circle art-circle-two" />
            <div className="art-paper">
              <div className="paper-check"><CheckCircle2 size={24} /></div>
              <div className="paper-line long" />
              <div className="paper-line" />
              <div className="paper-line short" />
              <div className="paper-bottom"><Sparkles size={19} /></div>
            </div>
            <div className="art-star star-one">✦</div>
            <div className="art-star star-two">✧</div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Assignment summary">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon purple"><BookOpen size={20} /></span>
              <span className="stat-label">All assignments</span>
            </div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-footer">Your complete workload</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon blue"><Clock3 size={20} /></span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-footer">Still waiting for you</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon green"><CircleCheck size={20} /></span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-number">{stats.completed}</div>
            <div className="stat-footer">Look at you go!</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon orange"><AlertCircle size={20} /></span>
              <span className="stat-label">Overdue</span>
            </div>
            <div className="stat-number">{stats.overdue}</div>
            <div className="stat-footer">Tasks needing attention</div>
          </div>
        </section>

        {(error || notice) && (
          <div className={`message-banner ${error ? "error-message" : "success-message"}`} role="status">
            {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || notice}</span>
            <button
              type="button"
              className="message-close"
              onClick={() => {
                setError("");
                setNotice("");
              }}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="workspace-grid">
          <div className="panel assignment-panel" id="assignments">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">STAY ON TRACK</span>
                <h2>Your assignments</h2>
                <p className="panel-subtitle">Everything you need to get done, in one place.</p>
              </div>
              <span className="total-pill">{filteredAssignments.length} tasks</span>
            </div>

            <div className="assignment-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search assignments..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search assignments"
                />
              </div>
              <select
                className="filter-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter assignments"
              >
                <option value="all">All tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-state">
                <LoaderCircle className="loading-spinner" size={30} />
                <p>Loading your assignments...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><ClipboardList size={30} /></div>
                <h3>{search || filter !== "all" ? "No matching assignments" : "Your space is ready!"}</h3>
                <p>
                  {search || filter !== "all"
                    ? "Try another search or change your filter."
                    : "Add your first assignment using the form. You've got this!"}
                </p>
                {(search || filter !== "all") && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="assignment-list">
                {filteredAssignments.map((item) => {
                  const status = getDeadlineStatus(item);

                  return (
                    <article
                      className={`assignment-item ${item.completed ? "assignment-done" : ""}`}
                      key={item.id}
                    >
                      <button
                        type="button"
                        className={`task-check ${item.completed ? "checked" : ""}`}
                        onClick={() => toggleCompleted(item)}
                        aria-label={item.completed ? "Mark as pending" : "Mark as completed"}
                        title={item.completed ? "Mark as pending" : "Mark as completed"}
                      >
                        {item.completed && <CheckCircle2 size={17} />}
                      </button>

                      <div className="assignment-main">
                        <div className="assignment-title-row">
                          <h3>{item.title}</h3>
                          <span className={`status-badge ${status.type}`}>
                            <span className="status-dot" />
                            {status.label}
                          </span>
                        </div>
                        <span className="subject-label">{item.subject || "General"}</span>
                        {item.description && (
                          <p className="assignment-description">{item.description}</p>
                        )}
                        <div className="assignment-date">
                          <CalendarDays size={14} />
                          <span>Due {formatDate(item.due_date)}</span>
                        </div>
                      </div>

                      <div className="assignment-actions">
                        <button
                          type="button"
                          className="icon-button edit-button"
                          onClick={() => startEditing(item)}
                          title="Edit assignment"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button delete-button"
                          onClick={() => deleteAssignment(item.id)}
                          title="Delete assignment"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="list-footer">
              <span>Keep going, you're doing great <span className="footer-heart">♡</span></span>
              <button type="button" className="text-button" onClick={loadAssignments}>
                Refresh list
              </button>
            </div>
          </div>

          <aside className="panel form-panel">
            <div className="form-heading-icon">
              {editingId !== null ? <Pencil size={22} /> : <Plus size={23} />}
            </div>
            <div className="form-heading">
              <span className="section-kicker">{editingId !== null ? "MAKE CHANGES" : "PLAN AHEAD"}</span>
              <h2>{editingId !== null ? "Edit assignment" : "Add assignment"}</h2>
              <p>{editingId !== null ? "Update your task details below." : "A little planning goes a long way."}</p>
            </div>

            <form className="assignment-form" onSubmit={handleSubmit}>
              <label htmlFor="title">Assignment title <span>*</span></label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. Research paper"
                value={form.title}
                onChange={handleChange}
                maxLength={150}
                required
              />

              <label htmlFor="subject">Subject <span>*</span></label>
              <input
                id="subject"
                name="subject"
                type="text"
                placeholder="e.g. Integrative Programming"
                value={form.subject}
                onChange={handleChange}
                maxLength={100}
                required
              />

              <label htmlFor="due_date">Due date</label>
              <div className="date-input-wrap">
                <CalendarDays size={17} />
                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleChange}
                />
              </div>

              <label htmlFor="description">Notes <span className="optional-label">(optional)</span></label>
              <textarea
                id="description"
                name="description"
                placeholder="Add instructions or reminders..."
                rows={4}
                value={form.description}
                onChange={handleChange}
                maxLength={1000}
              />

              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? (
                  <><LoaderCircle className="loading-spinner" size={18} /> Saving...</>
                ) : editingId !== null ? (
                  <><CheckCircle2 size={18} /> Save changes</>
                ) : (
                  <><Plus size={19} /> Add assignment</>
                )}
              </button>

              {editingId !== null && (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  <X size={17} /> Cancel editing
                </button>
              )}
            </form>

            <div className="form-tip">
              <div className="tip-icon"><Sparkles size={17} /></div>
              <p><strong>Study tip</strong> Break big assignments into smaller tasks to make them easier to finish.</p>
            </div>
          </aside>
        </section>

        <footer className="page-footer">
          <span>Made for better study days.</span>
          <span>StudySpace <span className="footer-heart">♡</span></span>
        </footer>
      </main>
    </div>
  );
}

export default App;