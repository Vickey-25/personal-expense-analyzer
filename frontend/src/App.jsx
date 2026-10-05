import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));

const dateLabel = (value, options = { day: "2-digit", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-IN", options).format(new Date(`${value}T00:00:00`));

const todayISO = () => new Date().toISOString().slice(0, 10);

const getDaysArray = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const days = [];
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);

  let current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");
    days.push(`${year}-${month}-${day}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
};

const ICONS = {
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
  ),
  pie: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3a8 8 0 1 0 8 8h-8V3Z" /><path d="M13 3a8 8 0 0 1 8 8h-8V3Z" /></svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z" /></svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 11v6M15 11v6M8 7l1-3h6l1 3M6 7l1 14h10l1-14" /></svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.5-10.5a2.2 2.2 0 0 0-3.1-3.1L5.1 15.9 4 20Z" /><path d="m14.7 6.3 3 3" /></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M13 8l4 4-4 4M17 12H9" /></svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
  ),
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("expenseflow_token"));
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem("expenseflow_token");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.me().then(setUser).catch(logout);
  }, [token, logout]);

  if (!token) {
    return <AuthScreen onLogin={(data) => {
      localStorage.setItem("expenseflow_token", data.access_token);
      setToken(data.access_token);
    }} />;
  }

  if (!user) {
    return <Splash />;
  }

  return <Workspace user={user} onLogout={logout} />;
}

function Splash() {
  return (
    <div className="splash">
      <div className="brand-mark large">E</div>
      <div className="loading-orb" />
      <p>Preparing your financial workspace…</p>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        await api.register({
          email: form.email,
          full_name: form.full_name,
          password: form.password,
        });
      }
      const data = await api.login(form.email, form.password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-glow glow-one" />
      <div className="auth-glow glow-two" />
      <div className="auth-panel">
        <div className="auth-visual">
          <div className="floating-card card-a"><span>Monthly spend</span><strong>₹42,860</strong><small>Live insight</small></div>
          <div className="floating-card card-b"><span>Top category</span><strong>Food</strong><small>24.6% of spend</small></div>
          <div className="visual-core">
            <div className="ring"><div className="ring-inner"><span>₹</span><strong>Flow</strong></div></div>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
          </div>
          <div className="visual-copy">
            <span className="eyebrow">PERSONAL FINANCE, REIMAGINED</span>
            <h1>Know where your money goes.</h1>
            <p>Track every expense, understand your habits, and turn spending data into a simple daily rhythm.</p>
          </div>
        </div>

        <div className="auth-form-area">
          <div className="brand-row">
            <div className="brand-mark">E</div>
            <div><strong>ExpenseFlow</strong><span>Personal Expense Analyzer</span></div>
          </div>

          <div className="auth-title">
            <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "START FRESH"}</span>
            <h2>{mode === "login" ? "Your money, in focus." : "Build your money habit."}</h2>
            <p>{mode === "login" ? "Sign in to continue to your dashboard." : "Create an account and start tracking today."}</p>
          </div>

          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <Field
                label="Full name"
                value={form.full_name}
                onChange={(value) => setForm({ ...form, full_name: value })}
                placeholder="Vignesh S"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              placeholder="At least 8 characters"
            />
            {error && <div className="error-box">{error}</div>}
            <button className="primary-btn full" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : null}
              {loading ? "Please wait…" : mode === "login" ? "Enter dashboard" : "Create account"}
              {!loading && ICONS.arrow}
            </button>
          </form>

          <div className="switch-auth">
            {mode === "login" ? "New to ExpenseFlow?" : "Already have an account?"}
            <button type="button" onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="security-note">
            <span className="security-dot" />
            Your session is protected with JWT authentication.
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function Workspace({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((v) => v + 1);

  const navItems = [
    { id: "dashboard", label: "Overview", icon: ICONS.grid },
    { id: "expenses", label: "Expenses", icon: ICONS.receipt },
    { id: "reports", label: "Analytics", icon: ICONS.pie },
    { id: "categories", label: "Categories", icon: ICONS.folder },
    { id: "profile", label: "Profile", icon: ICONS.user },
  ];

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand-mark">E</div>
          <div><strong>ExpenseFlow</strong><span>Expense Analyzer</span></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}>{ICONS.close}</button>
        </div>

        <div className="sidebar-section">
          <span className="nav-label">WORKSPACE</span>
          <nav>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
                {page === item.id && <i />}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="mini-insight">
            <div className="mini-insight-icon">{ICONS.spark}</div>
            <div>
              <strong>Smart habit</strong>
              <span>Review your top category each week.</span>
            </div>
          </div>
          <div className="sidebar-user">
            <div className="avatar">{user.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div className="user-meta"><strong>{user.full_name}</strong><span>{user.email}</span></div>
            <button title="Log out" onClick={onLogout}>{ICONS.logout}</button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}>{ICONS.menu}</button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{navItems.find((item) => item.id === page)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="status-pill"><span /> API Connected</div>
            <button className="profile-chip" onClick={() => navigate("profile")}>
              <span className="avatar small">{user.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
              <span>{user.full_name.split(" ")[0]}</span>
              {ICONS.chevron}
            </button>
          </div>
        </header>

        <div className="page-wrap" key={`${page}-${refreshKey}`}>
          {page === "dashboard" && <Dashboard onNavigate={navigate} />}
          {page === "expenses" && <ExpensesPage onChanged={refresh} />}
          {page === "reports" && <ReportsPage />}
          {page === "categories" && <CategoriesPage />}
          {page === "profile" && <ProfilePage user={user} onLogout={onLogout} />}
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [aiPeriod, setAiPeriod] = useState("monthly");
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [d, r, e] = await Promise.all([
        api.dashboard(),
        api.report("monthly"),
        api.expenses(),
      ]);
      setDashboard(d);
      setReport(r);
      setExpenses(e);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadAIInsight = async (period = aiPeriod) => {
    try {
      setAiLoading(true);
      setAiError("");

      const data = await api.aiInsight(period);

      setAiData(data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    loadAIInsight("monthly");
  }, []);

  const recent = expenses.slice(0, 5);

  return (
    <>
      <PageHeading
        eyebrow="PERSONAL OVERVIEW"
        title="Your financial pulse."
        description="A clean snapshot of what you spent, where it went, and what changed this month."
        action={
          <button className="primary-btn" onClick={() => onNavigate("expenses")}>
            {ICONS.plus} Add expense
          </button>
        }
      />

      {error && <div className="error-box page-error">{error}</div>}

      <div className="stats-grid">
        <StatCard label="Today" value={dashboard ? money(dashboard.today.total) : "—"} hint={dashboard ? `${dateLabel(dashboard.today.end_date)}` : "Loading"} tone="mint" icon="01" />
        <StatCard label="Last 7 days" value={dashboard ? money(dashboard.last_7_days.total) : "—"} hint={dashboard ? `${dateLabel(dashboard.last_7_days.start_date, { day: "2-digit", month: "short" })} → today` : "Loading"} tone="violet" icon="07" />
        <StatCard label="This month" value={dashboard ? money(dashboard.this_month.total) : "—"} hint={report ? `${number(report.transaction_count)} transactions` : "Loading"} tone="blue" icon="30" />
        <StatCard label="Top category" value={report?.highest_spending_category || "—"} hint={report ? money(report.total_expense) + " total spend" : "Loading"} tone="amber" icon="↗" text />
        <section className="ai-insight-card">
          <div className="ai-insight-top">
            <div>
              <span className="eyebrow">AI FINANCIAL INSIGHT</span>
              <h3>Understand your spending</h3>
            </div>

            <div className="ai-spark">
              {ICONS.spark}
            </div>
          </div>

          <div className="ai-period-tabs">
            {["daily", "weekly", "monthly"].map((item) => (
              <button
                key={item}
                className={aiPeriod === item ? "active" : ""}
                onClick={() => {
                  setAiPeriod(item);
                  loadAIInsight(item);
                }}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {aiLoading ? (
            <div className="ai-loading">
              <div className="ai-spinner" />
              <span>Gemini is analyzing your spending…</span>
            </div>
          ) : aiError ? (
            <div className="ai-error">
              {aiError}
              <button onClick={() => loadAIInsight(aiPeriod)}>
                Try again
              </button>
            </div>
          ) : aiData ? (
            <div className="ai-content">
              <div className="ai-number">
                <span>Total spending</span>
                <strong>{money(aiData.total_expense)}</strong>
              </div>

              <div className="ai-meta">
                <span>
                  {number(aiData.transaction_count)} transaction
                  {aiData.transaction_count !== 1 ? "s" : ""}
                </span>

                <span>
                  Top category:{" "}
                  <strong>
                    {aiData.highest_spending_category || "None"}
                  </strong>
                </span>
              </div>

              <p>{aiData.insight}</p>
            </div>
          ) : (
            <div className="ai-empty">
              Click a period to generate an AI insight.
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="card-head">
            <div><span className="eyebrow">MONTHLY RHYTHM</span><h3>Spending trend</h3></div>
            <button className="link-btn" onClick={() => onNavigate("reports")}>Full analytics {ICONS.arrow}</button>
          </div>
          {report ? <TrendChart data={report.trend} /> : <ChartSkeleton />}
        </section>

        <section className="card category-card">
          <div className="card-head">
            <div><span className="eyebrow">BREAKDOWN</span><h3>Where it goes</h3></div>
            <button className="icon-plain" onClick={() => onNavigate("reports")}>{ICONS.chevron}</button>
          </div>
          {report ? <DonutBreakdown items={report.category_breakdown.slice(0, 5)} total={report.total_expense} /> : <ChartSkeleton circle />}
        </section>
      </div>

      <section className="card recent-card">
        <div className="card-head">
          <div><span className="eyebrow">LATEST ACTIVITY</span><h3>Recent expenses</h3></div>
          <button className="link-btn" onClick={() => onNavigate("expenses")}>View all {ICONS.arrow}</button>
        </div>
        <ExpenseTable rows={recent} compact emptyText="No expenses yet. Add your first one to see your spending flow." />
      </section>
    </>
  );
}

function StatCard({ label, value, hint, icon, tone = "mint", text }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span>{label}</span><b>{icon}</b></div>
      <strong className={text ? "stat-text" : ""}>{value}</strong>
      <small>{hint}</small>
      <div className="stat-glow" />
    </div>
  );
}

function TrendChart({ data }) {
  if (!data?.length) {
    return <div className="empty-chart"><span>No trend data yet</span><small>Add expenses to generate your chart.</small></div>;
  }
  const width = 700;
  const height = 250;
  const padX = 22;
  const padTop = 24;
  const padBottom = 32;
  const values = data.map((d) => Number(d.total || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = data.map((d, index) => {
    const x = data.length === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (data.length - 1);
    const y = padTop + ((max - Number(d.total || 0)) / range) * (height - padTop - padBottom);
    return [x, y];
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M ${points[0][0]} ${height - padBottom} L ${line.replaceAll(",", " ").replaceAll(" ", " ")} L ${points.at(-1)[0]} ${height - padBottom} Z`;

  return (
    <div className="trend-wrap">
      <div className="trend-summary"><strong>{money(values.reduce((a, b) => a + b, 0))}</strong><span>period spend</span></div>
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopOpacity=".30" />
            <stop offset="100%" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trendStroke" x1="0" x2="1">
            <stop offset="0%" />
            <stop offset="100%" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={padX} x2={width - padX} y1={padTop + ratio * (height - padTop - padBottom)} y2={padTop + ratio * (height - padTop - padBottom)} className="gridline" />
        ))}
        <path d={area} className="chart-area" />
        <polyline points={line} fill="none" className="chart-line" vectorEffect="non-scaling-stroke" />
        {points.map(([x, y], index) => (
          <g key={index}>
            <circle cx={x} cy={y} r="4.5" className="chart-dot" />
            <title>{`${data[index].period}: ${money(data[index].total)}`}</title>
          </g>
        ))}
      </svg>
      <div className="trend-labels">
        {data.map((d) => <span key={d.period}>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${d.period}T00:00:00`))}</span>)}
      </div>
    </div>
  );
}

function DonutBreakdown({ items, total }) {
  const palette = ["#7cf6c9", "#8c7cff", "#62b8ff", "#ffc46b", "#ff8da2"];
  const totalNumber = Number(total || 0);
  const pieces = [];
  let cursor = 0;
  items.forEach((item, index) => {
    const percent = totalNumber ? (Number(item.total) / totalNumber) * 100 : 0;
    pieces.push(`${palette[index % palette.length]} ${cursor}% ${Math.min(cursor + percent, 100)}%`);
    cursor += percent;
  });
  const background = pieces.length ? `conic-gradient(${pieces.join(", ")})` : "conic-gradient(#23324a 0 100%)";

  return (
    <div className="donut-layout">
      <div className="donut" style={{ "--donut-bg": background }}>
        <div><strong>{money(total)}</strong><span>this month</span></div>
      </div>
      <div className="legend">
        {items.map((item, index) => (
          <div className="legend-row" key={item.category}>
            <span><i style={{ background: palette[index % palette.length] }} />{item.category}</span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
        {!items.length && <div className="muted">No categories to display yet.</div>}
      </div>
    </div>
  );
}

function ChartSkeleton({ circle = false }) {
  return <div className={`chart-skeleton ${circle ? "circle" : ""}`}><div /></div>;
}

function ExpensesPage({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", categoryId: "" });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [expenseData, categoryData] = await Promise.all([
        api.expenses(filters),
        api.categories(),
      ]);
      setRows(expenseData);
      setCategories(categoryData);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters.startDate, filters.endDate, filters.categoryId]);

  const addExpense = async (payload) => {
    await api.createExpense(payload);
    setToast("Expense added successfully.");
    setModal(null);
    await load();
    onChanged();
  };

  const updateExpense = async (id, payload) => {
    await api.updateExpense(id, payload);
    setToast("Expense updated.");
    setModal(null);
    await load();
    onChanged();
  };

  const removeExpense = async (id) => {
    if (!window.confirm("Delete this expense permanently?")) return;
    try {
      await api.deleteExpense(id);
      setToast("Expense deleted.");
      await load();
      onChanged();
    } catch (err) {
      setToast(err.message);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="EXPENSES"
        title="Every rupee, accounted for."
        description="Capture your spending once. Let the dashboard do the organizing."
        action={<button className="primary-btn" onClick={() => setModal({ mode: "add" })}>{ICONS.plus} New expense</button>}
      />

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <section className="card filters-card">
        <div className="filter-head"><span className="eyebrow">FILTER ACTIVITY</span><button className="link-btn" onClick={() => setFilters({ startDate: "", endDate: "", categoryId: "" })}>Reset</button></div>
        <div className="filters-grid">
          <label className="field small"><span>From</span><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></label>
          <label className="field small"><span>To</span><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></label>
          <label className="field small"><span>Category</span><select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <div className="filter-result"><span>Transactions</span><strong>{number(rows.length)}</strong></div>
        </div>
      </section>

      <section className="card table-card">
        <div className="card-head"><div><span className="eyebrow">TRANSACTION LEDGER</span><h3>Expense history</h3></div><div className="table-meta">{loading ? "Refreshing…" : `${number(rows.length)} shown`}</div></div>
        {loading ? <TableSkeleton /> : <ExpenseTable rows={rows} onEdit={(row) => setModal({ mode: "edit", row })} onDelete={removeExpense} emptyText="No matching expenses. Try another filter or add a new expense." />}
      </section>

      {modal && (
        <ExpenseModal
          mode={modal.mode}
          row={modal.row}
          categories={categories}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === "add" ? addExpense : (payload) => updateExpense(modal.row.id, payload)}
        />
      )}
    </>
  );
}

function ExpenseTable({ rows, onEdit, onDelete, compact = false, emptyText }) {
  if (!rows.length) return <div className="empty-state">{ICONS.receipt}<strong>Nothing here yet</strong><span>{emptyText}</span></div>;

  return (
    <div className={`table-wrap ${compact ? "compact-table" : ""}`}>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="align-right">Amount</th>{!compact && <th className="actions-col">Actions</th>}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="row-animate" style={{ "--i": index }}>
              <td>{dateLabel(row.expense_date)}</td>
              <td><strong>{row.description || "Untitled expense"}</strong></td>
              <td><span className="category-pill"><i />{row.category_name}</span></td>
              <td className="align-right amount-cell">{money(row.amount)}</td>
              {!compact && <td className="actions-col"><button className="table-action" title="Edit" onClick={() => onEdit(row)}>{ICONS.edit}</button><button className="table-action danger" title="Delete" onClick={() => onDelete(row.id)}>{ICONS.trash}</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return <div className="skeleton-table">{[1, 2, 3, 4, 5].map((i) => <div key={i}><span /><span /><span /><span /></div>)}</div>;
}

function ExpenseModal({ mode, row, categories, onClose, onSubmit }) {
  const [form, setForm] = useState({
    amount: row?.amount || "",
    category_id: row?.category_id || categories[0]?.id || "",
    description: row?.description || "",
    expense_date: row?.expense_date || todayISO(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.category_id && categories[0]) {
      setForm((current) => ({ ...current, category_id: categories[0].id }));
    }
  }, [categories]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        amount: Number(form.amount),
        category_id: Number(form.category_id),
        description: form.description || null,
        expense_date: form.expense_date,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div><span className="eyebrow">{mode === "add" ? "NEW TRANSACTION" : "EDIT TRANSACTION"}</span><h2>{mode === "add" ? "Add an expense" : "Refine this expense"}</h2></div>
          <button className="icon-plain" onClick={onClose}>{ICONS.close}</button>
        </div>
        <form onSubmit={submit} className="form-grid">
          <label className="field full-span"><span>Amount</span><div className="money-input"><span>₹</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></div></label>
          <label className="field"><span>Category</span><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="field"><span>Date</span><input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required /></label>
          <label className="field full-span"><span>Description</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. EB Bill paid" /></label>
          {error && <div className="error-box full-span">{error}</div>}
          <div className="modal-actions full-span"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : mode === "add" ? "Save expense" : "Save changes"} {!busy && ICONS.arrow}</button></div>
        </form>
      </div>
    </div>
  );
}

function DailySpendingChart({ series, totalExpense }) {
  if (!series || series.length === 0 || totalExpense === 0) {
    return (
      <div className="empty-state chart-empty-state">
        {ICONS.receipt}
        <strong>No spending data yet</strong>
        <span>Add expenses to see your spending pattern over time.</span>
      </div>
    );
  }

  const maxAmount = Math.max(...series.map((d) => d.total), 1);
  const ticks = [maxAmount, maxAmount * 0.666, maxAmount * 0.333, 0];
  const activeCount = series.filter((d) => d.total > 0).length;

  return (
    <div className="daily-chart-wrap">
      <div className="daily-chart-body">
        <div className="y-axis">
          {ticks.map((tickVal, idx) => (
            <span key={idx} className="y-tick">
              {money(tickVal)}
            </span>
          ))}
        </div>

        <div className="chart-scroll-area">
          <div className="grid-lines">
            {ticks.map((_, idx) => (
              <div key={idx} className="grid-line" />
            ))}
          </div>

          <div className="bars-container">
            {series.map((item, index) => {
              const heightPct = maxAmount > 0 ? (item.total / maxAmount) * 100 : 0;
              const isZero = item.total === 0;
              const step = series.length > 25 ? 5 : 3;
              const showLabel =
                series.length <= 14 ||
                index === 0 ||
                index === series.length - 1 ||
                index % step === 0;

              const formattedDate = new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
              }).format(new Date(`${item.date}T00:00:00`));

              return (
                <div
                  key={item.date}
                  className={`bar-column ${isZero ? "zero-bar" : ""}`}
                  title={`${formattedDate}: ${money(item.total)}`}
                >
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        height: isZero ? "3px" : `${Math.max(heightPct, 4)}%`,
                      }}
                    >
                      <div className="bar-tooltip">
                        <div className="tooltip-date">{formattedDate}</div>
                        <div className="tooltip-amount">{money(item.total)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="x-label">
                    {showLabel ? formattedDate : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-footer-meta">
        <span className="badge active-badge">
          <i /> {activeCount} active spending {activeCount === 1 ? "day" : "days"}
        </span>
        <span className="badge zero-badge">Empty days = ₹0</span>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const [report, setReport] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.report(period), api.expenses()])
      .then(([reportData, expenseData]) => {
        setReport(reportData);
        setExpenses(expenseData);
      })
      .catch(() => {
        setReport(null);
        setExpenses([]);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const dailySeries = useMemo(() => {
    if (!report?.start_date || !report?.end_date) return [];
    const days = getDaysArray(report.start_date, report.end_date);
    const totals = new Map();
    (expenses || []).forEach((e) => {
      if (
        e.expense_date >= report.start_date &&
        e.expense_date <= report.end_date
      ) {
        totals.set(
          e.expense_date,
          (totals.get(e.expense_date) || 0) + Number(e.amount || 0)
        );
      }
    });

    return days.map((date) => ({
      date,
      total: totals.get(date) || 0,
    }));
  }, [report, expenses]);

  const analyticsKpis = useMemo(() => {
    const totalDays = dailySeries.length;
    const totalExp = Number(report?.total_expense || 0);
    const avgPerDay = totalDays > 0 ? totalExp / totalDays : 0;
    let peakDay = null;
    let activeDaysCount = 0;

    for (const d of dailySeries) {
      if (d.total > 0) {
        activeDaysCount++;
        if (!peakDay || d.total > peakDay.total) {
          peakDay = d;
        }
      }
    }

    return {
      avgPerDay,
      peakDay,
      activeDaysCount,
      totalDays,
    };
  }, [dailySeries, report]);

  return (
    <>
      <PageHeading
        eyebrow="ANALYTICS"
        title="Turn spending into insight."
        description="Understand when you spend, how much you spend, and which categories are driving your money flow."
      />
      <div className="period-tabs">
        {["daily", "weekly", "monthly"].map((item) => (
          <button
            key={item}
            className={period === item ? "active" : ""}
            onClick={() => setPeriod(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="analytics-loading">
          <ChartSkeleton />
          <ChartSkeleton circle />
        </div>
      ) : (
        report && (
          <>
            <div className="analytics-hero">
              <div>
                <span className="eyebrow">{period.toUpperCase()} WINDOW</span>
                <strong>{money(report.total_expense)}</strong>
                <p>
                  {dateLabel(report.start_date)} — {dateLabel(report.end_date)}
                </p>
              </div>
              <div className="hero-metrics">
                <div>
                  <span>Transactions</span>
                  <strong>{number(report.transaction_count)}</strong>
                </div>
                <div>
                  <span>Average</span>
                  <strong>{money(report.average_per_transaction)}</strong>
                </div>
                <div>
                  <span>Top category</span>
                  <strong>{report.highest_spending_category || "—"}</strong>
                </div>
              </div>
            </div>

            <div className="analytics-kpi-grid">
              <div className="kpi-card">
                <span className="eyebrow">AVERAGE PER DAY</span>
                <strong>{money(analyticsKpis.avgPerDay)}</strong>
                <small>Over {analyticsKpis.totalDays} calendar {analyticsKpis.totalDays === 1 ? "day" : "days"}</small>
              </div>
              <div className="kpi-card">
                <span className="eyebrow">PEAK SPENDING DAY</span>
                <strong>{analyticsKpis.peakDay ? money(analyticsKpis.peakDay.total) : "—"}</strong>
                <small>
                  {analyticsKpis.peakDay
                    ? dateLabel(analyticsKpis.peakDay.date)
                    : "No spending recorded"}
                </small>
              </div>
              <div className="kpi-card">
                <span className="eyebrow">ACTIVE DAYS</span>
                <strong>{analyticsKpis.activeDaysCount} {analyticsKpis.activeDaysCount === 1 ? "day" : "days"}</strong>
                <small>
                  {analyticsKpis.totalDays - analyticsKpis.activeDaysCount} zero-spend {analyticsKpis.totalDays - analyticsKpis.activeDaysCount === 1 ? "day" : "days"}
                </small>
              </div>
            </div>

            <div className="dashboard-grid reports-grid">
              <section className="card chart-card daily-rhythm-card">
                <div className="card-head">
                  <div>
                    <span className="eyebrow">SPENDING RHYTHM</span>
                    <h3>Where your money moved</h3>
                    <p className="card-subtext">Daily spending during the selected period</p>
                  </div>
                </div>
                <DailySpendingChart
                  series={dailySeries}
                  totalExpense={Number(report.total_expense || 0)}
                />
              </section>

              <section className="card category-card">
                <div className="card-head">
                  <div>
                    <span className="eyebrow">CATEGORIES</span>
                    <h3>Where it goes</h3>
                  </div>
                </div>
                <DonutBreakdown
                  items={report.category_breakdown.slice(0, 6)}
                  total={report.total_expense}
                />
              </section>
            </div>

            <section className="card category-list-card">
              <div className="card-head">
                <div>
                  <span className="eyebrow">RANKED BREAKDOWN</span>
                  <h3>Category performance</h3>
                </div>
              </div>
              {report.category_breakdown.length ? (
                report.category_breakdown.map((item, index) => {
                  const totalExp = Number(report.total_expense || 0);
                  const pctNumber = totalExp > 0 ? (Number(item.total) / totalExp) * 100 : 0;
                  const pctString = pctNumber.toFixed(1);
                  return (
                    <div className="category-progress" key={item.category}>
                      <div className="progress-meta">
                        <span>
                          <b>{String(index + 1).padStart(2, "0")}</b>
                          <strong>{item.category}</strong>
                        </span>
                        <div className="progress-right-meta">
                          <strong>{money(item.total)}</strong>
                          <span className="pct-badge">{pctString}%</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <i style={{ width: `${Math.min(pctNumber, 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">No data in this period.</div>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => api.categories().then(setCategories).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.createCategory(form);
      setForm({ name: "", description: "" });
      setMessage("Category created successfully.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeading eyebrow="CATEGORIES" title="Organize your spending." description="Use meaningful categories so your reports tell a useful story." />
      <div className="categories-grid">
        <section className="card category-create">
          <div className="card-head"><div><span className="eyebrow">NEW CATEGORY</span><h3>Create one</h3></div><div className="create-orb">{ICONS.plus}</div></div>
          <form onSubmit={create} className="form-stack">
            <Field label="Category name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Subscriptions" />
            <Field label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Streaming, software, memberships…" />
            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}
            <button className="primary-btn full" disabled={busy}>{busy ? "Creating…" : "Create category"}{!busy && ICONS.arrow}</button>
          </form>
        </section>
        <section className="card category-list">
          <div className="card-head"><div><span className="eyebrow">YOUR TAXONOMY</span><h3>{number(categories.length)} categories</h3></div></div>
          <div className="category-cards">{categories.map((category, index) => <div className="category-item" key={category.id}><div className={`category-icon icon-${index % 5}`}>{category.name.charAt(0)}</div><div><strong>{category.name}</strong><span>{category.description || "No description added."}</span></div><b>{String(category.id).padStart(2, "0")}</b></div>)}</div>
        </section>
      </div>
    </>
  );
}

function ProfilePage({ user, onLogout }) {
  return (
    <>
      <PageHeading eyebrow="PROFILE" title="Your workspace identity." description="Your account details and session security." />
      <div className="profile-grid">
        <section className="card profile-hero-card">
          <div className="profile-avatar">{user.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
          <span className="eyebrow">ACCOUNT</span>
          <h2>{user.full_name}</h2>
          <p>{user.email}</p>
          <span className="verified-badge"><i /> Active account</span>
        </section>
        <section className="card profile-detail">
          <div className="detail-row"><div><span>Full name</span><strong>{user.full_name}</strong></div></div>
          <div className="detail-row"><div><span>Email</span><strong>{user.email}</strong></div></div>
          <div className="detail-row"><div><span>Member since</span><strong>{user.created_at ? dateLabel(user.created_at.slice(0, 10)) : "—"}</strong></div></div>
          <div className="security-card"><div className="security-ring">{ICONS.spark}</div><div><strong>JWT session</strong><span>Your authenticated session is protected by the FastAPI backend.</span></div></div>
          <button className="secondary-btn danger-btn" onClick={onLogout}>{ICONS.logout} Log out</button>
        </section>
      </div>
    </>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className="toast"><span className="toast-check">✓</span><div><strong>Done</strong><span>{message}</span></div><button onClick={onClose}>{ICONS.close}</button></div>;
}

export default App;
