const API_URL = "/api/v1";

async function request(path, options = {}) {
  const token = localStorage.getItem("expenseflow_token");
  const headers = new Headers(options.headers || {});

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      (typeof data === "string" ? data : null) ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;

    throw error;
  }

  return data;
}

export const api = {
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async login(email, password) {
    const body = new URLSearchParams();

    body.set("username", email);
    body.set("password", password);

    return request("/auth/login", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  me() {
    return request("/auth/me");
  },

  categories() {
    return request("/categories");
  },

  createCategory(payload) {
    return request("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  expenses(params = {}) {
    const search = new URLSearchParams();

    if (params.startDate) {
      search.set("start_date", params.startDate);
    }

    if (params.endDate) {
      search.set("end_date", params.endDate);
    }

    if (params.categoryId) {
      search.set("category_id", params.categoryId);
    }

    const query = search.toString();

    return request(
      `/expenses${query ? `?${query}` : ""}`
    );
  },

  createExpense(payload) {
    return request("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateExpense(id, payload) {
    return request(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteExpense(id) {
    return request(`/expenses/${id}`, {
      method: "DELETE",
    });
  },

  dashboard() {
    return request("/reports/dashboard");
  },

  report(period) {
    return request(`/reports/summary?period=${period}`);
  },

  // ✅ NEW AI METHOD
  aiInsight(period = "monthly") {
    return request("/ai/insights", {
      method: "POST",
      body: JSON.stringify({
        period,
      }),
    });
  },
};