import { firebaseAuth as auth, firebaseFunctions as functions, firebaseAuthPersistenceReady as authPersistence, FirebaseAuthAPI, FirebaseFunctionsAPI } from "./firebase-client.js?v=20261030-central-auth-v1";
const { signInWithEmailAndPassword, sendPasswordResetEmail, verifyBeforeUpdateEmail, onAuthStateChanged, signOut } = FirebaseAuthAPI;
const { httpsCallable } = FirebaseFunctionsAPI;

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
const dateText = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
let currentUser = null, menu = {}, combos = [], rewards = [], gameConfig = { enabled: false, campaignId: "campaign-v1", stages: [] }, gameIsLive = false, gameHasUnpublishedChanges = false, customers = [], analyticsRange = "today", orderingStatus = null;

function message(el, text, state = "") { el.textContent = text; el.className = `message ${state}`.trim(); }
function resetRecaptcha() { if (verifier) verifier.clear(); verifier = null; $("adminRecaptcha").replaceChildren(); }
function requireSignedInAdmin(user) {
  currentUser = user;
  if (!user) { $("adminApp").hidden = true; $("adminLogin").hidden = false; $("adminLogout").hidden = true; return; }
  user.getIdTokenResult(true).then(token => {
    const emailTeamSignInReady = Boolean(user.email && user.emailVerified && user.providerData?.some(provider => provider.providerId === "password") && !user.phoneNumber);
    if (token.claims.admin !== true || !emailTeamSignInReady) {
      message($("adminAuthMessage"), token.claims.admin === true ? "Complete Team Email Setup first. Admin access requires a verified email and password; phone OTP accounts belong to customers." : "This account does not have administrator access. Ask an admin to grant it.", "error");
      return signOut(auth);
    }
    $("adminLogin").hidden = true; $("adminApp").hidden = false; $("adminLogout").hidden = false;
    $("adminSignedInAs").textContent = user.email || user.displayName || "Administrator";
    loadInitial();
  }).catch(error => message($("adminAuthMessage"), friendlyError(error), "error"));
}
function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) return "Administrator access is required. Sign in with the authorized admin email.";
  if (code.includes("not-found")) return "No matching email account was found.";
  if (code.includes("failed-precondition")) return error.message || "This action cannot be completed yet.";
  if (code.includes("auth/requires-recent-login")) return "For security, sign out and sign in again before changing the administrator email.";
  if (code.includes("unauthenticated") || code.includes("app-check")) return "Firebase could not verify this secure request. Refresh the Admin page and try again. If it continues, check the website domain and App Check setup in Firebase.";
  if (code.includes("internal")) return "Firebase could not complete this request. Refresh the Admin page and retry. If it repeats, check the Firebase App Check and Functions logs.";
  return error?.message?.replace(/^FirebaseError:\s*/i, "") || "Something went wrong. Please try again.";
}

$("adminEmailForm").addEventListener("submit", async event => {
  event.preventDefault(); await authPersistence;
  const button = $("adminEmailSignIn"); button.disabled = true; message($("adminAuthMessage"), "Checking Admin access…");
  try { await signInWithEmailAndPassword(auth, $("adminEmail").value.trim().toLowerCase(), $("adminPassword").value); }
  catch (error) { message($("adminAuthMessage"), error.code === "auth/invalid-credential" ? "Email or password is incorrect, or this email is not registered." : friendlyError(error), "error"); }
  finally { button.disabled = false; }
});
$("adminForgotPassword").addEventListener("click", async () => {
  const email = $("adminEmail").value.trim().toLowerCase();
  if (!email) return message($("adminAuthMessage"), "Enter your admin email first.", "error");
  try { await sendPasswordResetEmail(auth, email); message($("adminAuthMessage"), "If the email is registered, Firebase has sent password reset instructions.", "success"); }
  catch (error) { message($("adminAuthMessage"), friendlyError(error), "error"); }
});
$("adminLogout").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, requireSignedInAdmin);

async function loadInitial() {
  await Promise.allSettled([loadAnalytics(), loadCustomers(), loadAccess(), loadBusinessConfig(), loadOrdering(), loadOrderTestMode()]);
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
      ${detail.uid ? `<section class="customer-access-control"><div><strong>${detail.customerDataDeleted ? "Customer data deleted" : `Account access · ${detail.customerBlocked ? "Blocked" : "Active"}`}</strong><small>${detail.customerDataDeleted ? (detail.isTeamAccount ? "Customer ordering was removed while staff/admin access stayed active. You can restore ordering as a fresh customer profile." : "Customer account data and customer access were removed.") : detail.customerBlocked ? "This customer cannot read account data or place online orders." : "Block sign-in and online ordering for this customer. You can restore access here."}</small></div><div class="customer-access-actions">${detail.customerDataDeleted ? `<span class="role-pill">Customer data deleted</span>${detail.isTeamAccount ? `<button id="customerRestoreButton" class="button button-primary" type="button">Restore customer ordering</button>` : ""}` : `${detail.customerBlockManaged ? `<button id="customerBlockButton" class="button button-quiet" type="button">Restore customer access</button>` : detail.accountDisabled ? `<span class="role-pill">Already disabled</span>` : `<button id="customerBlockButton" class="button button-danger" type="button">Block customer</button>`}<button id="customerDeleteButton" class="button button-danger" type="button">${detail.isTeamAccount ? "Delete customer data" : "Delete customer account"}</button>`}</div><small class="customer-delete-note">${detail.isTeamAccount ? "Deleting customer data removes addresses, Craving Points, rewards, and personal order details. Staff/admin login and permissions are retained." : "Permanently removes login, saved addresses, points, and rewards. Past orders stay for reporting with personal contact details removed."}</small><p id="customerAccessMessage" class="message" role="status"></p></section>` : ""}
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
    const restoreButton = $("customerRestoreButton");
    if (restoreButton) restoreButton.addEventListener("click", async () => {
      const accepted = window.confirm(`Restore customer ordering for ${detail.name || detail.mobile}? This creates a fresh customer profile. Previously deleted addresses, Craving Points, rewards, and personal order history cannot be recovered. Staff/admin access will remain unchanged.`);
      if (!accepted) return;
      restoreButton.disabled = true;
      try {
        const result = await call("adminRestoreTeamCustomerAccess", { mobile: detail.mobile || mobile });
        await Promise.all([loadCustomerDetails(detail.uid, detail.mobile || mobile), loadCustomers()]);
        const status = $("customerAccessMessage");
        if (status) message(status, `${result.message} Sign out of the customer session and sign in again to refresh access.`, "success");
      } catch (error) {
        const status = $("customerAccessMessage");
        if (status) message(status, friendlyError(error), "error");
        restoreButton.disabled = false;
      }
    });
    const deleteButton = $("customerDeleteButton");
    if (deleteButton) deleteButton.addEventListener("click", async () => {
      const confirmationMessage = detail.isTeamAccount
        ? `This deletes ${detail.name || detail.mobile}'s customer profile, saved addresses, Craving Points, rewards, customer ordering access, and personal details from order history. Staff/admin login and permissions will stay active. Type DELETE to continue.`
        : `This permanently deletes ${detail.name || detail.mobile}'s login, saved addresses, Craving Points, and rewards. Past orders will remain with personal contact details removed. Type DELETE to continue.`;
      const typedConfirmation = window.prompt(confirmationMessage);
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
    $("accessRows").innerHTML = result.users.length ? result.users.map(user => `<tr><td>${escapeHtml(user.name || "—")}</td><td>${escapeHtml(user.email || "—")}</td><td>${escapeHtml(user.mobile || "—")}</td><td><span class="role-pill">${user.role === "admin" ? "Admin" : "Staff"}</span></td><td>${dateText(user.lastSignIn)}</td><td>${user.disabled ? "Disabled" : "Active"}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-cell">No staff or admin accounts found.</td></tr>';
  } catch (error) { $("accessRows").innerHTML = `<tr><td colspan="6" class="message error">${escapeHtml(friendlyError(error))}</td></tr>`; }
}
$("refreshAccess").addEventListener("click", loadAccess);
$("accessForm").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { const result = await call("adminSetUserRole", { email: $("accessEmail").value.trim().toLowerCase(), role: $("accessRole").value }); message($("accessMessage"), result.message, "success"); event.target.reset(); await loadAccess(); }
  catch (error) { message($("accessMessage"), friendlyError(error), "error"); }
  finally { button.disabled = false; }
});

$("adminEmailChangeForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  message($("adminEmailChangeMessage"), "Sending verification link…");
  try {
    const email = $("newAdminEmail").value.trim().toLowerCase();
    await verifyBeforeUpdateEmail(auth.currentUser, email);
    message($("adminEmailChangeMessage"), `Verification link sent to ${email}. Confirm it before signing in with the new email.`, "success");
    event.target.reset();
  } catch (error) {
    message($("adminEmailChangeMessage"), friendlyError(error), "error");
  } finally { button.disabled = false; }
});

$("adminTransferForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  const email = $("successorAdminEmail").value.trim().toLowerCase();
  if (!confirm(`Transfer the sole Admin role to ${email}? Your current Admin session will be signed out.`)) return;
  button.disabled = true;
  message($("adminTransferMessage"), "Transferring Admin access…");
  try {
    const result = await call("adminTransferSoleAdmin", { email });
    message($("adminTransferMessage"), result.message, "success");
    setTimeout(() => signOut(auth), 1200);
  } catch (error) {
    message($("adminTransferMessage"), friendlyError(error), "error");
    button.disabled = false;
  }
});

async function loadBusinessConfig() {
  try {
    const config = await call("adminGetBusinessConfig"); menu = config.menu || {}; combos = config.combos || []; rewards = config.rewards?.journey || [];
    gameConfig = config.cravingDashDraft || config.cravingDash || { enabled: false, campaignId: "campaign-v1", roundTargetScore: 50, defaultReward: null, checkpoints: [] };
    gameIsLive = config.cravingDashLive === true;
    gameHasUnpublishedChanges = config.cravingDashHasUnpublishedChanges === true;
    renderMenuEditor(); renderRewardEditor(); renderBenefitRewardOptions(); renderGameEditor();
  } catch (error) { message($("menuMessage"), friendlyError(error), "error"); message($("rewardsMessage"), friendlyError(error), "error"); message($("gameConfigMessage"), friendlyError(error), "error"); }
}

function gameFoodOptions(selected) {
 const names=[...new Set(Object.entries(menu).flatMap(([k,s])=>/extra|dip/i.test(k+s.title)?[]:(s.items||[]).flatMap(i=>i.options?.length?i.options.map(o=>o.name):[i.name])).concat((combos||[]).map(c=>c.name)))];
 return '<option value="">Select menu item</option>'+names.map(n=>'<option '+(n===selected?'selected':'')+'>'+escapeHtml(n)+'</option>').join('');
}
function rewardFoodOptions(selected) {
 const names=[...new Set(Object.entries(menu).flatMap(([k,s])=>/extra|dip/i.test(k+s.title)?[]:(s.items||[]).flatMap(i=>i.options?.length?i.options.map(o=>o.name):[i.name])))];
 return '<option value="">Select regular menu item</option>'+names.map(n=>'<option value="'+escapeHtml(n)+'" '+(n===selected?'selected':'')+'>'+escapeHtml(n)+'</option>').join('');
}
function gameRewardDescription(r={}) { return r?.kind==='points'?Number(r.points||0)+' Craving Points · expires in 48 hours':r?.kind==='free-item'?'Free '+(r.item||'menu item')+' · 48-hour voucher':r?.kind==='percent-discount'?Number(r.percent||0)+'% discount · 48-hour voucher':'No reward configured'; }
function rewardFields(p,r={}) { const k=r.kind||'points';return '<div class="game-reward-fields"><label>Reward<select class="'+p+'-kind"><option value="points" '+(k==='points'?'selected':'')+'>Craving Points · 48-hour expiry</option><option value="free-item" '+(k==='free-item'?'selected':'')+'>Free menu item/combo · 48-hour expiry</option><option value="percent-discount" '+(k==='percent-discount'?'selected':'')+'>Discount percent · 48-hour expiry</option></select></label><label class="'+p+'-points-field">Points<input class="'+p+'-points" type="number" min="1" max="10000" step="1" value="'+(r.points||100)+'"></label><label class="'+p+'-item-field">Free item/combo<select class="'+p+'-item">'+gameFoodOptions(r.item)+'</select></label><label class="'+p+'-percent-field">Discount %<input class="'+p+'-percent" type="number" min="1" max="100" value="'+(r.percent||10)+'"></label><label class="'+p+'-minimum-field">Min food spend ₹<input class="'+p+'-minimum" type="number" min="0" max="5000" value="'+(r.minimum||0)+'"></label><label class="'+p+'-cap-field">Discount cap ₹<input class="'+p+'-cap" type="number" min="0" max="10000" value="'+(r.maxDiscount||0)+'"></label></div>'; }
function readGameReward(el,p){const k=el.querySelector('.'+p+'-kind').value;if(k==='points')return{kind:k,points:Number(el.querySelector('.'+p+'-points').value)};if(k==='free-item')return{kind:k,item:el.querySelector('.'+p+'-item').value,minimum:Number(el.querySelector('.'+p+'-minimum').value)};return{kind:k,percent:Number(el.querySelector('.'+p+'-percent').value),minimum:Number(el.querySelector('.'+p+'-minimum').value),maxDiscount:Number(el.querySelector('.'+p+'-cap').value)};}
function bindGameReward(el,p){const toggle=()=>{const k=el.querySelector('.'+p+'-kind').value;for(const[f,v]of[['points-field',k==='points'],['item-field',k==='free-item'],['percent-field',k==='percent-discount'],['minimum-field',k!=='points'],['cap-field',k==='percent-discount']])el.querySelector('.'+p+'-'+f).hidden=!v;};el.querySelector('.'+p+'-kind').onchange=()=>{toggle();gameHasUnpublishedChanges=true;renderGamePreview();updateGamePublishButton();};toggle();el.querySelectorAll('input,select').forEach(x=>x.oninput=()=>{gameHasUnpublishedChanges=true;renderGamePreview();updateGamePublishButton();});}
function readGameEditor(){const d=$('gameDefaultRewardEditor');return{enabled:true,campaignId:$('gameCampaignId').value.trim(),roundTargetScore:Number($('gameRoundTarget').value),defaultReward:d.querySelector('.game-default-kind')?readGameReward(d,'game-default'):null,checkpoints:[...$('gameStageEditor').querySelectorAll('.game-stage-row')].map((r,i)=>({id:r.dataset.id||'milestone-'+(i+1),title:r.querySelector('.game-stage-title').value.trim(),level:Number(r.querySelector('.game-stage-level').value),everyLevels:Number(r.querySelector('.game-stage-repeat').value),minScore:Number(r.querySelector('.game-stage-score').value),enabled:r.querySelector('.game-stage-enabled').checked,reward:readGameReward(r,'checkpoint')}))};}
function renderGameEditor(){if(!$('gameStageEditor'))return;$('gameCampaignId').value=gameConfig.campaignId||'campaign-v1';$('gameRoundTarget').value=Number(gameConfig.roundTargetScore||50);$('gameLiveStatus').textContent=gameIsLive?(gameHasUnpublishedChanges?'LIVE · UNSAVED DRAFT':'LIVE · CUSTOMERS CAN PLAY'):'COMING SOON · CUSTOMER PLAY IS OFF';$('gameLiveStatus').classList.toggle('is-live',gameIsLive);updateGamePublishButton();const d=$('gameDefaultRewardEditor');d.innerHTML=gameConfig.defaultReward?rewardFields('game-default',gameConfig.defaultReward)+'<button id="removeDefaultGameReward" type="button" class="text-button">Remove</button>':'<p class="muted">Required before the game can go live: a reward for every cleared level.</p><button id="addDefaultGameReward" type="button" class="button button-quiet">＋ Set reward for every level</button>';if(gameConfig.defaultReward){bindGameReward(d,'game-default');$('removeDefaultGameReward').onclick=()=>{gameConfig=readGameEditor();gameConfig.defaultReward=null;gameHasUnpublishedChanges=true;renderGameEditor();};}else $('addDefaultGameReward').onclick=()=>{gameConfig=readGameEditor();gameConfig.defaultReward={kind:'points',points:100};gameHasUnpublishedChanges=true;renderGameEditor();};const cs=Array.isArray(gameConfig.checkpoints)?gameConfig.checkpoints:[];$('gameStageEditor').innerHTML=cs.length?cs.map((c,i)=>'<article class="card game-stage-row" data-game-stage-index="'+i+'" data-id="'+escapeHtml(c.id||'')+'"><header><b>MILESTONE '+(i+1)+'</b><label><input class="game-stage-enabled" type="checkbox" '+(c.enabled===false?'':'checked')+'> Active</label><button type="button" class="remove-button" data-game-remove>Remove</button></header><div class="game-checkpoint-fields"><label>Name<input class="game-stage-title" maxlength="60" value="'+escapeHtml(c.title||'')+'"></label><label>Level<input class="game-stage-level" type="number" min="1" value="'+Number(c.level||1)+'"></label><label>Repeat every N levels<input class="game-stage-repeat" type="number" min="0" value="'+Number(c.everyLevels||0)+'"><small>0 means once only.</small></label><label>Minimum score<input class="game-stage-score" type="number" min="0" max="240" value="'+Number(c.minScore||0)+'"></label></div>'+rewardFields('checkpoint',c.reward||{})+'<small>All game rewards expire after 48 hours.</small></article>').join(''):'<div class="card empty-cell">No special milestones. The every-level reward can continue indefinitely.</div>';$('gameStageEditor').querySelectorAll('.game-stage-row').forEach(r=>{bindGameReward(r,'checkpoint');r.querySelectorAll('input').forEach(x=>x.oninput=()=>{gameHasUnpublishedChanges=true;renderGamePreview();updateGamePublishButton();});r.querySelector('[data-game-remove]').onclick=()=>{gameConfig=readGameEditor();gameConfig.checkpoints.splice(Number(r.dataset.gameStageIndex),1);gameHasUnpublishedChanges=true;renderGameEditor();};});$('toggleGameLiveButton').disabled=!gameIsLive&&!gameConfig.defaultReward;for(const id of['gameCampaignId','gameRoundTarget','gameTestLevel'])$(id).oninput=()=>{gameHasUnpublishedChanges=true;renderGamePreview();updateGamePublishButton();};renderGamePreview();}
function updateGamePublishButton(){$('toggleGameLiveButton').textContent=gameIsLive?(gameHasUnpublishedChanges?'Publish live updates':'Take game offline'):'Make game live';}
function renderGamePreview(){const d=readGameEditor(),c=d.checkpoints[0],r=c?.reward||d.defaultReward;$('gamePreviewTitle').textContent='Craving Run · Endless levels';$('gamePreviewText').textContent='Rounds continue with no final level. Target score '+d.roundTargetScore+'. '+(c?'Milestone: '+c.title+' at level '+c.level+(c.everyLevels?' and every '+c.everyLevels+' levels':''):'Add special level milestones as needed.');$('gamePreviewReward').textContent=gameRewardDescription(r);}
$('addGameStage').onclick=()=>{gameConfig=readGameEditor();gameConfig.checkpoints.push({id:'milestone-'+crypto.randomUUID().slice(0,8),title:'Bonus level',level:gameConfig.checkpoints.length+1,everyLevels:0,minScore:0,enabled:true,reward:{kind:'points',points:100}});gameHasUnpublishedChanges=true;renderGameEditor();};
$('saveGameDraftButton').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const d=readGameEditor(),r=await call('adminSaveCravingDashConfig',{cravingDash:d});gameConfig={...d,enabled:false};gameHasUnpublishedChanges=true;renderGameEditor();message($('gameConfigMessage'),'Private draft saved · '+r.checkpoints+' milestones. Customer play stays off.','success');}catch(x){message($('gameConfigMessage'),friendlyError(x),'error');}finally{b.disabled=false;}};
$('startGameTestButton').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{const level=Number($('gameTestLevel').value);if(!Number.isSafeInteger(level)||level<1||level>1000000)throw Error('Choose a level from 1 to 1,000,000.');const d=readGameEditor();await call('adminSaveCravingDashConfig',{cravingDash:d});const payload=await call('adminStartCravingDashTest',{level});gameConfig={...d,enabled:false};gameHasUnpublishedChanges=true;renderGameEditor();const f=$('adminGameTestFrame');f.onload=()=>f.contentWindow?.postMessage({type:'craving-dash-admin-test-session',payload},location.origin);f.src='/?gameTest=1&v='+Date.now();gameTestDialog.showModal();message($('gameConfigMessage'),'Admin test does not award points, issue rewards, or change customer progress.','success');}catch(x){message($('gameConfigMessage'),friendlyError(x),'error');}finally{b.disabled=false;}};
$('toggleGameLiveButton').onclick=async e=>{const b=e.currentTarget;b.disabled=true;const publish=!gameIsLive||gameHasUnpublishedChanges;try{const d=readGameEditor(),r=await call('adminSetCravingDashLive',{enabled:publish,...(publish?{cravingDash:d}:{})});gameIsLive=r.enabled===true;gameHasUnpublishedChanges=publish?false:gameHasUnpublishedChanges;gameConfig={...d,enabled:false};renderGameEditor();message($('gameConfigMessage'),gameIsLive?'Craving Run is live · '+r.checkpoints+' active milestones.':'Craving Run is offline. Customers see Coming soon.','success');}catch(x){message($('gameConfigMessage'),friendlyError(x),'error');}finally{b.disabled=false;}};

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
  const choices = rewards.length ? [...rewards].map(r=>r.kind==="welcome"&&Number(r.order)===1?{...r,kind:"free-item",id:"order-1-burger",title:"Free Classic Crunchy Burger",detail:"Unlocked after completing order 1 · use on a later order",minimum:0,item:"Classic Crunchy Burger"}:r.kind==="welcome"?{...r,kind:"progress",id:"",title:"Order milestone",detail:"Keep ordering to unlock your next reward."}:r).sort((a,b)=>Number(a.order)-Number(b.order)) : [{order:1,kind:"free-item",id:"order-1-burger",title:"Free Classic Crunchy Burger",detail:"Unlocked after completing order 1 · use on a later order",minimum:0,item:"Classic Crunchy Burger"}];
  $("rewardEditor").innerHTML = choices.map((reward, index) => {
    const legacy = ["discount","double-points","welcome"].includes(reward.kind);
    const kind = reward.kind === "welcome" ? "progress" : reward.kind;
    const options = [["progress","No reward · progress only"],["free-item","Free regular menu item"],["percent-discount","Percentage discount"],["bonus-points","Craving Points"],["free-delivery","Free delivery"]];
    if (legacy) options.push([reward.kind, reward.kind === "discount" ? "Existing fixed discount · legacy" : reward.kind === "double-points" ? "Existing double points · legacy" : "Existing welcome · legacy"]);
    const optHtml = options.map(([v,label])=>`<option value="${v}" ${kind===v?"selected":""}>${label}</option>`).join("");
    return `<article class="reward-row" data-reward-index="${index}"><header class="reward-row-heading"><strong>Reward earned after order</strong><select class="reward-order" aria-label="Completed order number">${Array.from({length:30},(_,i)=>`<option value="${i+1}" ${Number(reward.order)===i+1?"selected":""}>${i+1}${i===0?"st":i===1?"nd":i===2?"rd":"th"} order</option>`).join("")}</select></header><div class="reward-fields"><label>What does the customer get?<select class="reward-kind">${optHtml}</select></label><label class="reward-title-field">Reward name<input class="reward-title" maxlength="100" value="${escapeHtml(reward.title||"")}" placeholder="e.g. Free Crunchy Burger"></label><label class="reward-minimum-field" ${["free-item","percent-discount","bonus-points","free-delivery","discount"].includes(kind)?"":"hidden"}><span class="reward-minimum-label">${kind==="free-delivery"?"Minimum food subtotal (₹)":"Minimum regular-food spend (₹)"}</span><input class="reward-minimum" type="number" min="0" max="10000" step="1" value="${Number(reward.minimum||0)}"><small class="reward-minimum-help">${kind==="free-delivery"?"Combos, regular items, and mixed orders count. Extras and delivery do not.":"Combos, extras, and delivery do not count toward this spend reward."}</small></label><label class="reward-item-field" ${kind!=="free-item"?"hidden":""}>Free item<select class="reward-item">${rewardFoodOptions(reward.item||"")}</select></label><label class="reward-percent-field" ${kind!=="percent-discount"?"hidden":""}>Discount (%)<input class="reward-percent" type="number" min="1" max="100" step="1" value="${Number(reward.percent||10)}"></label><label class="reward-cap-field" ${kind!=="percent-discount"?"hidden":""}>Maximum discount (₹)<input class="reward-cap" type="number" min="1" max="10000" step="1" value="${Number(reward.maxDiscount||100)}"></label><label class="reward-points-field" ${kind!=="bonus-points"?"hidden":""}>Craving Points<input class="reward-points" type="number" min="1" max="10000" step="1" value="${Number(reward.points||100)}"><small>Credited when this milestone is completed.</small></label><label class="reward-amount-field" ${kind!=="discount"?"hidden":""}>Discount amount (₹)<input class="reward-amount" type="number" min="1" max="1000" value="${Number(reward.amount||0)}"></label><label class="reward-double-field" ${kind!=="double-points"?"hidden":""}>Bonus point limit<input class="reward-double" type="number" min="1" max="10000" value="${Number(reward.maxBonusPoints||0)}"></label><label class="reward-id-field" ${kind==="progress"?"hidden":""}>Reward ID<input class="reward-id" value="${escapeHtml(reward.id||`order-${reward.order}-${crypto.randomUUID().slice(0,8)}`)}" placeholder="stable ID" aria-label="Stable reward ID"></label><label class="reward-detail-field">Customer message<input class="reward-detail" maxlength="180" value="${escapeHtml(reward.detail||"")}" placeholder="Shown in Rewards"></label></div></article>`;
  }).join("");
  $("rewardEditor").querySelectorAll(".reward-row").forEach(row=>{
    const toggle=()=>{const k=row.querySelector(".reward-kind").value;for(const [cls,show] of [["reward-minimum-field",["free-item","percent-discount","bonus-points","free-delivery","discount"].includes(k)],["reward-item-field",k==="free-item"],["reward-percent-field",k==="percent-discount"],["reward-cap-field",k==="percent-discount"],["reward-points-field",k==="bonus-points"],["reward-amount-field",k==="discount"],["reward-double-field",k==="double-points"],["reward-id-field",k!=="progress"]])row.querySelectorAll("."+cls).forEach(el=>el.hidden=!show);const help=row.querySelector(".reward-minimum-help");if(help)help.textContent=k==="free-delivery"?"Food subtotal at redemption. Combos, regular items, and mixed orders count; extras and delivery do not.":"Food subtotal at redemption. Combos, extras, and delivery do not count toward this spend reward.";const label=row.querySelector(".reward-minimum-label");if(label)label.textContent=k==="free-delivery"?"Minimum food subtotal (₹)":"Minimum regular-food spend (₹)";};
    row.querySelector(".reward-kind").addEventListener("change",toggle);toggle();
  });
  renderBenefitRewardOptions();
}
function readRewardEditor() {
  return [...$("rewardEditor").querySelectorAll(".reward-row")].map((row, index) => {
    const kind = row.querySelector(".reward-kind").value, title = row.querySelector(".reward-title").value.trim(), id = row.querySelector(".reward-id").value.trim(), detail = row.querySelector(".reward-detail").value.trim();
    const data = { order: Number(row.querySelector(".reward-order").value), kind, title, detail };
    if (id && kind !== "progress") data.id = id;
    if (["free-delivery", "free-item", "discount", "percent-discount", "bonus-points"].includes(kind)) data.minimum = Number(row.querySelector(".reward-minimum").value);
    if (kind === "free-item") data.item = row.querySelector(".reward-item").value.trim();
    if (kind === "discount") data.amount = Number(row.querySelector(".reward-amount").value);
    if (kind === "double-points") data.maxBonusPoints = Number(row.querySelector(".reward-amount").value);
    if (kind === "percent-discount") { data.percent=Number(row.querySelector(".reward-percent").value); data.maxDiscount=Number(row.querySelector(".reward-cap").value); }
    if (kind === "bonus-points") data.points=Number(row.querySelector(".reward-points").value);
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
  try { const journey=readRewardEditor(); if(new Set(journey.map(item=>item.order)).size!==journey.length) throw new Error("Choose each completed-order number only once."); const result = await call("adminSaveRewardsConfig", { journey }); rewards = journey; renderRewardEditor(); message($("rewardsMessage"), `Saved ${result.milestones} reward milestones to Firebase.`, "success"); }
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

async function loadOrderTestMode() {
  try {
    const settings = await call("adminGetOrderTestMode", {});
    $("orderTestModeEnabled").checked = settings.enabled === true;
    $("orderTestPhones").value = (settings.phones || []).map(phone => String(phone).replace(/^\+91/, "")).join("\n");
    $("orderTestModeStatus").textContent = settings.enabled ? "TEST MODE ON" : "OFF";
    $("orderTestModeStatus").classList.toggle("is-test-mode", settings.enabled === true);
  } catch (error) {
    $("orderTestModeStatus").textContent = "Unavailable";
    message($("orderTestModeMessage"), friendlyError(error), "error");
  }
}

$("orderTestModeForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("saveOrderTestMode");
  const enabled = $("orderTestModeEnabled").checked;
  const phones = $("orderTestPhones").value.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean);
  if (enabled && phones.length === 0) {
    message($("orderTestModeMessage"), "Add at least one approved number before enabling test mode.", "error");
    return;
  }
  button.disabled = true;
  message($("orderTestModeMessage"), "Saving test access…");
  try {
    const result = await call("adminUpdateOrderTestMode", { enabled, phones });
    $("orderTestModeEnabled").checked = result.enabled;
    $("orderTestPhones").value = (result.phones || []).map(phone => String(phone).replace(/^\+91/, "")).join("\n");
    $("orderTestModeStatus").textContent = result.enabled ? "TEST MODE ON" : "OFF";
    $("orderTestModeStatus").classList.toggle("is-test-mode", result.enabled === true);
    message($("orderTestModeMessage"), result.enabled
      ? "Test mode is on. Only the approved numbers can order; test orders are isolated from staff and sales."
      : "Test mode is off. Normal online-order rules apply.", "success");
  } catch (error) {
    message($("orderTestModeMessage"), friendlyError(error), "error");
  } finally {
    button.disabled = false;
  }
});
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
