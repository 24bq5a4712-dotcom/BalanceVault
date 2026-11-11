import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, errorMessage } from "./api.js";

const accountTypes = ["BANK", "CASH", "CREDIT", "INVESTMENT", "OTHER"];
const accountTypeLabels = {
  BANK: "Bank account",
  CASH: "Cash",
  CREDIT: "Credit account",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

function formatCurrency(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function displayDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function makeTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function Alert({ children, onDismiss }) {
  if (!children) return null;
  return (
    <div className="bv-alert" role="alert">
      <span>{children}</span>
      {onDismiss && (
        <button type="button" className="bv-alert-close" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const result = await apiRequest(path, {
        method: "POST",
        body: form,
      });
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bv-auth-page">
      <section className="bv-auth-brand">
        <a className="brand bv-auth-logo" href="/" aria-label="BalanceVault home">
          <span className="brand-mark">B</span>
          <span>Balance<span className="brand-light">Vault</span></span>
        </a>
        <div className="bv-auth-pitch">
          <p className="eyebrow">YOUR FINANCES, IN FOCUS</p>
          <h1>A clearer view of your money.</h1>
          <p>Bring your account overview together in one calm, secure workspace.</p>
          <div className="bv-auth-decoration" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
        </div>
        <span className="bv-auth-footnote">Private by design. Built for clarity.</span>
      </section>
      <section className="bv-auth-form-wrap">
        <form className="bv-auth-form" onSubmit={submit}>
          <p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
          <h2>{mode === "login" ? "Sign in to BalanceVault" : "Create your account"}</h2>
          <p className="bv-muted">
            {mode === "login"
              ? "Enter your details to continue to your workspace."
              : "Your new account will be created as an account holder."}
          </p>
          <Alert>{error}</Alert>
          {mode === "register" && (
            <label className="bv-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                maxLength={100}
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>
          )}
          <label className="bv-field">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label className="bv-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? undefined : 12}
              maxLength={72}
              required
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
            {mode === "register" && <small>Use at least 12 characters.</small>}
          </label>
          <button className="bv-primary bv-full-button" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="bv-auth-switch">
            {mode === "login" ? "New to BalanceVault?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

function PasswordChange({ onChanged, onLogout }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/password", {
        method: "POST",
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      onChanged(result.user);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bv-gate-page">
      <form className="bv-card bv-gate-card" onSubmit={submit}>
        <span className="bv-gate-icon" aria-hidden="true">⌑</span>
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Choose a new password</h1>
        <p className="bv-muted">Your administrator provided a temporary password. Change it before continuing.</p>
        <Alert>{error}</Alert>
        <label className="bv-field">
          <span>Temporary password</span>
          <input type="password" autoComplete="current-password" required value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
        </label>
        <label className="bv-field">
          <span>New password</span>
          <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
          <small>Use 12 to 72 characters.</small>
        </label>
        <label className="bv-field">
          <span>Confirm new password</span>
          <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
        </label>
        <button className="bv-primary bv-full-button" disabled={loading} type="submit">
          {loading ? "Updating…" : "Update password"}
        </button>
        <button className="bv-link-button bv-centered" type="button" onClick={onLogout}>Sign out</button>
      </form>
    </main>
  );
}

function AccountForm({ account, onCancel, onSave, loading }) {
  const [form, setForm] = useState({
    name: account?.name ?? "",
    type: account?.type ?? "BANK",
    institution: account?.institution ?? "",
    currency: account?.currency ?? "USD",
  });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave({
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        currency: form.currency.toUpperCase(),
      });
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <div className="bv-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <form className="bv-modal" onSubmit={submit} aria-labelledby="account-form-title">
        <div className="bv-modal-heading">
          <div>
            <p className="eyebrow">{account ? "ACCOUNT DETAILS" : "NEW ACCOUNT"}</p>
            <h2 id="account-form-title">{account ? "Edit account" : "Add an account"}</h2>
          </div>
          <button className="bv-icon-button" type="button" onClick={onCancel} aria-label="Close form">×</button>
        </div>
        <Alert>{error}</Alert>
        <label className="bv-field">
          <span>Account name</span>
          <input autoFocus required maxLength={100} value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="bv-field">
          <span>Account type</span>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {accountTypes.map((type) => <option value={type} key={type}>{accountTypeLabels[type]}</option>)}
          </select>
        </label>
        <label className="bv-field">
          <span>Institution <small>(optional)</small></span>
          <input maxLength={100} value={form.institution}
            onChange={(event) => setForm({ ...form, institution: event.target.value })} />
        </label>
        <label className="bv-field">
          <span>Currency code</span>
          <input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={form.currency}
            onChange={(event) => setForm({ ...form, currency: event.target.value })} />
          <small>Three-letter currency code, for example USD.</small>
        </label>
        <p className="bv-form-note">Balances are read-only in this version and start at zero.</p>
        <div className="bv-form-actions">
          <button className="bv-secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="bv-primary" type="submit" disabled={loading}>
            {loading ? "Saving…" : account ? "Save changes" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountCard({ account, onEdit, onClose, closing }) {
  return (
    <article className="bv-account-card">
      <div className="bv-account-icon" aria-hidden="true">{account.type.slice(0, 1)}</div>
      <div className="bv-account-main">
        <div className="bv-account-title">
          <h3>{account.name}</h3>
          <span className="bv-status bv-status-active">Active</span>
        </div>
        <p>{accountTypeLabels[account.type]}{account.institution ? ` · ${account.institution}` : ""}</p>
        <strong>{formatCurrency(account.balance, account.currency)}</strong>
      </div>
      <div className="bv-account-actions">
        <button className="bv-secondary bv-small-button" type="button" onClick={() => onEdit(account)}>Edit</button>
        <button className="bv-danger-button" type="button" disabled={closing} onClick={() => onClose(account)}>
          {closing ? "Closing…" : "Close"}
        </button>
      </div>
    </article>
  );
}

function AccountsView({ accounts, loading, onAdd, onEdit, onClose, closingId }) {
  const totalByCurrency = useMemo(() => accounts.reduce((totals, account) => {
    totals[account.currency] = (totals[account.currency] ?? 0) + Number(account.balance);
    return totals;
  }, {}), [accounts]);

  return (
    <>
      <section className="bv-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCES, IN FOCUS</p>
          <h1>Accounts</h1>
          <p className="bv-muted">Manage the accounts in your personal overview.</p>
        </div>
        <button className="bv-primary" type="button" onClick={onAdd}>
          <span aria-hidden="true">+</span> Add account
        </button>
      </section>
      <section className="bv-summary-strip" aria-label="Account summary">
        <div><span>Active accounts</span><strong>{loading ? "…" : accounts.length}</strong></div>
        <div><span>Balances</span><strong className="bv-currency-summary">
          {loading ? "…" : Object.entries(totalByCurrency).length
            ? Object.entries(totalByCurrency).map(([currency, total]) => formatCurrency(total, currency)).join(" · ")
            : "No balance yet"}
        </strong></div>
      </section>
      <section className="bv-panel bv-list-panel">
        <div className="bv-section-heading">
          <div><h2>Your accounts</h2><p>Only you can view and manage these accounts.</p></div>
        </div>
        {loading ? <div className="bv-loading" role="status">Loading your accounts…</div>
          : accounts.length === 0
            ? <div className="bv-empty-state">
              <span className="bv-empty-icon" aria-hidden="true">▤</span>
              <h3>No accounts yet</h3>
              <p>Add an account to begin organizing your financial overview.</p>
              <button className="bv-primary" type="button" onClick={onAdd}>Add your first account</button>
            </div>
            : <div className="bv-account-list">{accounts.map((account) => (
              <AccountCard key={account.id} account={account} onEdit={onEdit} onClose={onClose}
                closing={closingId === account.id} />
            ))}</div>}
      </section>
    </>
  );
}

function Overview({ user, accounts, onOpenAccounts }) {
  const grouped = useMemo(() => accounts.reduce((totals, account) => {
    totals[account.currency] = (totals[account.currency] ?? 0) + Number(account.balance);
    return totals;
  }, {}), [accounts]);

  return (
    <>
      <section className="bv-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCES, IN FOCUS</p>
          <h1>Good to see you, {user.name.split(" ")[0]}</h1>
          <p className="bv-muted">Here&apos;s a simple snapshot of your account workspace.</p>
        </div>
        <button className="bv-primary" type="button" onClick={onOpenAccounts}>Manage accounts</button>
      </section>
      <section className="summary-grid bv-connected-summary">
        <article className="summary-card balance-card">
          <div className="card-heading"><span className="card-label">Total balance</span><span className="card-symbol balance-symbol">$</span></div>
          <div className="bv-total-values">
            {Object.entries(grouped).length
              ? Object.entries(grouped).map(([currency, total]) => <strong key={currency}>{formatCurrency(total, currency)}</strong>)
              : <strong>{accounts.length ? "—" : "No accounts yet"}</strong>}
          </div>
          <p className="card-footnote">{accounts.length} active account{accounts.length === 1 ? "" : "s"} · balances are informational</p>
          <div className="balance-decoration" aria-hidden="true" />
        </article>
        <article className="summary-card">
          <div className="card-heading"><span className="card-label">Accounts</span><span className="card-symbol income-symbol">▤</span></div>
          <p className="empty-value">{accounts.length}</p><p className="card-footnote">Active accounts in your workspace</p>
        </article>
        <article className="summary-card">
          <div className="card-heading"><span className="card-label">Transactions</span><span className="card-symbol expense-symbol">⇄</span></div>
          <p className="empty-value">—</p><p className="card-footnote">Transaction tracking is not available yet</p>
        </article>
      </section>
      <section className="bv-panel bv-overview-accounts">
        <div className="bv-section-heading">
          <div><h2>Recent accounts</h2><p>Account information is private to your profile.</p></div>
          <button className="bv-link-button" type="button" onClick={onOpenAccounts}>View all</button>
        </div>
        {accounts.length ? <div className="bv-account-list">{accounts.slice(0, 3).map((account) => (
          <article className="bv-account-card bv-account-card-readonly" key={account.id}>
            <div className="bv-account-icon" aria-hidden="true">{account.type.slice(0, 1)}</div>
            <div className="bv-account-main">
              <div className="bv-account-title"><h3>{account.name}</h3><span className="bv-status bv-status-active">Active</span></div>
              <p>{accountTypeLabels[account.type]}{account.institution ? ` · ${account.institution}` : ""}</p>
            </div>
            <strong className="bv-account-balance">{formatCurrency(account.balance, account.currency)}</strong>
          </article>
        ))}</div> : <div className="bv-empty-compact"><p>Your accounts will appear here after you add one.</p><button className="bv-secondary" type="button" onClick={onOpenAccounts}>Open accounts</button></div>}
      </section>
    </>
  );
}

function AdminView({ users, logs, loading, onCreate, onUserUpdate }) {
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "HOLDER" });
  const [creating, setCreating] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function createUser(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setTemporaryPassword("");
    const password = makeTemporaryPassword();
    try {
      await onCreate({ ...newUser, password });
      setTemporaryPassword({ value: password, email: newUser.email });
      setNewUser({ name: "", email: "", role: "HOLDER" });
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function updateUser(id, changes) {
    setUpdatingId(id);
    setError("");
    try {
      await onUserUpdate(id, changes);
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setUpdatingId("");
    }
  }

  async function resetPassword(user) {
    setUpdatingId(user.id);
    setError("");
    const password = makeTemporaryPassword();
    try {
      await onUserUpdate(user.id, { temporaryPassword: password, resetPassword: true });
      setTemporaryPassword({ value: password, email: user.email });
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setUpdatingId("");
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword.value);
    } catch {
      setError("Clipboard access was unavailable. Select and copy the temporary password manually.");
    }
  }

  return (
    <>
      <section className="bv-page-heading">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Admin dashboard</h1>
          <p className="bv-muted">Manage user access and review security-relevant activity.</p></div>
      </section>
      <Alert>{error}</Alert>
      <section className="bv-admin-grid">
        <section className="bv-panel">
          <div className="bv-section-heading"><div><h2>Onboard a user</h2>
            <p>A one-time password is generated for out-of-band delivery.</p></div></div>
          <form className="bv-admin-create-form" onSubmit={createUser}>
            <label className="bv-field"><span>Name</span><input required maxLength={100} value={newUser.name}
              onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /></label>
            <label className="bv-field"><span>Email</span><input required type="email" maxLength={254} value={newUser.email}
              onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
            <label className="bv-field"><span>Role</span><select value={newUser.role}
              onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>
              <option value="HOLDER">Account holder</option><option value="ADMIN">Administrator</option>
            </select></label>
            <button className="bv-primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create user"}</button>
          </form>
          {temporaryPassword && <div className="bv-temp-password" role="status">
            <strong>Copy this temporary password now</strong>
            <span className="bv-temp-password-email">{temporaryPassword.email}</span>
            <p>It is shown only in this screen and the user must change it after signing in.</p>
            <div><code>{temporaryPassword.value}</code><button className="bv-secondary bv-small-button" type="button" onClick={copyPassword}>Copy</button></div>
          </div>}
        </section>
        <section className="bv-panel">
          <div className="bv-section-heading"><div><h2>User access</h2><p>Role and status changes take effect immediately.</p></div></div>
          {loading ? <div className="bv-loading">Loading users…</div> : users.length === 0
            ? <p className="bv-muted">No users found.</p>
            : <div className="bv-table-wrap"><table className="bv-table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{users.map((item) => <tr key={item.id}>
                <td><strong>{item.name}</strong><small>{item.email}</small>{item.mustChangePassword && <small className="bv-warning-text">Password change required</small>}</td>
                <td><select aria-label={`Role for ${item.email}`} value={item.role} disabled={updatingId === item.id}
                  onChange={(event) => updateUser(item.id, { role: event.target.value })}>
                  <option value="HOLDER">Holder</option><option value="ADMIN">Admin</option></select></td>
                <td><select aria-label={`Status for ${item.email}`} value={item.status} disabled={updatingId === item.id}
                  onChange={(event) => updateUser(item.id, { status: event.target.value })}>
                  <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></td>
                <td><button className="bv-secondary bv-small-button" type="button" disabled={updatingId === item.id}
                  onClick={() => resetPassword(item)}>{updatingId === item.id ? "Working…" : "Reset password"}</button></td>
              </tr>)}</tbody>
            </table></div>}
        </section>
      </section>
      <section className="bv-panel bv-audit-panel">
        <div className="bv-section-heading"><div><h2>Audit activity</h2><p>Most recent recorded authentication and administrative events.</p></div></div>
        {loading ? <div className="bv-loading">Loading audit events…</div> : logs.length === 0
          ? <div className="bv-empty-compact"><p>No audit events are available.</p></div>
          : <div className="bv-table-wrap"><table className="bv-table bv-audit-table">
            <thead><tr><th>Action</th><th>Actor ID</th><th>Target</th><th>Time</th></tr></thead>
            <tbody>{logs.map((log) => <tr key={log.id}>
              <td><span className="bv-audit-action">{log.action}</span></td>
              <td>{log.actorId ?? "System"}</td>
              <td>{log.targetType}{log.targetId ? ` · ${log.targetId}` : ""}</td>
              <td>{displayDate(log.createdAt)}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </>
  );
}

function BalanceVaultApp() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountForm, setAccountForm] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [closingId, setClosingId] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadWorkspace = useCallback(async (currentUser) => {
    if (!currentUser || currentUser.mustChangePassword) return;
    setDataLoading(true);
    setError("");
    try {
      if (currentUser.role === "HOLDER") {
        const result = await apiRequest("/api/accounts");
        setAccounts(result.accounts);
      } else {
        const [userResult, logResult] = await Promise.all([
          apiRequest("/api/admin/users"),
          apiRequest("/api/admin/audit-logs?limit=100"),
        ]);
        setUsers(userResult.users);
        setLogs(logResult.logs);
      }
    } catch (loadError) {
      if (loadError.status === 401) {
        setError("");
        setUser(null);
      } else {
        setError(errorMessage(loadError));
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((requestError) => {
        if (active && requestError.status !== 401) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (user && !user.mustChangePassword) void loadWorkspace(user);
    else {
      setAccounts([]);
      setUsers([]);
      setLogs([]);
    }
  }, [user, loadWorkspace]);

  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setUser(null);
      setActiveView("overview");
    } catch (logoutError) {
      setError(errorMessage(logoutError));
    } finally {
      setLoggingOut(false);
    }
  }

  async function saveAccount(changes) {
    setSavingAccount(true);
    try {
      if (accountForm?.id) {
        await apiRequest(`/api/accounts/${accountForm.id}`, { method: "PATCH", body: changes });
      } else {
        await apiRequest("/api/accounts", { method: "POST", body: changes });
      }
      setAccountForm(null);
      await loadWorkspace(user);
    } finally {
      setSavingAccount(false);
    }
  }

  async function closeAccount(account) {
    if (!window.confirm(`Close "${account.name}"? It will be removed from your active account list.`)) return;
    setClosingId(account.id);
    setError("");
    try {
      await apiRequest(`/api/accounts/${account.id}`, { method: "DELETE" });
      await loadWorkspace(user);
    } catch (closeError) {
      setError(errorMessage(closeError));
    } finally {
      setClosingId("");
    }
  }

  async function createUser(data) {
    await apiRequest("/api/admin/users", { method: "POST", body: data });
    await loadWorkspace(user);
  }

  async function updateUser(id, changes) {
    if (changes.resetPassword) {
      await apiRequest(`/api/admin/users/${id}/password-reset`, {
        method: "POST",
        body: { temporaryPassword: changes.temporaryPassword },
      });
      await loadWorkspace(user);
      return;
    }
    await apiRequest(`/api/admin/users/${id}`, { method: "PATCH", body: changes });
    await loadWorkspace(user);
  }

  if (sessionLoading) {
    return <main className="bv-splash" role="status"><span className="brand-mark">B</span><p>Opening your secure workspace…</p></main>;
  }
  if (!user) return <><AuthScreen onAuthenticated={(authenticatedUser) => {
    setError("");
    setUser(authenticatedUser);
  }} /><Alert>{error}</Alert></>;
  if (user.mustChangePassword) return <PasswordChange onChanged={setUser} onLogout={logout} />;

  const isAdmin = user.role === "ADMIN";
  const views = isAdmin
    ? [{ id: "admin", label: "Administration", icon: "◉" }]
    : [{ id: "overview", label: "Overview", icon: "◫" }, { id: "accounts", label: "Accounts", icon: "▤" }];
  const heading = activeView === "accounts" ? "Accounts" : isAdmin ? "Administration" : "Overview";

  return (
    <div className="app-shell bv-app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="BalanceVault home">
          <span className="brand-mark">B</span>
          <span>Balance<span className="brand-light">Vault</span></span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          {views.map((view) => <button key={view.id} type="button"
            className={`nav-link${activeView === view.id ? " active" : ""}`}
            aria-current={activeView === view.id ? "page" : undefined}
            onClick={() => setActiveView(view.id)}>
            <span className="nav-icon" aria-hidden="true">{view.icon}</span>{view.label}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">?</span><div><strong>Need a hand?</strong><span>Keep your account secure.</span></div></div>
          <div className="bv-profile">
            <span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
            <span className="profile-copy"><strong>{user.name}</strong><span>{isAdmin ? "Administrator" : "Account holder"}</span></span>
          </div>
          <button className="bv-logout-button" type="button" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <main className="main-content bv-main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {heading}</div>
          <span className="bv-secure-label"><span aria-hidden="true">⌑</span> Secure session</span></header>
        <div className="bv-page-content">
          <Alert onDismiss={() => setError("")}>{error}</Alert>
          {isAdmin
            ? <AdminView users={users} logs={logs} loading={dataLoading} onCreate={createUser} onUserUpdate={updateUser} />
            : activeView === "accounts"
              ? <AccountsView accounts={accounts} loading={dataLoading} onAdd={() => setAccountForm({})}
                onEdit={setAccountForm} onClose={closeAccount} closingId={closingId} />
              : <Overview user={user} accounts={accounts} onOpenAccounts={() => setActiveView("accounts")} />}
          <footer className="page-footer"><span>BalanceVault <span className="footer-dot">·</span> Your money, made clearer.</span>
            <span>Balances are informational only</span></footer>
        </div>
      </main>
      {accountForm && <AccountForm account={accountForm.id ? accountForm : null}
        onCancel={() => setAccountForm(null)} onSave={saveAccount} loading={savingAccount} />}
    </div>
  );
}

export default BalanceVaultApp;
