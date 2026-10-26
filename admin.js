import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, setPersistence, browserLocalPersistence, connectAuthEmulator, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js";

const hostname = location.hostname;
const local = ["localhost", "127.0.0.1"].includes(hostname);
const privateLan = /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
const useEmulator = local || (new URLSearchParams(location.search).get("emulator") === "1" && privateLan);
const app = initializeApp({
  apiKey: "AIzaSyDVYYv3TMRKWktXA33jOGjniz43hDfRVe4",
  authDomain: "craving-heaven-e2e94.firebaseapp.com",
  projectId: useEmulator ? "demo-craving-heaven-local" : "craving-heaven-e2e94",
  storageBucket: "craving-heaven-e2e94.firebasestorage.app",
  messagingSenderId: "20081214048",
  appId: "1:20081214048:web:cae67b0874111ab653905"
});
if (!useEmulator) initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider("6LdBasMtAAAAAJE5V6ZDZefojEfJx9vfDFowfIjU"), isTokenAutoRefreshEnabled: true });
const auth = getAuth(app);
if (useEmulator) connectAuthEmulator(auth, `http://${hostname}:9400`, { disableWarnings: true });
const authPersistence = setPersistence(auth, browserLocalPersistence);
const functions = getFunctions(app, "asia-south1");
if (useEmulator) connectFunctionsEmulator(functions, hostname, 9402);

const $ = id => document.getElementById(id);
const gameTestDialog = $("adminGameTestDialog");
$("closeAdminGameTest").addEventListener("click", () => {
  gameTestDialog.close();
  $("adminGameTestFrame").src = "about:blank";
  sessionStorage.removeItem("cravingDashAdminTest");
});
window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== $("adminGameTestFrame").contentWindow || event.data?.type !== "craving-dash-admin-test-close") return;
  $("closeAdminGameTest").click();
});
const call = (name, data = {}) => httpsCallable(functions, name)(data).then(result => result.data);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const mobileDigits = value => String(value || "").replace(/\D/g, "").replace(/^91(?=[6-9]\d{9}$)/, "").slice(-10);
const dateText = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
let verifier = null, confirmation = null, currentUser = null, menu = {}, combos = [], rewards = [], gameConfig = { enabled: false, campaignId: "campaign-v1", stages: [] }, gameIsLive = false, gameHasUnpublishedChanges = false, customers = [], analyticsRange = "today", orderingStatus = null;

function message(el, text, state = "") { el.textContent = text; el.className = `message ${state}`.trim(); }
function resetRecaptcha() { if (verifier) verifier.clear(); verifier = null; $("adminRecaptcha").replaceChildren(); }
function requireSignedInAdmin(user) {
  currentUser = user;
  if (!user) { $("adminApp").hidden = true; $("adminLogin").hidden = false; $("adminLogout").hidden = true; return; }
  user.getIdTokenResult(true).then(token => {
    if (token.claims.admin !== true) {
      message($("adminAuthMessage"), "This account does not have administrator access. Ask an admin to grant it.", "error");
      return signOut(auth);
    }
    $("adminLogin").hidden = true; $("adminApp").hidden = false; $("adminLogout").hidden = false;
    $("adminSignedInAs").textContent = user.phoneNumber || user.displayName || "Administrator";
    loadInitial();
  }).catch(error => message($("adminAuthMessage"), friendlyError(error), "error"));
}
function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) return "Administrator access is required. Sign in with an authorized admin number.";
  if (code.includes("not-found")) return "No account found for that number. Sign in on the website with OTP once first.";
  if (code.includes("failed-precondition")) return error.message || "This action cannot be completed yet.";
  if (code.includes("unauthenticated") || code.includes("app-check")) return "Firebase could not verify this secure request. Refresh the Admin page and try again. If it continues, check the website domain and App Check setup in Firebase.";
  if (code.includes("internal")) return "Firebase could not complete this request. Refresh the Admin page and retry. If it repeats, check the Firebase App Check and Functions logs.";
  return error?.message?.replace(/^FirebaseError:\s*/i, "") || "Something went wrong. Please try again.";
}

$("adminPhoneForm").addEventListener("submit", async event => {
  event.preventDefault(); await authPersistence;
  const digits = mobileDigits($("adminPhone").value);
  if (!/^[6-9]\d{9}$/.test(digits)) return message($("adminAuthMessage"), "Enter a valid 10-digit Indian mobile number.", "error");
  const button = $("adminSendOtp"); button.disabled = true; message($("adminAuthMessage"), "Sending verification code…");
  try {
    if (!verifier) verifier = new RecaptchaVerifier(auth, "adminRecaptcha", { size: "invisible" });
    confirmation = await signInWithPhoneNumber(auth, `+91${digits}`, verifier);
    $("adminPhoneForm").hidden = true; $("adminOtpForm").hidden = false; message($("adminAuthMessage"), `Verification code sent to +91 ${digits}.`);
    $("adminOtp").focus();
  } catch (error) { resetRecaptcha(); message($("adminAuthMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});
$("adminOtpForm").addEventListener("submit", async event => {
  event.preventDefault(); const code = $("adminOtp").value.replace(/\D/g, "");
  if (!confirmation || code.length !== 6) return message($("adminAuthMessage"), "Enter the 6-digit verification code.", "error");
  $("adminVerifyOtp").disabled = true;
  try { await confirmation.confirm(code); }
  catch (error) { message($("adminAuthMessage"), friendlyError(error), "error"); resetRecaptcha(); }
  finally { $("adminVerifyOtp").disabled = false; }
});
$("adminChangeNumber").addEventListener("click", () => { confirmation = null; resetRecaptcha(); $("adminOtpForm").hidden = true; $("adminPhoneForm").hidden = false; $("adminOtp").value = ""; });
$("adminLogout").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, requireSignedInAdmin);

async function loadInitial() {
  await Promise.allSettled([loadAnalytics(), loadCustomers(), loadAccess(), loadBusinessConfig(), loadOrdering()]);
}
async function loadAnalytics() {
  message($("analyticsMessage"), "Loading sales…");
  try {
    const data = await call("adminGetSalesAnalytics", { range: analyticsRange });
    $("metricSales").textContent = money(data.summary.total.sales); $("metricOrders").textContent = `${data.summary.total.orders} orders`;
    $("metricOnlineSales").textContent = money(data.summary.online.sales); $("metricOnlineOrders").textContent = `${data.summary.online.orders} orders`;
    $("metricWalkinSales").textContent = money(data.summary.walkIn.sales); $("metricWalkinOrders").textContent = `${data.summary.walkIn.orders} orders`;
    const rows = data.items.slice(0, 50);
    $("itemSalesRows").innerHTML = rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${Number(row.quantity)}</td><td>${money(row.listedValue)}</td></tr>`).join("") : '<tr><td colspan="3" class="empty-cell">No sales for this period yet.</td></tr>';
    const locations = data.locations || [];
    $("locationSalesRows").innerHTML = locations.length ? locations.map(row => `<tr><td>${escapeHtml(row.location)}</td><td>${Number(row.orders)}</td><td>${money(row.sales)}</td></tr>`).join("") : '<tr><td colspan="3" class="empty-cell">No sales for this period yet.</td></tr>';
    const weekdays = data.weekdays || [], max = Math.max(1, ...weekdays.map(row => Number(row.sales)));
    $("weekdayChart").innerHTML = weekdays.map(row => `<div class="weekday-row"><span>${escapeHtml(row.day)}</span><div class="weekday-track"><div class="weekday-fill" style="width:${Math.max(0, Math.min(100, Number(row.sales) / max * 100))}%"></div></div><strong>${money(row.sales)}</strong></div>`).join("");
    message($("analyticsMessage"), `${data.range === "today" ? "Today" : data.range === "week" ? "This week" : "This month"} · ${data.startDate} to ${data.endDate}${data.truncated ? " · Showing the most recent 20,000 orders" : ""}`, "success");
  } catch (error) { message($("analyticsMessage"), friendlyError(error), "error"); }
}
document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => {
  analyticsRange = button.dataset.range; document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("selected", item === button)); loadAnalytics();
}));

async function loadCustomers() {
  try { const result = await call("adminListCustomers"); customers = result.customers || []; renderCustomers(); renderRecipients(); }
  catch (error) { $("customerRows").innerHTML = `<p class="message error">${escapeHtml(friendlyError(error))}</p>`; }
}
function filteredCustomers() {
  const term = $("customerSearch").value.trim().toLowerCase();
  return customers.filter(customer => !term || `${customer.name} ${customer.mobile}`.toLowerCase().includes(term));
}
function renderCustomers() {
  const rows = filteredCustomers();
  $("customerRows").innerHTML = rows.length ? rows.map(customer => `<button class="customer-row" type="button" data-customer-uid="${escapeHtml(customer.uid)}" data-customer-mobile="${escapeHtml(customer.mobile)}"><strong>${escapeHtml(customer.name)}</strong><span>${escapeHtml(customer.mobile)} · ${customer.orders} orders · ${money(customer.spend)}</span></button>`).join("") : '<p class="empty-cell">No customers found in recent orders.</p>';
  $("customerRows").querySelectorAll("[data-customer-mobile]").forEach(button => button.addEventListener("click", () => loadCustomerDetails(button.dataset.customerUid, mobileDigits(button.dataset.customerMobile))));
}
$("customerSearch").addEventListener("input", renderCustomers);
$("refreshCustomers").addEventListener("click", loadCustomers);
$("customerLookupForm").addEventListener("submit", event => { event.preventDefault(); loadCustomerDetails("", $("customerLookupMobile").value); });
async function loadCustomerDetails(uid, mobile) {
  const panel = $("customerDetails"); panel.innerHTML = '<p class="empty-cell">Loading customer account…</p>';
  try {
    const detail = await call("adminGetCustomerDetails", { uid, mobile });
    const addressCard = (address, fallbackLabel) => {
      if (typeof address === "string") return `<article class="customer-address"><strong>${escapeHtml(fallbackLabel)}</strong><p>${escapeHtml(address)}</p></article>`;
      const label = address.label || fallbackLabel;
      const contact = address.name ? `<br>${escapeHtml(address.name)}` : "";
      const addressText = [address.address, address.landmark ? `Near ${address.landmark}` : "", address.area].filter(Boolean).map(escapeHtml).join("<br>");
      const orderRef = address.orderId ? `<small>From order ${escapeHtml(address.orderNumber || String(address.orderId).slice(-4).toUpperCase())}${address.createdAt ? ` · ${dateText(address.createdAt)}` : ""}</small>` : "";
      return `<article class="customer-address"><strong>${escapeHtml(label)}</strong>${orderRef}<p>${contact}${addressText ? `<br>${addressText}` : ""}</p></article>`;
    };
    const savedAddressCards = (detail.addresses || []).filter(Boolean).map((address, index) => addressCard(address, `Saved address ${index + 1}`)).join("");
    const pastAddressCards = (detail.orderAddresses || []).map((address, index) => addressCard(address, `Delivery destination ${index + 1}`)).join("");
    panel.innerHTML = `<div class="detail-top"><div><span class="eyebrow">CUSTOMER ACCOUNT</span><h3>${escapeHtml(detail.name)}</h3><p>${escapeHtml(detail.mobile || mobile)}</p></div><a class="button button-quiet" target="_blank" rel="noopener" href="https://wa.me/91${escapeHtml(mobileDigits(detail.mobile || mobile))}">Open WhatsApp</a></div>
      <div class="detail-stats"><span class="detail-chip">✦ ${Number(detail.points || 0)} Craving Points</span><span class="detail-chip">${Number(detail.completedOrders || 0)} completed orders</span><span class="detail-chip">${(detail.availableRewards || []).length} available rewards</span></div>
      ${detail.uid ? `<section class="customer-access-control"><div><strong>Account access · ${detail.customerBlocked ? "Blocked" : "Active"}</strong><small>${detail.customerBlocked ? "This customer cannot sign in, read account data, or place online orders." : "Block sign-in and online ordering for this customer. You can restore access here."}</small></div><div class="customer-access-actions">${detail.customerBlockManaged ? `<button id="customerBlockButton" class="button button-quiet" type="button">Restore customer access</button>` : detail.accountDisabled ? `<span class="role-pill">Already disabled</span>` : `<button id="customerBlockButton" class="button button-danger" type="button">Block customer</button>`}<button id="customerDeleteButton" class="button button-danger" type="button">Delete customer account</button></div><small class="customer-delete-note">Permanently removes login, saved addresses, points, and rewards. Past orders stay for reporting with personal contact details removed.</small><p id="customerAccessMessage" class="message" role="status"></p></section>` : ""}
      <h3>Saved addresses</h3><div class="customer-address-list">${savedAddressCards || '<p class="muted">No saved addresses yet.</p>'}</div>
      ${pastAddressCards ? `<h3>Other delivery destinations from orders</h3><div class="customer-address-list">${pastAddressCards}</div>` : ""}
      <h3>Order history ${detail.historyLimited ? "(recent 1,000)" : ""}</h3><div class="order-history">${detail.orders.length ? detail.orders.map(order => { const prefix = order.source === "walk-in" ? "WK" : order.orderType === "pickup" ? "PK" : "DL"; const orderNumber = order.orderNumber || `${prefix}-${String(order.id).slice(-4).toUpperCase()}`; return `<article class="history-order"><strong>Order ${escapeHtml(orderNumber)} · ${escapeHtml(order.status || "new")} · ${money(order.total)}</strong><p>${dateText(order.createdAt)} · ${escapeHtml(order.source === "walk-in" ? "Walk-in" : (order.orderType || "delivery"))}<br>${escapeHtml((order.items || []).map(item => `${item.name} × ${item.qty}`).join(" · "))}</p></article>`; }).join("") : "<p class='empty-cell'>No order history found.</p>"}</div>`;
    const blockButton = $("customerBlockButton");
    if (blockButton) blockButton.addEventListener("click", async () => {
      const nextBlocked = !detail.customerBlockManaged;
      const verb = nextBlocked ? "block" : "restore access for";
      if (!window.confirm(`Are you sure you want to ${verb} ${detail.name || detail.mobile}? ${nextBlocked ? "They will be signed out and cannot place online orders." : "They will be able to sign in and order again."}`)) return;
      blockButton.disabled = true;
      try {
        await call("adminSetCustomerBlocked", { mobile: detail.mobile || mobile, blocked: nextBlocked });
        await Promise.all([loadCustomerDetails(detail.uid, detail.mobile || mobile), loadCustomers()]);
      } catch (error) {
        const status = $("customerAccessMessage");
        if (status) message(status, friendlyError(error), "error");
        blockButton.disabled = false;
      }
    });
    const deleteButton = $("customerDeleteButton");
    if (deleteButton) deleteButton.addEventListener("click", async () => {
      const typedConfirmation = window.prompt(`This permanently deletes ${detail.name || detail.mobile}'s login, saved addresses, Craving Points, and rewards. Past orders will remain with personal contact details removed. Type DELETE to continue.`);
      if (typedConfirmation !== "DELETE") return;
      deleteButton.disabled = true;
      try {
        const result = await call("adminDeleteCustomerAccount", { mobile: detail.mobile || mobile });
        panel.innerHTML = `<p class="message success">${escapeHtml(result.message)}</p><p class="muted">The customer account has been removed. Historical order totals and items remain available for reporting.</p>`;
        await loadCustomers();
      } catch (error) {
        const status = $("customerAccessMessage");
        if (status) message(status, friendlyError(error), "error");
        deleteButton.disabled = false;
      }
    });
  } catch (error) { panel.innerHTML = `<p class="message error">${escapeHtml(friendlyError(error))}</p><form id="customerLookupForm" class="lookup-form"><input id="customerLookupMobile" inputmode="tel" placeholder="10-digit mobile number"><button class="button button-primary" type="submit">Look up</button></form>`; $("customerLookupForm").addEventListener("submit", event => { event.preventDefault(); loadCustomerDetails("", $("customerLookupMobile").value); }); }
}

async function loadAccess() {
  try {
    const result = await call("adminListAccessUsers");
    $("accessRows").innerHTML = result.users.length ? result.users.map(user => `<tr><td>${escapeHtml(user.name || "—")}</td><td>${escapeHtml(user.mobile)}</td><td><span class="role-pill">${user.role === "admin" ? "Admin" : "Staff"}</span></td><td>${dateText(user.lastSignIn)}</td><td>${user.disabled ? "Disabled" : "Active"}</td></tr>`).join("") : '<tr><td colspan="5" class="empty-cell">No staff or admin accounts found.</td></tr>';
  } catch (error) { $("accessRows").innerHTML = `<tr><td colspan="5" class="message error">${escapeHtml(friendlyError(error))}</td></tr>`; }
}
$("refreshAccess").addEventListener("click", loadAccess);
$("accessForm").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { const result = await call("adminSetUserRole", { mobile: $("accessMobile").value, role: $("accessRole").value }); message($("accessMessage"), `${result.message} The user will need to sign in again.`, "success"); event.target.reset(); await loadAccess(); }
  catch (error) { message($("accessMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});

async function loadBusinessConfig() {
  try {
    const config = await call("adminGetBusinessConfig"); menu = config.menu || {}; combos = config.combos || []; rewards = config.rewards?.journey || [];
    gameConfig = config.cravingDash || { enabled: false, campaignId: "campaign-v1", stages: [] };
    gameIsLive = config.cravingDashLive === true;
    gameHasUnpublishedChanges = config.cravingDashHasUnpublishedChanges === true;
    renderMenuEditor(); renderRewardEditor(); renderBenefitRewardOptions(); renderGameEditor();
  } catch (error) { message($("menuMessage"), friendlyError(error), "error"); message($("rewardsMessage"), friendlyError(error), "error"); message($("gameConfigMessage"), friendlyError(error), "error"); }
}

function gameFoodOptions(selected) {
  const names = [...new Set(Object.entries(menu).flatMap(([key, section]) => /extra|dip/i.test(key) || /extra|dip/i.test(section.title || "") ? [] : (section.items || []).flatMap(item => item.options?.length ? item.options.map(option => option.name) : [item.name])).concat((combos || []).map(combo => combo.name)))];
  return '<option value="">Select a menu item</option>' + names.map(name => `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("");
}
function gameRewardDescription(reward = {}) {
  if (reward.kind === "points") return `${Number(reward.points || 0)} Craving Points`;
  if (reward.kind === "percent-discount") return `${Number(reward.percent || 0)}% off eligible regular menu items${Number(reward.maxDiscount) ? ` · max ₹${Number(reward.maxDiscount)}` : ""} · 48-hour voucher`;
  return `Free ${reward.item || "menu item"} · 48-hour voucher`;
}
function renderGameEditor() {
  if (!$ ("gameStageEditor")) return;
  $("gameCampaignId").value = gameConfig.campaignId || "campaign-v1";
  $("gameLiveStatus").textContent = gameIsLive
    ? (gameHasUnpublishedChanges ? "LIVE · UNSAVED DRAFT CHANGES ARE NOT PUBLIC" : "LIVE · CUSTOMERS CAN SIGN IN AND PLAY")
    : "COMING SOON · CUSTOMER PLAY IS OFF";
  $("gameLiveStatus").classList.toggle("is-live", gameIsLive);
  updateGamePublishButton();
  const stages = Array.isArray(gameConfig.stages) ? gameConfig.stages : [];
  $("gameStageEditor").innerHTML = stages.length ? stages.map((stage, index) => `<article class="card game-stage-row" data-game-stage-index="${index}">
    <div class="game-stage-top"><strong>STAGE ${index + 1}</strong><label><input class="game-stage-enabled" type="checkbox" ${stage.enabled !== false ? "checked" : ""}> Enabled</label><div><button type="button" class="text-button" data-game-move="-1" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" class="text-button" data-game-move="1" ${index === stages.length - 1 ? "disabled" : ""}>↓</button><button type="button" class="remove-button" data-game-remove>Remove</button></div></div>
    <div class="game-stage-fields"><label>Stage ID<input class="game-stage-id" maxlength="40" value="${escapeHtml(stage.id)}" placeholder="stage-1"></label><label>Title<input class="game-stage-title" maxlength="60" value="${escapeHtml(stage.title)}" placeholder="First order dash"></label><label>Target score<input class="game-stage-score" type="number" min="1" max="12" value="${Number(stage.targetScore || 1)}"></label>
    <label class="game-stage-instructions">Player instructions<textarea class="game-stage-instructions-input" maxlength="240" rows="2">${escapeHtml(stage.instructions || "Swipe the tray to collect the requested foods and avoid the wrong orders.")}</textarea></label>
    <label>Reward type<select class="game-stage-kind"><option value="points" ${stage.reward?.kind === "points" ? "selected" : ""}>Craving Points</option><option value="free-item" ${stage.reward?.kind === "free-item" ? "selected" : ""}>Free menu item or combo · 48-hour voucher</option><option value="percent-discount" ${stage.reward?.kind === "percent-discount" ? "selected" : ""}>Percentage off bill · 48-hour voucher</option></select></label>
    <label class="game-points-field">Points<input class="game-stage-points" type="number" min="1" max="10000" value="${Number(stage.reward?.points || 100)}"></label>
    <label class="game-item-field">Free item or combo<select class="game-stage-item">${gameFoodOptions(stage.reward?.item || "")}</select></label>
    <label class="game-percent-field">Discount percent<input class="game-stage-percent" type="number" min="1" max="100" value="${Number(stage.reward?.percent || 10)}"></label>
    <label class="game-minimum-field">Minimum eligible food spend<input class="game-stage-minimum" type="number" min="0" max="5000" value="${Number(stage.reward?.minimum || 0)}"><small>Only regular menu items count; combos, extras, and delivery are excluded.</small></label>
    <label class="game-cap-field">Maximum discount (₹)<input class="game-stage-cap" type="number" min="0" max="10000" value="${Number(stage.reward?.maxDiscount || 0)}"><small>Enter 0 for no rupee cap.</small></label></div>
    <div class="game-stage-preview"><strong>${escapeHtml(stage.title || "Stage title")}</strong><span>${escapeHtml(gameRewardDescription(stage.reward))}</span></div>
  </article>`).join("") : '<div class="card empty-cell">No stages yet. Add stages and save the lineup before enabling the game.</div>';
  $("gameStageEditor").querySelectorAll(".game-stage-row").forEach(row => {
    const toggle = () => { const kind = row.querySelector(".game-stage-kind").value; row.querySelector(".game-points-field").hidden = kind !== "points"; row.querySelector(".game-item-field").hidden = kind !== "free-item"; row.querySelector(".game-minimum-field").hidden = kind === "points"; row.querySelector(".game-percent-field").hidden = kind !== "percent-discount"; row.querySelector(".game-cap-field").hidden = kind !== "percent-discount"; };
    row.querySelector(".game-stage-kind").addEventListener("change", toggle); toggle();
    row.querySelectorAll("input,select,textarea").forEach(input => input.addEventListener("input", () => { gameHasUnpublishedChanges = true; updateGamePublishButton(); updateGamePreview(); }));
    row.querySelectorAll("[data-game-move]").forEach(button => button.addEventListener("click", () => { const current = readGameEditor(); const at = Number(row.dataset.gameStageIndex), to = at + Number(button.dataset.gameMove); [current.stages[at], current.stages[to]] = [current.stages[to], current.stages[at]]; gameConfig = current; gameHasUnpublishedChanges = true; renderGameEditor(); }));
    row.querySelector("[data-game-remove]").addEventListener("click", () => { gameConfig = readGameEditor(); gameConfig.stages.splice(Number(row.dataset.gameStageIndex), 1); gameHasUnpublishedChanges = true; renderGameEditor(); });
  });
  const testSelect = $("gameTestStage"), selectedStage = testSelect.value;
  testSelect.innerHTML = stages.map((stage, index) => `<option value="${escapeHtml(stage.id)}">Stage ${index + 1} · ${escapeHtml(stage.title || stage.id)}</option>`).join("") || '<option value="">Add a stage to begin</option>';
  if (stages.some(stage => stage.id === selectedStage)) testSelect.value = selectedStage;
  $("startGameTestButton").disabled = !stages.length;
  $("toggleGameLiveButton").disabled = !gameIsLive && !stages.some(stage => stage.enabled !== false);
  $("gameCampaignId").oninput = () => { gameHasUnpublishedChanges = true; updateGamePublishButton(); updateGamePreview(); };
  updateGamePreview();
}
function updateGamePublishButton() {
  $("toggleGameLiveButton").textContent = gameIsLive ? (gameHasUnpublishedChanges ? "Publish live updates" : "Take game offline") : "Make game live";
}
function readGameEditor() {
  return {
    enabled: true,
    campaignId: $("gameCampaignId").value.trim(),
    stages: [...$("gameStageEditor").querySelectorAll(".game-stage-row")].map((row, index) => {
      const kind = row.querySelector(".game-stage-kind").value;
      const stage = { id: row.querySelector(".game-stage-id").value.trim(), order: index + 1, title: row.querySelector(".game-stage-title").value.trim(), instructions: row.querySelector(".game-stage-instructions-input").value.trim(), targetScore: Number(row.querySelector(".game-stage-score").value), enabled: row.querySelector(".game-stage-enabled").checked };
      if (kind === "points") stage.reward = { kind, points: Number(row.querySelector(".game-stage-points").value) };
      else if (kind === "free-item") stage.reward = { kind, item: row.querySelector(".game-stage-item").value, minimum: Number(row.querySelector(".game-stage-minimum").value) };
      else stage.reward = { kind, percent: Number(row.querySelector(".game-stage-percent").value), minimum: Number(row.querySelector(".game-stage-minimum").value), maxDiscount: Number(row.querySelector(".game-stage-cap").value) };
      return stage;
    })
  };
}
function updateGamePreview() {
  const stages = readGameEditor().stages;
  for (const [index, row] of [...$("gameStageEditor").querySelectorAll(".game-stage-row")].entries()) {
    const stage = stages[index];
    row.querySelector(".game-stage-preview strong").textContent = stage?.title || "Stage title";
    row.querySelector(".game-stage-preview span").textContent = gameRewardDescription(stage?.reward);
  }
  const first = stages[0];
  $("gamePreviewTitle").textContent = first?.title || "Craving Dash";
  $("gamePreviewText").textContent = first ? `${first.instructions} Clear the stage by scoring ${first.targetScore}.` : "Add a stage to preview its instructions and reward here.";
  $("gamePreviewReward").textContent = !first ? "No reward configured" : first.reward.kind === "points" ? `${first.reward.points} Craving Points · added directly to the account` : first.reward.kind === "percent-discount" ? gameRewardDescription(first.reward) + ` · min eligible spend ₹${first.reward.minimum}` : `${first.reward.item || "Choose a menu item"} free · expires 48 hours after earning · minimum eligible spend ₹${first.reward.minimum}`;
}
$("addGameStage").addEventListener("click", () => {
  const current = readGameEditor(); current.stages.push({ id: `stage-${current.stages.length + 1}-${crypto.randomUUID().slice(0, 5)}`, order: current.stages.length + 1, title: `Stage ${current.stages.length + 1}`, instructions: "Swipe the tray to collect the requested foods and avoid the wrong orders.", targetScore: 3, enabled: true, reward: { kind: "points", points: 100 } });
  gameConfig = current; gameHasUnpublishedChanges = true; renderGameEditor();
});
$("startGameTestButton").addEventListener("click", async event => {
  const button = event.currentTarget; button.disabled = true;
  try {
    const stageId = $("gameTestStage").value;
    if (!stageId) throw new Error("Add a stage and choose which one to test.");
    const draft = readGameEditor();
    await call("adminSaveCravingDashConfig", { cravingDash: draft });
    const response = await call("adminStartCravingDashTest", { stageId });
    sessionStorage.setItem("cravingDashAdminTest", JSON.stringify(response));
    gameConfig = { ...draft, enabled: false };
    gameHasUnpublishedChanges = true;
    renderGameEditor();
    $("adminGameTestFrame").src = `/?gameTest=1&v=${Date.now()}`;
    gameTestDialog.showModal();
    message($("gameConfigMessage"), "Draft saved. Test mode won’t award points, issue rewards, or change customer progress.", "success");
  }
  catch (error) { message($("gameConfigMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});
$("toggleGameLiveButton").addEventListener("click", async event => {
  const button = event.currentTarget; button.disabled = true;
  const publish = !gameIsLive || gameHasUnpublishedChanges;
  try {
    const result = await call("adminSetCravingDashLive", { enabled: publish, ...(publish ? { cravingDash: readGameEditor() } : {}) });
    gameIsLive = result.enabled === true;
    gameHasUnpublishedChanges = publish ? false : gameHasUnpublishedChanges;
    gameConfig = { ...readGameEditor(), enabled: false };
    renderGameEditor();
    message($("gameConfigMessage"), gameIsLive ? `Craving Dash is live with ${result.stages} enabled stages. Customers can now sign in and play.` : "Craving Dash is offline. Customers will see Coming soon and won’t be asked to sign in for the game.", "success");
  } catch (error) { message($("gameConfigMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});
function renderMenuEditor() {
  const categories = Object.entries(menu);
  $("newItemCategory").innerHTML = categories.map(([id, section]) => `<option value="${escapeHtml(id)}">${escapeHtml(section.title)}</option>`).join("");
  $("menuEditor").innerHTML = categories.map(([id, section]) => `<details class="card editor-category" open><summary>${escapeHtml(section.title)} · ${section.items.length} items</summary><div class="editor-items">${section.items.map((item, index) => `<article class="editor-item ${item.options ? "has-options" : ""}" data-category="${escapeHtml(id)}" data-item-index="${index}"><label>Item<input class="item-name" aria-label="Item name" value="${escapeHtml(item.name)}"></label>${item.options ? `<div class="variant-editor" aria-label="${escapeHtml(item.name)} sizes">${item.options.map((option, optionIndex) => `<label>${escapeHtml(option.label)} price (₹)<input class="variant-price" data-option-index="${optionIndex}" aria-label="${escapeHtml(option.label)} price" type="number" min="1" max="20000" step="1" value="${Number(option.price)}"></label>`).join("")}</div>` : `<label>Price (₹)<input class="item-price" aria-label="Item price in rupees" type="number" min="1" max="20000" step="1" value="${Number(item.price || 0)}"></label>`}<label class="item-description-label">Description<input class="item-description" aria-label="Description" value="${escapeHtml(item.description || "")}"></label><button type="button" class="remove-button" data-remove-category="${escapeHtml(id)}" data-remove-index="${index}">Remove item</button></article>`).join("")}</div></details>`).join("");
  $("menuEditor").querySelectorAll("[data-remove-index]").forEach(button => button.addEventListener("click", () => {
    const category = button.dataset.removeCategory, index = Number(button.dataset.removeIndex);
    if (!confirm(`Remove ${menu[category].items[index].name} from the live menu?`)) return;
    menu[category].items.splice(index, 1); renderMenuEditor();
  }));
  $("comboEditor").innerHTML = combos.length ? combos.map((combo, index) => `<article class="card combo-editor-row" data-combo-index="${index}"><div class="combo-editor-heading"><strong>Combo ${index + 1}</strong><button type="button" class="remove-button" data-remove-combo="${index}">Remove combo</button></div><div class="combo-editor-fields"><label>Combo name<input class="combo-name" maxlength="100" value="${escapeHtml(combo.name)}"></label><label>Offer price (₹)<input class="combo-price" type="number" min="1" max="20000" step="1" value="${Number(combo.price)}"></label><label>Menu value (₹)<input class="combo-value" type="number" min="0" max="50000" step="1" value="${Number(combo.value || 0)}"></label><label class="combo-image-field">Image path<input class="combo-image" value="${escapeHtml(combo.image || "")}" placeholder="images/combos/your-combo.png"></label><label class="combo-items-field">Included items<textarea class="combo-items" rows="4" maxlength="4000">${escapeHtml((combo.items || []).join("\n"))}</textarea><small>One included item per line. These are shown to customers and on order details.</small></label></div></article>`).join("") : '<div class="card empty-cell">No combos configured.</div>';
  $("comboEditor").querySelectorAll("[data-remove-combo]").forEach(button => button.addEventListener("click", () => {
    const combo = combos[Number(button.dataset.removeCombo)];
    if (!confirm(`Remove ${combo.name} from the customer menu?`)) return;
    combos.splice(Number(button.dataset.removeCombo), 1); renderMenuEditor();
  }));
}
$("categoryForm").addEventListener("submit", event => {
  event.preventDefault(); const title = $("newCategoryName").value.trim(), id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id || menu[id]) return message($("menuMessage"), "That category already exists or its name is invalid.", "error");
  menu[id] = { title: title.toUpperCase(), subtitle: $("newCategorySubtitle").value.trim(), items: [] }; event.target.reset(); renderMenuEditor();
  message($("menuMessage"), "Category added locally. Save menu changes to publish it.", "success");
});
$("itemForm").addEventListener("submit", event => {
  event.preventDefault(); const category = $("newItemCategory").value, name = $("newItemName").value.trim(), price = Number($("newItemPrice").value);
  const all = Object.values(menu).flatMap(section => section.items || []);
  if (all.some(item => item.name.toLowerCase() === name.toLowerCase() || item.options?.some(option => option.name.toLowerCase() === name.toLowerCase()))) return message($("menuMessage"), "An item with that name already exists.", "error");
  menu[category].items.push({ name, price, image: "", description: $("newItemDescription").value.trim() || `${name}.` }); event.target.reset(); renderMenuEditor(); message($("menuMessage"), "Menu item added locally. Save menu changes to publish it.", "success");
});
$("comboForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("newComboName").value.trim(), price = Number($("newComboPrice").value), value = Number($("newComboValue").value);
  const items = $("newComboItems").value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (combos.some(combo => combo.name.toLowerCase() === name.toLowerCase())) return message($("menuMessage"), "A combo with that name already exists.", "error");
  combos.push({ name, price, value, image: $("newComboImage").value.trim(), items });
  event.target.reset(); renderMenuEditor(); message($("menuMessage"), "Combo added locally. Save menu changes to publish it.", "success");
});
$("saveMenu").addEventListener("click", async event => {
  const button = event.currentTarget; button.disabled = true;
  try {
    const changed = {};
    for (const [id, section] of Object.entries(menu)) changed[id] = { ...section, items: section.items.map(item => {
      const row = [...$("menuEditor").querySelectorAll(`[data-category="${CSS.escape(id)}"]`)].find(element => Number(element.dataset.itemIndex) === section.items.indexOf(item));
      if (!row) return item;
      const name = row.querySelector(".item-name").value.trim();
      const updated = { ...item, name, description: row.querySelector(".item-description").value.trim() };
      if (item.options) updated.options = item.options.map((option, optionIndex) => ({ ...option, name: `${name} (${option.label})`, price: Number(row.querySelector(`[data-option-index="${optionIndex}"]`).value) }));
      else updated.price = Number(row.querySelector(".item-price").value);
      return updated;
    }) };
    const updatedCombos = [...$("comboEditor").querySelectorAll(".combo-editor-row")].map(row => {
      const old = combos[Number(row.dataset.comboIndex)];
      return { ...old, name: row.querySelector(".combo-name").value.trim(), price: Number(row.querySelector(".combo-price").value), value: Number(row.querySelector(".combo-value").value), image: row.querySelector(".combo-image").value.trim(), items: row.querySelector(".combo-items").value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) };
    });
    const result = await call("adminSaveMenuCatalog", { menu: changed, combos: updatedCombos }); menu = changed; combos = updatedCombos; renderMenuEditor(); message($("menuMessage"), `Saved to Firebase · ${result.categories} categories, ${result.items} items, ${result.combos} combos.`, "success");
  } catch (error) { message($("menuMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});

function renderRewardEditor() {
  $("rewardEditor").innerHTML = rewards.map((reward, index) => `<div class="reward-row"><strong class="reward-order">#${Number(reward.order)}</strong><select class="reward-kind"><option value="progress" ${reward.kind === "progress" ? "selected" : ""}>Progress message</option><option value="free-delivery" ${reward.kind === "free-delivery" ? "selected" : ""}>Free delivery</option><option value="free-item" ${reward.kind === "free-item" ? "selected" : ""}>Free regular item</option><option value="discount" ${reward.kind === "discount" ? "selected" : ""}>Discount</option><option value="bonus-points" ${reward.kind === "bonus-points" ? "selected" : ""}>Bonus points</option><option value="double-points" ${reward.kind === "double-points" ? "selected" : ""}>Double points</option><option value="welcome" ${reward.kind === "welcome" ? "selected" : ""}>Welcome offer</option></select><input class="reward-title" value="${escapeHtml(reward.title)}" aria-label="Reward title"><input class="reward-id" value="${escapeHtml(reward.id || "")}" placeholder="stable reward ID" aria-label="Stable reward ID"><input class="reward-minimum" type="number" min="0" value="${Number(reward.minimum || 0)}" aria-label="Minimum spend"><input class="reward-amount" type="number" min="0" value="${Number(reward.amount || reward.points || reward.maxBonusPoints || 0)}" aria-label="Discount / points amount"><input class="reward-item" value="${escapeHtml(reward.item || "")}" placeholder="free item exact menu name" aria-label="Free regular menu item"><input class="reward-detail" value="${escapeHtml(reward.detail || "")}" aria-label="Customer-facing description"><button class="remove-button reward-remove" type="button" data-reward-index="${index}">Remove milestone</button></div>`).join("");
  $("rewardEditor").querySelectorAll("[data-reward-index]").forEach(button => button.addEventListener("click", () => { if (rewards.length <= 1) return; rewards.splice(Number(button.dataset.rewardIndex), 1); rewards.forEach((reward, index) => reward.order = index + 1); renderRewardEditor(); }));
  renderBenefitRewardOptions();
}
function readRewardEditor() {
  return [...$("rewardEditor").querySelectorAll(".reward-row")].map((row, index) => {
    const kind = row.querySelector(".reward-kind").value, title = row.querySelector(".reward-title").value.trim(), id = row.querySelector(".reward-id").value.trim(), detail = row.querySelector(".reward-detail").value.trim();
    const data = { order: index + 1, kind, title, detail };
    if (id) data.id = id;
    if (["free-delivery", "free-item", "discount"].includes(kind)) data.minimum = Number(row.querySelector(".reward-minimum").value);
    if (kind === "free-item") data.item = row.querySelector(".reward-item").value.trim();
    if (kind === "discount") data.amount = Number(row.querySelector(".reward-amount").value);
    if (kind === "bonus-points") data.points = Number(row.querySelector(".reward-amount").value);
    if (kind === "double-points") data.maxBonusPoints = Number(row.querySelector(".reward-amount").value);
    return data;
  });
}
function renderBenefitRewardOptions() {
  if (!$ ("benefitReward")) return;
  const selected = $("benefitReward").value;
  $("benefitReward").innerHTML = '<option value="">No extra reward</option>' + rewards.filter(item => item.id && item.kind !== "progress" && item.kind !== "welcome").map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`).join("");
  $("benefitReward").value = selected;
}
$("saveRewards").addEventListener("click", async event => {
  const button = event.currentTarget; button.disabled = true;
  try { const result = await call("adminSaveRewardsConfig", { journey: readRewardEditor() }); rewards = readRewardEditor(); renderRewardEditor(); message($("rewardsMessage"), `Saved ${result.milestones} reward milestones to Firebase.`, "success"); }
  catch (error) { message($("rewardsMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});
$("benefitForm").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const pointsDelta = Number($("benefitPoints").value), rewardId = $("benefitReward").value;
    const result = await call("adminAdjustCustomerBenefits", { mobile: $("benefitMobile").value, pointsDelta, rewardId, reason: $("benefitReason").value.trim(), requestId: crypto.randomUUID().replace(/-/g, "") });
    message($("benefitMessage"), `Updated ${result.mobile}: ${result.points} Craving Points${result.reward ? ` · granted ${result.reward.title}` : ""}.`, "success"); event.target.reset(); $("benefitPoints").value = "0";
  } catch (error) { message($("benefitMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});

document.querySelectorAll("[data-admin-tab]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("active", button === tab));
  document.querySelectorAll("[data-admin-section]").forEach(section => { section.hidden = section.dataset.adminSection !== tab.dataset.adminTab; });
}));

async function loadOrdering() {
  try { orderingStatus = await call("getOrderingStatus"); renderOrdering(); }
  catch (error) { $("orderingTitle").textContent = "Ordering status unavailable"; $("orderingMessage").textContent = friendlyError(error); }
}
function renderOrdering() {
  const active = orderingStatus?.acceptingOnlineOrders === true;
  const mode = orderingStatus?.adminMode || "";
  $("orderingTitle").textContent = mode === "online"
    ? "Online ordering is open"
    : mode === "paused" || orderingStatus?.paused
      ? "Online orders are paused"
      : mode === "closed"
        ? "Online ordering is closed by admin"
        : active
          ? "Online orders are open"
          : "Online orders are stopped";
  $("orderingMessage").textContent = orderingStatus?.message || "Online orders remain off until staff or admin starts them.";
  $("adminGoOnline").disabled = mode === "online";
  $("adminPauseOnline").disabled = orderingStatus?.paused === true;
  $("adminPauseOnline").textContent = orderingStatus?.paused ? "Orders paused" : "Pause orders";
  $("adminGoOffline").disabled = mode === "closed";
  if (orderingStatus?.hours) {
    $("storeOpeningTime").value = orderingStatus.hours.openingTime;
    $("storeClosingTime").value = orderingStatus.hours.closingTime;
  }
}
async function setOrdering(action) {
  const button = action === "online" ? $("adminGoOnline") : action === "pause" ? $("adminPauseOnline") : $("adminGoOffline"); button.disabled = true;
  try { orderingStatus = await call("adminUpdateRestaurantSettings", { action }); renderOrdering(); }
  catch (error) { $("orderingMessage").textContent = friendlyError(error); }
  finally { renderOrdering(); }
}
$("adminGoOnline").addEventListener("click", () => setOrdering("online"));
$("adminPauseOnline").addEventListener("click", () => setOrdering("pause"));
$("adminGoOffline").addEventListener("click", () => setOrdering("closed"));
$("storeHoursForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("saveStoreHours"); button.disabled = true;
  message($("storeHoursMessage"), "Saving store hours…");
  try {
    orderingStatus = await call("adminUpdateRestaurantSettings", {
      openingTime: $("storeOpeningTime").value,
      closingTime: $("storeClosingTime").value
    });
    renderOrdering();
    message($("storeHoursMessage"), "Store hours saved. Customers will only see whether ordering is open or closed.", "success");
  } catch (error) { message($("storeHoursMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});

function renderRecipients() {
  $("messageRecipients").innerHTML = customers.length ? customers.slice(0, 200).map((customer, index) => `<label class="recipient-option"><input type="checkbox" value="${index}"><span><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.mobile)} · ${customer.orders} orders</small></span></label>`).join("") : '<p class="empty-cell">No recent customers available.</p>';
}
$("selectAllCustomers").addEventListener("click", () => $("messageRecipients").querySelectorAll("input[type=checkbox]").forEach(input => { input.checked = true; }));
$("startCampaign").addEventListener("click", () => {
  const template = $("campaignMessage").value.trim(); if (!template) return alert("Write a message first.");
  const selected = [...$("messageRecipients").querySelectorAll("input:checked")].map(input => customers[Number(input.value)]).filter(Boolean);
  if (!selected.length) return alert("Select at least one customer.");
  $("campaignQueue").innerHTML = selected.map((customer, index) => {
    const text = template.replaceAll("{name}", customer.name || "there");
    const href = `https://wa.me/91${mobileDigits(customer.mobile)}?text=${encodeURIComponent(text)}`;
    return `<a class="campaign-link" target="_blank" rel="noopener" href="${href}"><span>${index + 1}. ${escapeHtml(customer.name)} · ${escapeHtml(customer.mobile)}</span><strong>Open chat ↗</strong></a>`;
  }).join("");
});
