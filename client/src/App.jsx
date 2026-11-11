const navigation = [
  { label: "Overview", icon: "◫", active: true },
  { label: "Accounts", icon: "▤" },
  { label: "Transactions", icon: "⇄" },
  { label: "Budgets", icon: "◎" },
];

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="BalanceVault home">
          <span className="brand-mark">B</span>
          <span>Balance<span className="brand-light">Vault</span></span>
        </a>

        <p className="nav-caption">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              className={`nav-link${item.active ? " active" : ""}`}
              href="#"
              key={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <div>
              <strong>Need a hand?</strong>
              <span>We&apos;re here to help.</span>
            </div>
          </div>
          <button className="profile-button" type="button">
            <span className="avatar">BV</span>
            <span className="profile-copy">
              <strong>Your workspace</strong>
              <span>Personal account</span>
            </span>
            <span className="profile-menu" aria-hidden="true">···</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <button className="icon-button notification-button" type="button" aria-label="Notifications">
            ♧<span className="notification-dot" />
          </button>
        </header>

        <section className="page-intro">
          <div>
            <p className="eyebrow">YOUR FINANCES, IN FOCUS</p>
            <h1>Good morning <span aria-hidden="true">✦</span></h1>
            <p className="intro-copy">A clearer view of your financial picture starts here.</p>
          </div>
          <button className="date-button" type="button">
            <span aria-hidden="true">▦</span> This month <span className="chevron">⌄</span>
          </button>
        </section>

        <section className="summary-grid" aria-label="Financial summary">
          <article className="summary-card balance-card">
            <div className="card-heading">
              <span className="card-label">Total balance</span>
              <span className="card-symbol balance-symbol" aria-hidden="true">$</span>
            </div>
            <p className="balance-placeholder">Connect an account</p>
            <p className="card-footnote">Your connected balances will appear here</p>
            <div className="balance-decoration" aria-hidden="true" />
          </article>
          <article className="summary-card">
            <div className="card-heading">
              <span className="card-label">Income</span>
              <span className="card-symbol income-symbol" aria-hidden="true">↙</span>
            </div>
            <p className="empty-value">—</p>
            <p className="card-footnote">No activity to show yet</p>
          </article>
          <article className="summary-card">
            <div className="card-heading">
              <span className="card-label">Expenses</span>
              <span className="card-symbol expense-symbol" aria-hidden="true">↗</span>
            </div>
            <p className="empty-value">—</p>
            <p className="card-footnote">No activity to show yet</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Cash flow</h2>
                <p>Track your income and spending over time</p>
              </div>
              <button className="period-button" type="button">Last 6 months <span>⌄</span></button>
            </div>
            <div className="chart-empty">
              <div className="chart-lines" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div className="chart-message">
                <span className="chart-icon" aria-hidden="true">⌁</span>
                <strong>Your cash flow starts here</strong>
                <span>Connect an account to see your activity.</span>
              </div>
              <div className="chart-months" aria-hidden="true">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
            </div>
          </article>

          <article className="panel accounts-panel">
            <div className="panel-heading">
              <div>
                <h2>My accounts</h2>
                <p>Your accounts in one place</p>
              </div>
              <button className="text-button" type="button" aria-label="More account options">···</button>
            </div>
            <div className="account-empty">
              <div className="account-illustration" aria-hidden="true">
                <span className="account-card-back" />
                <span className="account-card-front"><i /><i /><i /></span>
              </div>
              <strong>No accounts yet</strong>
              <span>Add an account to get your<br />full financial overview.</span>
              <button className="primary-button" type="button">
                <span aria-hidden="true">+</span> Add an account
              </button>
            </div>
          </article>
        </section>

        <footer className="page-footer">
          <span>BalanceVault <span className="footer-dot">·</span> Your money, made clearer.</span>
          <span>Secure by design <span className="shield" aria-hidden="true">⌑</span></span>
        </footer>
      </main>
    </div>
  );
}

export default App;
