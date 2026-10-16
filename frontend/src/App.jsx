
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
  AlertCircle,
  Menu,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000/api/assignments";

const emptyForm = {
  title: "",
  subject: "",
  dueDate: "",
  priority: "Medium",
  status: "Not Started",
  description: "",
};

function getTitle(item) {
  return item.title ?? item.name ?? "";
}

function getSubject(item) {
  return item.subject ?? item.course ?? "";
}

function getDueDate(item) {
  return item.dueDate ?? item.due_date ?? "";
}

function getStatus(item) {
  if (item.completed === true || item.completed === 1) return "Completed";

  const status = item.status ?? "Not Started";
  return status === "In Progress" || status === "Completed"
    ? status
    : "Not Started";
}

function getPriority(item) {
  const priority = item.priority ?? "Medium";
  return ["Low", "Medium", "High"].includes(priority) ? priority : "Medium";
}

function formatDate(date) {
  if (!date) return "No due date";

  const parsed = new Date(`${date}`.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDeadlineLabel(date, status) {
  if (status === "Completed") return "Completed";
  if (!date) return "No due date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${date}`.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(due.getTime())) return "Scheduled";

  const difference = Math.round((due - today) / 86400000);

  if (difference < 0) return "Overdue";
  if (difference === 0) return "Due today";
  if (difference <= 7) return "Due soon";
  return "Upcoming";
}

function normalizeAssignment(item) {
  return {
    ...item,
    title: getTitle(item),
    subject: getSubject(item),
    dueDate: getDueDate(item),
    priority: getPriority(item),
    status: getStatus(item),
    description: item.description ?? "",
  };
}

export default function App() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("class-deadline-theme") || "light"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    localStorage.setItem("class-deadline-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : data.assignments ?? data.data ?? [];

      setAssignments(list.map(normalizeAssignment));
    } catch (err) {
      setError(
        "Unable to connect to the backend. Make sure your Express server is running at localhost:5000."
      );
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const completed = assignments.filter(
      (item) => getStatus(item) === "Completed"
    ).length;

    const overdue = assignments.filter(
      (item) => getDeadlineLabel(getDueDate(item), getStatus(item)) === "Overdue"
    ).length;

    const dueSoon = assignments.filter((item) => {
      const label = getDeadlineLabel(getDueDate(item), getStatus(item));
      return label === "Due today" || label === "Due soon";
    }).length;

    return {
      total: assignments.length,
      completed,
      overdue,
      dueSoon,
      percentage: assignments.length
        ? Math.round((completed / assignments.length) * 100)
        : 0,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((item) => {
        const query = search.toLowerCase();

        const matchesSearch = [
          getTitle(item),
          getSubject(item),
          item.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

        const status = getStatus(item);
        const matchesFilter =
          filter === "All" ||
          (filter === "Overdue" &&
            getDeadlineLabel(getDueDate(item), status) === "Overdue") ||
          status === filter;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (!getDueDate(a)) return 1;
        if (!getDueDate(b)) return -1;
        return getDueDate(a).localeCompare(getDueDate(b));
      });
  }, [assignments, search, filter]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setNotice("");
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      title: getTitle(item),
      subject: getSubject(item),
      dueDate: getDueDate(item).slice(0, 10),
      priority: getPriority(item),
      status: getStatus(item),
      description: item.description ?? "",
    });
    setFormOpen(true);
    setNotice("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function saveAssignment(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      description: form.description.trim(),
    };

    try {
      const editing = editingId !== null && editingId !== undefined;
      const response = await fetch(
        editing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed (${response.status})`);
      }

      closeForm();
      await loadAssignments();
      setNotice(editing ? "Assignment updated successfully." : "Assignment added successfully.");
    } catch (err) {
      setError(
        `Could not save the assignment. Check that your backend accepts the fields title, subject, dueDate, priority, status, and description. ${err.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(item) {
    const confirmed = window.confirm(
      `Delete "${getTitle(item)}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      await loadAssignments();
      setNotice("Assignment deleted successfully.");
    } catch (err) {
      setError("Could not delete the assignment. Check your backend API.");
    }
  }

  async function toggleCompleted(item) {
    const nextStatus =
      getStatus(item) === "Completed" ? "Not Started" : "Completed";

    const payload = {
      title: getTitle(item),
      subject: getSubject(item),
      dueDate: getDueDate(item),
      priority: getPriority(item),
      status: nextStatus,
      description: item.description ?? "",
    };

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      await loadAssignments();
      setNotice(
        nextStatus === "Completed"
          ? "Assignment marked as completed."
          : "Assignment marked as not started."
      );
    } catch (err) {
      setError("Could not update the assignment status. Check your backend API.");
    }
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={27} />
          </div>
          <div>
            <strong>Class Deadline</strong>
            <span>TRACKER</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          <button className="nav-item active" onClick={() => setFilter("All")}>
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>
          <button className="nav-item" onClick={() => setFilter("All")}>
            <ListTodo size={19} />
            <span>My Assignments</span>
            <span className="nav-count">{assignments.length}</span>
          </button>
          <button className="nav-item" onClick={openAddForm}>
            <Plus size={19} />
            <span>Add Assignment</span>
          </button>
        </nav>

        <div className="sidebar-label secondary-label">PREFERENCES</div>
        <button
          className="nav-item theme-nav"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          <span>{theme === "light" ? "Dark navy theme" : "Light theme"}</span>
          <span className="theme-switch-mini">
            <span />
          </span>
        </button>

        <div className="sidebar-bottom">
          <div className="focus-card">
            <div className="focus-icon">
              <CheckCircle2 size={22} />
            </div>
            <strong>One task at a time.</strong>
            <p>Small progress adds up to big achievements.</p>
          </div>
          <div className="profile">
            <div className="avatar">ST</div>
            <div className="profile-info">
              <strong>Student</strong>
              <span>Keep learning</span>
            </div>
            <Settings size={18} className="profile-settings" />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Dashboard</strong>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search assignments..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Switch dashboard theme"
              aria-label="Switch dashboard theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
            </button>
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              YOUR ACADEMIC OVERVIEW
            </div>
            <h1>Stay on top of your <span>deadlines.</span></h1>
            <p className="welcome-subtitle">
              Plan your work, track your progress, and make every study session count.
            </p>
          </div>
          <button className="primary-button" onClick={openAddForm}>
            <Plus size={18} />
            New assignment
          </button>
        </section>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div className="alert alert-success">
            <CheckCircle2 size={19} />
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-blue"><BookOpen size={20} /></div>
              <span className="stat-label">Total assignments</span>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-footer">
              <span>Across all subjects</span>
              <span className="stat-symbol">↗</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-teal"><Check size={21} /></div>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-footer">
              <span>{stats.percentage}% completion rate</span>
              <span className="progress-mini">
                <span style={{ width: `${stats.percentage}%` }} />
              </span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-amber"><Clock3 size={20} /></div>
              <span className="stat-label">Due soon</span>
            </div>
            <div className="stat-value">{stats.dueSoon}</div>
            <div className="stat-footer">
              <span>Within the next 7 days</span>
              <span className="stat-symbol">↗</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-red"><AlertCircle size={20} /></div>
              <span className="stat-label">Overdue</span>
            </div>
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-footer">
              <span>Needs your attention</span>
              <span className="stat-symbol">↗</span>
            </div>
          </article>
        </section>

        <section className="assignment-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-title-line">
                <div className="panel-icon"><ListTodo size={21} /></div>
                <h2>My assignments</h2>
                <span className="result-count">{filteredAssignments.length}</span>
              </div>
              <p>Everything you need to finish, in one place.</p>
            </div>
            <button className="text-button" onClick={openAddForm}>
              <Plus size={16} />
              Add new
            </button>
          </div>

          <div className="filter-row">
            {["All", "Not Started", "In Progress", "Completed", "Overdue"].map(
              (item) => (
                <button
                  key={item}
                  className={`filter-chip ${filter === item ? "selected" : ""}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              )
            )}
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon"><Clock3 size={25} /></div>
              <h3>Loading your assignments</h3>
              <p>Getting your latest data from the server...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><BookOpen size={25} /></div>
              <h3>{search ? "No matching assignments" : "Nothing here yet"}</h3>
              <p>
                {search
                  ? "Try another search term or change your filters."
                  : "Add your first assignment to start organizing your deadlines."}
              </p>
              {!search && (
                <button className="primary-button" onClick={openAddForm}>
                  <Plus size={17} />
                  Add assignment
                </button>
              )}
            </div>
          ) : (
            <div className="assignment-list">
              {filteredAssignments.map((item) => {
                const status = getStatus(item);
                const deadline = getDeadlineLabel(getDueDate(item), status);

                return (
                  <article className="assignment-row" key={item.id}>
                    <button
                      className={`completion-button ${status === "Completed" ? "is-complete" : ""}`}
                      onClick={() => toggleCompleted(item)}
                      title={
                        status === "Completed"
                          ? "Mark as not started"
                          : "Mark as completed"
                      }
                      aria-label={`Toggle completion for ${getTitle(item)}`}
                    >
                      {status === "Completed" ? (
                        <CheckCircle2 size={21} />
                      ) : (
                        <Circle size={21} />
                      )}
                    </button>

                    <div className="assignment-main">
                      <h3 className={status === "Completed" ? "completed-title" : ""}>
                        {getTitle(item) || "Untitled assignment"}
                      </h3>
                      <p>{getSubject(item) || "No subject specified"}</p>
                      {item.description && (
                        <span className="assignment-description">
                          {item.description}
                        </span>
                      )}
                    </div>

                    <div className="assignment-due">
                      <CalendarDays size={15} />
                      <span>{formatDate(getDueDate(item))}</span>
                    </div>

                    <span className={`priority-badge priority-${getPriority(item).toLowerCase()}`}>
                      {getPriority(item)}
                    </span>

                    <div className="assignment-status">
                      <span className={`status-badge status-${status.toLowerCase().replaceAll(" ", "-")}`}>
                        {status}
                      </span>
                      {deadline === "Overdue" && (
                        <span className="deadline-warning">Overdue</span>
                      )}
                      {deadline === "Due today" && (
                        <span className="deadline-warning today">Due today</span>
                      )}
                    </div>

                    <div className="row-actions">
                      <button
                        className="icon-button"
                        onClick={() => openEditForm(item)}
                        title="Edit assignment"
                        aria-label={`Edit ${getTitle(item)}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button delete-button"
                        onClick={() => deleteAssignment(item)}
                        title="Delete assignment"
                        aria-label={`Delete ${getTitle(item)}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="panel-footer">
            <span>Showing {filteredAssignments.length} of {assignments.length} assignments</span>
            <button onClick={loadAssignments} className="refresh-button">
              Refresh list
            </button>
          </div>
        </section>

        <footer className="page-footer">
          <span>Class Deadline Tracker</span>
          <span>Stay focused. Keep progressing.</span>
        </footer>
      </main>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" /> ASSIGNMENT DETAILS</div>
                <h2 id="form-title">{editingId !== null ? "Edit assignment" : "Create assignment"}</h2>
                <p>Keep the details clear so you can stay on track.</p>
              </div>
              <button className="icon-button" onClick={closeForm} aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAssignment}>
              <label className="form-field">
                <span>Assignment title *</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Research paper"
                  required
                  maxLength={150}
                />
              </label>

              <label className="form-field">
                <span>Subject or course</span>
                <input
                  name="subject"
                  value={form.subject}
                  onChange={updateForm}
                  placeholder="e.g. Information Technology"
                />
              </label>

              <div className="form-two-columns">
                <label className="form-field">
                  <span>Due date *</span>
                  <input
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Priority</span>
                  <select name="priority" value={form.priority} onChange={updateForm}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Status</span>
                <select name="status" value={form.status} onChange={updateForm}>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </label>

              <label className="form-field">
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="Add notes or instructions..."
                  rows={3}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : <><Check size={17} /> {editingId !== null ? "Save changes" : "Create assignment"}</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
