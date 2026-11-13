
:root {
  --navy: #142d50;
  --navy-light: #203f69;
  --white: #ffffff;
  --bg: #eef1f5;
  --line: #dce2ea;
  --text: #172438;
  --muted: #7b8798;
  --green: #239b70;
  --red: #d94b55;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

.hidden {
  display: none !important;
}

/* LOGIN AND SIGNUP */
.auth-wrap {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #eef1f5, #ffffff);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 35px 26px;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 12px 40px rgba(20,45,80,.09);
}

.brand-mark {
  width: 65px;
  height: 65px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--navy);
  color: white;
  border-radius: 18px;
  font-size: 25px;
  font-weight: bold;
  margin: 0 auto 18px;
}

.auth-card h1 {
  color: var(--navy);
  text-align: center;
  font-size: 25px;
}

.sub {
  text-align: center;
  color: var(--muted);
  margin: 10px 0 28px;
}

/* INPUTS */
label {
  display: block;
  font-size: 13px;
  font-weight: bold;
  margin: 15px 0 7px;
  color: var(--navy);
}

input {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 11px;
  outline: none;
  background: #fafbfd;
  color: var(--text);
}

input:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(20,45,80,.08);
}

/* BUTTONS */
.primary, .outline, .danger, .link {
  border: none;
  padding: 13px 18px;
  border-radius: 11px;
  font-weight: bold;
  margin-top: 12px;
}

.primary {
  background: var(--navy);
  color: white;
}

.primary:hover {
  background: var(--navy-light);
}

.outline {
  background: white;
  color: var(--navy);
  border: 1px solid var(--navy);
}

.danger {
  background: var(--red);
  color: white;
}

.link {
  background: transparent;
  color: var(--navy);
}

.full {
  width: 100%;
}

/* APP */
.app-shell {
  min-height: 100vh;
  max-width: 1000px;
  margin: auto;
  background: var(--white);
  padding-bottom: 85px;
}

.topbar {
  height: 76px;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--navy);
}

.brand small {
  display: block;
  color: var(--muted);
  margin-top: 4px;
}

.brand-mark.small {
  width: 43px;
  height: 43px;
  font-size: 17px;
  margin: 0;
  border-radius: 12px;
}

.avatar-btn {
  width: 43px;
  height: 43px;
  border: 0;
  border-radius: 50%;
  background: var(--navy);
  color: white;
  font-weight: bold;
}

/* MAIN PAGES */
.main-content {
  padding: 22px;
}

.page {
  display: none;
}

.page.active {
  display: block;
}

.hero-card {
  padding: 26px;
  border-radius: 19px;
  background: var(--navy);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-card h2 {
  margin: 12px 0;
  font-size: 26px;
}

.hero-card p {
  color: #dce5f1;
  line-height: 1.6;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  opacity: .75;
}

.hero-icon {
  font-size: 45px;
}

.section-heading {
  margin: 28px 0 15px;
  color: var(--navy);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 13px;
}

.quick-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 15px;
  padding: 19px;
  text-align: left;
  color: var(--navy);
}

.quick-card span {
  display: block;
  font-size: 27px;
  margin-bottom: 12px;
}

.quick-card b,
.quick-card small {
  display: block;
}

.quick-card small {
  color: var(--muted);
  margin-top: 6px;
}

/* HEADINGS */
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  color: var(--navy);
}

.page-heading h2 {
  font-size: 25px;
  margin-top: 5px;
}

.round-action {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: var(--navy);
  color: white;
  font-size: 25px;
}

.back-btn {
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--navy);
}

/* PANELS */
.panel, .info-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 17px;
}

.panel h3 {
  color: var(--navy);
  margin-bottom: 12px;
}

.muted {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 10px 0;
}

.info-card {
  margin-top: 20px;
  background: #f7f9fc;
}

/* SEARCH */
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg);
  padding: 5px 13px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.search-box input {
  background: transparent;
  border: none;
  box-shadow: none;
}

/* EMPTY STATES */
.empty-state {
  text-align: center;
  padding: 45px 18px;
  background: #f8fafc;
  border-radius: 17px;
  border: 1px dashed var(--line);
}

.empty-state h3 {
  color: var(--navy);
  margin: 12px 0;
}

.empty-state p {
  color: var(--muted);
  line-height: 1.6;
  font-size: 14px;
}

.empty-icon {
  font-size: 42px;
}

.compact {
  padding: 30px 15px;
}

/* CALLS */
.call-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.call-card {
  text-align: center;
}

.call-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.call-stage {
  text-align: center;
  padding: 45px 15px;
  background: #f8fafc;
  border-radius: 18px;
}

.call-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--navy);
  color: white;
  display: grid;
  place-items: center;
  font-size: 40px;
  margin: 0 auto 22px;
}

.video-placeholder {
  height: 200px;
  background: #dce2ea;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 45px;
  margin-bottom: 20px;
}

.status-chip {
  display: inline-block;
  background: #edf1f6;
  color: var(--navy);
  padding: 8px 13px;
  border-radius: 20px;
  font-size: 12px;
  margin: 15px 0;
}

.notice {
  padding: 15px;
  background: #f3f6fa;
  color: var(--muted);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}

/* PROFILE */
.profile-panel {
  text-align: center;
}

.profile-avatar {
  width: 85px;
  height: 85px;
  display: grid;
  place-items: center;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: var(--navy);
  color: white;
  font-size: 30px;
}

.uid-box {
  margin-top: 22px;
  padding: 15px;
  background: #f4f6f9;
  border-radius: 12px;
  overflow-wrap: anywhere;
}

.uid-box small {
  color: var(--muted);
}

/* SETTINGS */
.settings-list {
  display: grid;
  gap: 10px;
  margin-bottom: 22px;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 16px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 13px;
  text-align: left;
  color: var(--navy);
}

.settings-row span {
  font-size: 23px;
}

.settings-row div {
  flex: 1;
}

.settings-row small {
  display: block;
  color: var(--muted);
  margin-top: 5px;
}

.settings-row i {
  font-size: 22px;
  font-style: normal;
}

/* NAVIGATION */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 1000px;
  height: 72px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: white;
  border-top: 1px solid var(--line);
  z-index: 20;
}

.nav-item {
  border: none;
  background: transparent;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 55px;
}

.nav-item span {
  font-size: 21px;
}

.nav-item small {
  font-size: 11px;
}

.nav-item.selected {
  color: var(--navy);
  font-weight: bold;
}

/* MESSAGES */
.message {
  font-size: 13px;
  color: var(--green);
  margin-top: 12px;
  line-height: 1.5;
}

/* MOBILE */
@media (max-width: 600px) {
  .main-content {
    padding: 15px;
  }

  .auth-card {
    padding: 28px 20px;
  }

  .hero-card {
    padding: 20px;
  }

  .hero-card h2 {
    font-size: 22px;
  }

  .call-grid {
    grid-template-columns: 1fr;
  }

  .quick-card {
    padding: 15px;
  }
}
