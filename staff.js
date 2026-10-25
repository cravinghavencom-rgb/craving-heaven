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
const appCheck = useEmulator ? null : initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LdBasMtAAAAAJE5V6ZDZefojEfJx9vfDFowfIjU"),
  isTokenAutoRefreshEnabled: true
});
const auth = getAuth(app);
if (useEmulator) connectAuthEmulator(auth, `http://${hostname}:9400`, { disableWarnings: true });
const authPersistence = setPersistence(auth, browserLocalPersistence);
const functions = getFunctions(app, "asia-south1");
if (useEmulator) connectFunctionsEmulator(functions, hostname, 9402);

const $ = id => document.getElementById(id);
const loginPanel = $("loginPanel");
const deskPanel = $("deskPanel");
const authMessage = $("authMessage");
const orderSoundButton = $("orderSoundButton");
const newOrderAlert = $("newOrderAlert");
const phoneForm = $("phoneForm");
const otpForm = $("otpForm");
const phoneInput = $("phoneInput");
const otpInput = $("otpInput");
const sendOtpButton = $("sendOtpButton");
const verifyOtpButton = $("verifyOtpButton");
const logoutButton = $("logoutButton");
const ordersPanel = $("ordersPanel");
const newOrderPanel = $("newOrderPanel");
const salesPanel = $("salesPanel");
const historyPanel = $("historyPanel");
const availabilityPanel = $("availabilityPanel");
const ordersList = $("ordersList");
const orderMessage = $("orderMessage");
let verifier = null;
let confirmation = null;
let orders = [];
let historyOrders = [];
let knownOnlineOrderIds = null;
let ordersLoading = false;
let orderSoundEnabled = false;
let orderAudioContext = null;
let orderAlertTimeout = null;
let activeTab = "online";
let activeStatusFilter = "all";
let cart = [];
let pendingWalkinRequestId = null;
let editingWalkinOrderId = null;

const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const readableOrderNumber = order => {
  if (order.orderNumber) return order.orderNumber;
  const prefix = order.source === "walk-in" ? "WK" : order.orderType === "pickup" ? "PK" : "DL";
  return `${prefix}-${String(order.id || "").slice(-4).toUpperCase()}`;
};
const orderDate = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Time unavailable";

function resetVerifier() {
  if (verifier) verifier.clear();
  verifier = null;
  $("recaptcha-container").replaceChildren();
}

phoneForm.addEventListener("submit", async event => {
  event.preventDefault();
  authMessage.textContent = "";
  const digits = phoneInput.value.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) { authMessage.textContent = "Enter a valid 10-digit Indian mobile number."; return; }
  sendOtpButton.disabled = true;
  sendOtpButton.textContent = "Sending…";
  try {
    await authPersistence;
    verifier ||= new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    confirmation = await signInWithPhoneNumber(auth, `+91${digits}`, verifier);
    phoneForm.hidden = true;
    otpForm.hidden = false;
    authMessage.textContent = `Code sent to +91 ${digits}.`;
    if (local && useEmulator) {
      $("localOtpHint").hidden = false;
      const authEmulatorHost = hostname === "localhost" ? "localhost" : "127.0.0.1";
      $("localOtpLink").href = `http://${authEmulatorHost}:9400/emulator/v1/projects/demo-craving-heaven-local/verificationCodes`;
      $("localOtpLink").hidden = false;
    }
    otpInput.focus();
  } catch (error) {
    resetVerifier();
    authMessage.textContent = error.code === "auth/too-many-requests" ? "Too many attempts. Please wait and try again." : "Could not send the code. Check your number and try again.";
  } finally {
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = "Send OTP";
  }
});

otpForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!confirmation || !/^\d{6}$/.test(otpInput.value.trim())) { authMessage.textContent = "Enter the 6-digit code."; return; }
  verifyOtpButton.disabled = true;
  verifyOtpButton.textContent = "Verifying…";
  authMessage.textContent = "Checking staff access…";
  try {
    await confirmation.confirm(otpInput.value.trim());
  } catch (error) {
    authMessage.textContent = error.code === "auth/invalid-verification-code" ? "That code is incorrect. Check it and try again." : "Sign-in failed. Please request a new code.";
    verifyOtpButton.disabled = false;
    verifyOtpButton.textContent = "Verify";
  }
});

$("changeNumberButton").addEventListener("click", () => {
  confirmation = null;
  otpForm.hidden = true;
  phoneForm.hidden = false;
  authMessage.textContent = "";
  $("localOtpHint").hidden = true;
  $("localOtpLink").hidden = true;
  resetVerifier();
});
logoutButton.addEventListener("click", () => signOut(auth));

async function showDesk(user) {
  if (!user) {
    loginPanel.hidden = false;
    deskPanel.hidden = true;
    logoutButton.hidden = true;
    return;
  }
  try {
    await authPersistence;
    let token = await user.getIdTokenResult();
    if (token.claims.staff !== true && token.claims.admin !== true) token = await user.getIdTokenResult(true);
    if (token.claims.staff !== true) {
      await signOut(auth);
      loginPanel.hidden = false;
      deskPanel.hidden = true;
      authMessage.textContent = "This account does not have staff access. Ask the administrator to enable it.";
      return;
    }
    loginPanel.hidden = true;
    deskPanel.hidden = false;
    logoutButton.hidden = false;
    $("staffPhone").textContent = user.phoneNumber || "Staff account";
    await Promise.all([loadOrders(), loadOrderingStatus()]);
  } catch (error) {
    loginPanel.hidden = false;
    deskPanel.hidden = true;
    authMessage.textContent = "Could not verify staff access. Please refresh and sign in again.";
  }
}
onAuthStateChanged(auth, showDesk);

async function loadOrders() {
  if (ordersLoading) return;
  ordersLoading = true;
  try {
    const result = await httpsCallable(functions, "staffListOrders")({});
    const nextOrders = Array.isArray(result.data?.orders) ? result.data.orders : [];
    const incomingOnlineOrders = knownOnlineOrderIds === null
      ? []
      : nextOrders.filter(order => order.source !== "walk-in" && !knownOnlineOrderIds.has(order.id));
    if (knownOnlineOrderIds === null) knownOnlineOrderIds = new Set();
    nextOrders.filter(order => order.source !== "walk-in").forEach(order => knownOnlineOrderIds.add(order.id));
    while (knownOnlineOrderIds.size > 500) knownOnlineOrderIds.delete(knownOnlineOrderIds.values().next().value);
    orders = nextOrders;
    renderOrders();
    const onlineToday = nextOrders.filter(order => order.source !== "walk-in").length;
    const walkInToday = nextOrders.length - onlineToday;
    $("orderStatusMessage").textContent = `${onlineToday} online · ${walkInToday} walk-in · refreshed ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).format(new Date())}`;
    if (incomingOnlineOrders.length) {
      announceNewOnlineOrders(incomingOnlineOrders);
    }
  } catch (error) {
    orders = [];
    renderOrders();
    $("orderStatusMessage").textContent = error.code === "functions/permission-denied"
      ? "Staff access is required to load today’s orders. Ask an administrator to check this account."
      : "Today’s orders could not load. Check your connection, then use Refresh data to try again.";
    ordersList.innerHTML = `<p class="message">${escapeHtml(error.code === "functions/permission-denied" ? "Staff access is required. Sign out and ask the administrator to check your account." : "Orders could not load. Check the connection and try again.")}</p>`;
  } finally {
    ordersLoading = false;
  }
}

function mumbaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = type => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function shiftDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function historyDateRange() {
  const mode = $("historyPeriod").value;
  const today = mumbaiDateKey();
  if (mode === "custom") return { startDate: $("historyStart").value, endDate: $("historyEnd").value };
  if (mode === "yesterday") return { startDate: shiftDateKey(today, -1), endDate: shiftDateKey(today, -1) };
  if (mode === "week") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const monday = shiftDateKey(today, -((weekday + 6) % 7));
    return { startDate: monday, endDate: today };
  }
  if (mode === "month") return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  return { startDate: today, endDate: today };
}
function updateHistoryDateControls() {
  const custom = $("historyPeriod").value === "custom";
  $("historyStartWrap").hidden = !custom;
  $("historyEndWrap").hidden = !custom;
}
async function loadOrderHistory() {
  const range = historyDateRange();
  if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
    $("historyStatusMessage").textContent = "Choose a valid start and end date.";
    return;
  }
  $("historyApply").disabled = true;
  $("historyStatusMessage").textContent = "Loading order history…";
  try {
    const result = await httpsCallable(functions, "staffListOrders")(range);
    historyOrders = Array.isArray(result.data?.orders) ? result.data.orders : [];
    const areaSelect = $("historyArea");
    const selectedArea = areaSelect.value;
    const areas = [...new Set(historyOrders.map(order => String(order.area || (order.orderType === "pickup" ? "Store pickup" : "Walk-in counter") || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    areaSelect.innerHTML = '<option value="all">All areas</option>' + areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join("");
    if (areas.includes(selectedArea)) areaSelect.value = selectedArea;
    const itemSelect = $("historyItem");
    const selectedItem = itemSelect.value;
    const itemNames = [...new Set(historyOrders.flatMap(order => (order.items || []).map(item => String(item.name || "").trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    itemSelect.innerHTML = '<option value="all">All items</option>' + itemNames.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (itemNames.includes(selectedItem)) itemSelect.value = selectedItem;
    const total = historyOrders.length;
    $("historyStatusMessage").textContent = `${total} order${total === 1 ? "" : "s"} · ${range.startDate} to ${range.endDate}${result.data?.truncated ? " · Showing up to 500; narrow the dates to see more." : ""}`;
    renderHistoryOrders();
  } catch (error) {
    $("historyStatusMessage").textContent = error.code === "functions/permission-denied" ? "Staff access is required to view order history." : "Order history could not load. Check the dates and connection, then retry.";
    $("historyOrdersList").innerHTML = '<p class="muted">Could not load these records.</p>';
  } finally {
    $("historyApply").disabled = false;
  }
}
function renderHistoryOrders() {
  const source = $("historySource").value;
  const status = $("historyStatus").value;
  const payment = $("historyPayment").value;
  const area = $("historyArea").value;
  const item = $("historyItem").value;
  const timeStart = $("historyTimeStart").value;
  const timeEnd = $("historyTimeEnd").value;
  const query = $("historySearch").value.trim().toLowerCase();
  const shown = historyOrders.filter(order => {
    if (source !== "all" && (source === "walk-in" ? order.source !== "walk-in" : order.source === "walk-in")) return false;
    if (status !== "all" && String(order.status || "new").toLowerCase() !== status) return false;
    if (payment !== "all" && String(order.paymentStatus || "pending").toLowerCase() !== payment) return false;
    const location = String(order.area || (order.orderType === "pickup" ? "Store pickup" : "Walk-in counter"));
    if (area !== "all" && location !== area) return false;
    if (item !== "all" && !(order.items || []).some(line => String(line.name || "") === item)) return false;
    if ((timeStart || timeEnd) && !order.createdAt) return false;
    if ((timeStart || timeEnd) && order.createdAt) {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(order.createdAt));
      const time = `${parts.find(part => part.type === "hour")?.value || "00"}:${parts.find(part => part.type === "minute")?.value || "00"}`;
      if (timeStart && timeEnd && timeStart <= timeEnd && (time < timeStart || time > timeEnd)) return false;
      if (timeStart && timeEnd && timeStart > timeEnd && time < timeStart && time > timeEnd) return false;
      if (timeStart && !timeEnd && time < timeStart) return false;
      if (!timeStart && timeEnd && time > timeEnd) return false;
    }
    return !query || [order.id, readableOrderNumber(order), order.customerName, order.mobile, order.area, order.address, ...(order.items || []).map(item => item.name)].some(value => String(value || "").toLowerCase().includes(query));
  });
  if (!shown.length) {
    $("historyOrdersList").innerHTML = '<div class="cart-empty">No orders match these history filters.</div>';
    $("historyExport").disabled = true;
    return;
  }
  $("historyExport").disabled = false;
  $("historyOrdersList").innerHTML = shown.map(order => {
    const mode = order.source === "walk-in" ? "Walk-in" : order.orderType === "pickup" ? "Online pickup" : "Online delivery";
    const items = (order.items || []).map(item => `${escapeHtml(item.name)} × ${Number(item.qty) || 1}`).join(" · ");
    const address = order.orderType === "pickup" ? "Store pickup" : [order.addressLabel, order.address, order.landmark ? `Near ${order.landmark}` : "", order.area].filter(Boolean).join(", ");
    return `<article class="history-order-card"><div><strong>${escapeHtml(readableOrderNumber(order))}</strong><span class="status-badge">${escapeHtml(order.status || "new")}</span></div><p>${escapeHtml(orderDate(order.createdAt))} · ${escapeHtml(mode)} · ${escapeHtml(order.paymentStatus || "pending")} · ${escapeHtml(order.paymentMethod || "—")}</p><p><b>${escapeHtml(order.customerName || "Customer")}</b>${order.mobile ? ` · ${escapeHtml(order.mobile)}` : ""} <strong class="history-total">${money(order.total)}</strong></p><p>${items || "No item details"}</p>${address ? `<details><summary>View address / pickup details</summary><p>${escapeHtml(address)}</p></details>` : ""}</article>`;
  }).join("");
}
function excelXmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function downloadHistoryExcel() {
  const source = $("historySource").value;
  const status = $("historyStatus").value;
  const payment = $("historyPayment").value;
  const area = $("historyArea").value;
  const item = $("historyItem").value;
  const query = $("historySearch").value.trim().toLowerCase();
  const timeStart = $("historyTimeStart").value;
  const timeEnd = $("historyTimeEnd").value;
  const shown = historyOrders.filter(order => {
    if (source !== "all" && (source === "walk-in" ? order.source !== "walk-in" : order.source === "walk-in")) return false;
    if (status !== "all" && String(order.status || "new").toLowerCase() !== status) return false;
    if (payment !== "all" && String(order.paymentStatus || "pending").toLowerCase() !== payment) return false;
    const location = String(order.area || (order.orderType === "pickup" ? "Store pickup" : "Walk-in counter"));
    if (area !== "all" && location !== area) return false;
    if (item !== "all" && !(order.items || []).some(line => String(line.name || "") === item)) return false;
    if ((timeStart || timeEnd) && !order.createdAt) return false;
    if ((timeStart || timeEnd) && order.createdAt) {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(order.createdAt));
      const time = `${parts.find(part => part.type === "hour")?.value || "00"}:${parts.find(part => part.type === "minute")?.value || "00"}`;
      if (timeStart && timeEnd && timeStart <= timeEnd && (time < timeStart || time > timeEnd)) return false;
      if (timeStart && timeEnd && timeStart > timeEnd && time < timeStart && time > timeEnd) return false;
      if (timeStart && !timeEnd && time < timeStart) return false;
      if (!timeStart && timeEnd && time > timeEnd) return false;
    }
    return !query || [order.id, readableOrderNumber(order), order.customerName, order.mobile, location, order.address, ...(order.items || []).map(line => line.name)].some(value => String(value || "").toLowerCase().includes(query));
  });
  if (!shown.length) return;
  const headers = ["Date", "Time (IST)", "Order ID", "Type", "Status", "Customer", "Mobile", "Area / location", "Address", "Payment method", "Payment status", "Items", "Subtotal (₹)", "Discount (₹)", "Delivery (₹)", "Order total (₹)"];
  const textCell = value => `<Cell><Data ss:Type="String">${excelXmlEscape(value)}</Data></Cell>`;
  const numberCell = value => `<Cell><Data ss:Type="Number">${Number(value) || 0}</Data></Cell>`;
  const rows = [`<Row>${headers.map(textCell).join("")}</Row>`, ...shown.map(order => {
    const date = order.createdAt ? new Date(order.createdAt) : null;
    const dateText = date ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) : "";
    const timeText = date ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date) : "";
    const mode = order.source === "walk-in" ? "Walk-in" : order.orderType === "pickup" ? "Online pickup" : "Online delivery";
    const place = order.area || (order.orderType === "pickup" ? "Store pickup" : "Walk-in counter");
    const address = order.orderType === "pickup" ? "Store pickup" : [order.addressLabel, order.address, order.landmark, order.area].filter(Boolean).join(", ");
    const items = (order.items || []).map(line => `${line.name} × ${Number(line.qty) || 1}`).join(" | ");
    return `<Row>${[dateText, timeText, readableOrderNumber(order), mode, order.status || "new", order.customerName || "Customer", order.mobile || "", place, address, order.paymentMethod || "", order.paymentStatus || "pending", items].map(textCell).join("")}${[order.subtotal, order.discountAmount, order.deliveryCharge, order.total].map(numberCell).join("")}</Row>`;
  })];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Orders"><Table>${rows.join("")}</Table></Worksheet></Workbook>`;
  const blob = new Blob(["\ufeff", xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `craving-heaven-orders-${mumbaiDateKey()}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
$("historyExport").addEventListener("click", downloadHistoryExcel);
$("historyPeriod").addEventListener("change", updateHistoryDateControls);
$("historyApply").addEventListener("click", loadOrderHistory);
["historySource", "historyStatus", "historyPayment", "historyArea", "historyItem", "historyTimeStart", "historyTimeEnd"].forEach(id => $(id).addEventListener("change", renderHistoryOrders));
$("historySearch").addEventListener("input", renderHistoryOrders);
updateHistoryDateControls();

function playOrderChime() {
  if (!orderSoundEnabled || !orderAudioContext) return;
  const notes = [
    { frequency: 784, offset: 0 },
    { frequency: 988, offset: 0.2 },
    { frequency: 1318, offset: 0.4 },
    { frequency: 988, offset: 0.92 },
    { frequency: 1318, offset: 1.12 },
    { frequency: 1568, offset: 1.32 }
  ];
  const start = orderAudioContext.currentTime + 0.04;
  for (const note of notes) {
    const oscillator = orderAudioContext.createOscillator();
    const gain = orderAudioContext.createGain();
    const noteStart = start + note.offset;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.62, noteStart + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
    oscillator.connect(gain);
    gain.connect(orderAudioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.25);
  }
}

function announceNewOnlineOrders(newOrders) {
  const count = newOrders.length;
  const latestOrder = newOrders[0];
  const orderLabel = latestOrder ? ` ${readableOrderNumber(latestOrder)}` : "";
  newOrderAlert.textContent = count === 1
    ? `🔔 NEW ONLINE ORDER${orderLabel} — please check the order inbox.`
    : `🔔 ${count} NEW ONLINE ORDERS — please check the order inbox.`;
  newOrderAlert.hidden = false;
  clearTimeout(orderAlertTimeout);
  orderAlertTimeout = setTimeout(() => { newOrderAlert.hidden = true; }, 20000);
  playOrderChime();
}

orderSoundButton.addEventListener("click", async () => {
  if (orderSoundEnabled) {
    orderSoundEnabled = false;
    orderSoundButton.textContent = "🔔 Enable order sound";
    orderSoundButton.setAttribute("aria-pressed", "false");
    orderSoundButton.title = "Turn off new online order sounds";
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    orderSoundButton.textContent = "Sound unavailable";
    orderSoundButton.title = "This browser does not support order sounds";
    return;
  }
  try {
    orderAudioContext ||= new AudioContextClass();
    await orderAudioContext.resume();
    orderSoundEnabled = true;
    orderSoundButton.textContent = "🔔 Order sound on · Test";
    orderSoundButton.setAttribute("aria-pressed", "true");
    orderSoundButton.title = "Tap to test the sound; tap again to turn it off";
    playOrderChime();
  } catch (error) {
    console.warn("Could not enable order sound:", error);
    orderSoundButton.textContent = "Tap to enable sound";
  }
});
function renderTodaySales(data) {
  const date = data?.date ? new Date(`${data.date}T12:00:00+05:30`) : new Date();
  $("salesDate").textContent = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
  $("todayTotalSales").textContent = money(data?.total?.sales);
  $("todayTotalOrders").textContent = `${Number(data?.total?.orders || 0)} orders`;
  $("todayOnlineSales").textContent = money(data?.online?.sales);
  $("todayOnlineOrders").textContent = `${Number(data?.online?.orders || 0)} orders`;
  $("todayWalkInSales").textContent = money(data?.walkIn?.sales);
  $("todayWalkInOrders").textContent = `${Number(data?.walkIn?.orders || 0)} orders`;
  $("salesStatus").textContent = "Totals refreshed just now.";
}

async function loadTodaySales() {
  $("salesStatus").textContent = "Loading today’s orders…";
  try {
    const result = await httpsCallable(functions, "staffGetTodaySales")({});
    renderTodaySales(result.data || {});
  } catch (error) {
    $("salesStatus").textContent = error.code === "functions/permission-denied"
      ? "Staff access is required to view sales."
      : "Today’s sales could not load. Check the connection and try again.";
  }
}

$("refreshButton").addEventListener("click", () => {
  if (activeTab === "history") loadOrderHistory(); else loadOrders();
  loadTodaySales();
  loadOrderingStatus();
});

function renderOrderingStatus(data) {
  const status = data || {};
  const summary = $("staffAvailabilitySummary");
  const message = $("staffAvailabilityMessage");
  summary.textContent = status.adminMode === "closed"
    ? "ONLINE ORDERS CLOSED BY ADMIN"
    : status.paused && status.staffEnabled
    ? "ONLINE ORDERS PAUSED · HIGH ORDER VOLUME"
    : status.adminMode === "online"
      ? "ONLINE ORDERS OPEN · ADMIN CONTROL"
    : status.acceptingOnlineOrders
      ? "ONLINE ORDERS OPEN"
      : status.staffEnabled
        ? "STAFF STARTED · WAITING FOR STORE HOURS"
        : "ONLINE ORDERS OFF · STAFF START REQUIRED";
  summary.classList.toggle("is-paused", status.paused === true);
  summary.classList.toggle("is-open", status.acceptingOnlineOrders === true);
  summary.classList.toggle("is-closed", status.acceptingOnlineOrders !== true && status.paused !== true);
  message.textContent = status.adminMode === "closed"
    ? "Online orders are closed by an administrator. An administrator must reopen them; walk-in orders remain available."
    : status.adminMode === "online"
      ? "An administrator opened online ordering. You can stop or pause it here; it will not carry over to another day."
    : !status.staffEnabled
    ? "Online ordering stays off until a staff member starts it. A start lasts for today only, so it will never switch on automatically when store hours begin another day. Walk-in orders remain available."
    : status.paused
    ? "Customers cannot place website delivery or pickup orders while this rush pause is active. Walk-in orders remain available."
    : status.isOpen
      ? "Online orders are open. Stop them at any time; they will stay off until staff starts them again."
      : "Online ordering is started for today and will be available only during store hours. It will not carry over to another day.";
  $("startOnlineOrdersButton").hidden = status.staffEnabled === true;
  $("stopOnlineOrdersButton").hidden = status.staffEnabled !== true;
  $("pauseOnlineOrdersButton").hidden = status.staffEnabled !== true || status.paused === true;
  $("resumeOnlineOrdersButton").hidden = status.staffEnabled !== true || status.paused !== true;
}

async function loadOrderingStatus() {
  $("staffAvailabilitySummary").textContent = "Checking current status…";
  try {
    const result = await httpsCallable(functions, "getOrderingStatus")({});
    renderOrderingStatus(result.data || {});
    $("availabilityActionMessage").textContent = "";
  } catch (error) {
    $("staffAvailabilitySummary").textContent = "STATUS UNAVAILABLE";
    $("staffAvailabilityMessage").textContent = error.code === "functions/permission-denied"
      ? "Staff access is required to view order status."
      : "Could not load order status. Check the connection and retry.";
  }
}

async function setOnlineOrdersPaused(paused, button) {
  button.disabled = true;
  $("availabilityActionMessage").textContent = paused ? "Pausing online orders…" : "Resuming online orders…";
  try {
    const result = await httpsCallable(functions, "staffSetOnlineOrderingPaused")({ paused });
    renderOrderingStatus(result.data || {});
    $("availabilityActionMessage").textContent = paused
      ? "Online orders are paused for the rush."
      : "Online orders have resumed. Customers can order while the store is open.";
  } catch (error) {
    $("availabilityActionMessage").textContent = error.code === "functions/permission-denied"
      ? "Staff access is required to change online ordering."
      : error.message?.replace(/^FirebaseError:\s*/i, "") || "Could not update online order status. Please retry.";
  } finally {
    button.disabled = false;
  }
}

async function setOnlineOrdersEnabled(enabled, button) {
  button.disabled = true;
  $("availabilityActionMessage").textContent = enabled ? "Starting online ordering…" : "Stopping online ordering…";
  try {
    const result = await httpsCallable(functions, "staffSetOnlineOrderingEnabled")({ enabled });
    renderOrderingStatus(result.data || {});
    $("availabilityActionMessage").textContent = enabled
      ? "Online ordering is started for today. Customers can order only during store hours."
      : "Online ordering is off. It will stay off until staff starts it again.";
  } catch (error) {
    $("availabilityActionMessage").textContent = error.code === "functions/permission-denied"
      ? "Staff access is required to change online ordering."
      : error.message?.replace(/^FirebaseError:\s*/i, "") || "Could not update online order status. Please retry.";
  } finally {
    button.disabled = false;
  }
}

$("startOnlineOrdersButton").addEventListener("click", event => setOnlineOrdersEnabled(true, event.currentTarget));
$("stopOnlineOrdersButton").addEventListener("click", event => setOnlineOrdersEnabled(false, event.currentTarget));
$("pauseOnlineOrdersButton").addEventListener("click", event => setOnlineOrdersPaused(true, event.currentTarget));
$("resumeOnlineOrdersButton").addEventListener("click", event => setOnlineOrdersPaused(false, event.currentTarget));
$("refreshAvailabilityButton").addEventListener("click", loadOrderingStatus);
setInterval(() => {
  if (!deskPanel.hidden) {
    loadOrders();
    loadOrderingStatus();
  }
}, 15000);

function renderOrders() {
  const query = ($("orderSearch")?.value || "").trim().toLowerCase();
  const scopedOrders = orders.filter(order => activeTab === "walkin" ? order.source === "walk-in" : order.source !== "walk-in");
  const statusMatches = order => {
    const status = String(order.status || "new").toLowerCase();
    if (activeStatusFilter === "completed") return status === "completed" || status === "delivered" || status === "cancelled" || status === "canceled";
    return activeStatusFilter === "all" || status === activeStatusFilter;
  };
  const shown = scopedOrders.filter(statusMatches).filter(order => {
    if (!query) return true;
    return [order.id, readableOrderNumber(order), order.customerName, order.mobile, ...(order.items || []).map(item => item.name)].some(value => String(value || "").toLowerCase().includes(query));
  });
  $("onlineCount").textContent = orders.filter(order => order.source !== "walk-in").length;
  $("walkinCount").textContent = orders.filter(order => order.source === "walk-in").length;
  document.querySelectorAll("[data-status-filter]").forEach(button => {
    const filter = button.dataset.statusFilter;
    const count = scopedOrders.filter(order => {
      const status = String(order.status || "new").toLowerCase();
      return filter === "all" || (filter === "completed" ? status === "completed" || status === "delivered" || status === "cancelled" || status === "canceled" : status === filter);
    }).length;
    button.classList.toggle("active", filter === activeStatusFilter);
    button.setAttribute("aria-pressed", String(filter === activeStatusFilter));
    button.querySelector("span")?.remove();
    button.insertAdjacentHTML("beforeend", `<span>${count}</span>`);
  });
  if (!shown.length) {
    const kind = activeTab === "walkin" ? "walk-in" : "online";
    const filterLabel = activeStatusFilter === "all" ? "" : ` with status “${activeStatusFilter}”`;
    ordersList.innerHTML = `<div class="cart-empty">No ${kind} orders${filterLabel} have been placed today.</div>`;
    return;
  }
  ordersList.innerHTML = shown.map(order => {
    const lines = (order.items || []).map(item => `${item.name} × ${item.qty}${item.isFreeOffer || item.isLoyaltyReward ? " · FREE" : ""}`).join(" · ");
    const customer = order.mobile ? `${order.customerName} · ${order.mobile}` : order.customerName;
    const fullAddress = [order.addressLabel, order.address, order.landmark ? `Near ${order.landmark}` : "", order.area].filter(Boolean).join(", ");
    const isWalkIn = order.source === "walk-in";
    const isPickup = order.orderType === "pickup";
    const loyaltyNote = order.loyaltyLinked ? `${Number(order.pointsToAward || 0)} Craving Points after ${isWalkIn || isPickup ? "completion" : "delivery"} · reward progress tracked` : "";
    const finishStatus = isWalkIn || isPickup ? "completed" : "delivered";
    const statusActions = { new: ["preparing", finishStatus, "cancelled"], preparing: ["ready", finishStatus, "cancelled"], ready: [finishStatus, "cancelled"] };
    const nextStatuses = statusActions[String(order.status || "new").toLowerCase()] || [];
    const statusControl = nextStatuses.length ? `<div class="order-status-control"><label><span class="sr-only">Update status for order ${escapeHtml(order.id)}</span><select data-status-select="${escapeHtml(order.id)}">${nextStatuses.map(status => `<option value="${status}">${status === "preparing" ? "Preparing" : status === "ready" ? "Ready for pickup" : status === "delivered" ? "Delivered" : status === "completed" ? "Completed" : "Cancelled"}</option>`).join("")}</select></label><button type="button" class="status-update-button" data-update-status="${escapeHtml(order.id)}">Update</button></div>` : "";
    const canMarkPaid = String(order.paymentStatus || "pending").toLowerCase() === "pending" && !["cancelled", "canceled"].includes(String(order.status || "").toLowerCase());
    const balanceDue = Math.max(0, Number(order.balanceDue ?? (canMarkPaid ? order.total : 0)));
    const paymentControl = canMarkPaid ? `<button class="payment-paid-button" type="button" data-mark-paid="${escapeHtml(order.id)}">Mark ₹${balanceDue.toLocaleString("en-IN")} paid</button>` : "";
    const canAddWalkinItems = isWalkIn && ["new", "preparing", "ready"].includes(String(order.status || "new").toLowerCase());
    const orderMode = isWalkIn ? "Walk-in" : isPickup ? "Online pickup" : "Online delivery";
    const itemRows = (order.items || []).map(item => `<li><span>${escapeHtml(item.name)}${item.isFreeOffer || item.isLoyaltyReward ? ` <em>FREE</em>` : ""}</span><strong>× ${Number(item.qty) || 1}</strong></li>`).join("");
    const addressBlock = !isPickup && fullAddress ? `<details class="order-address"><summary><span><b>${escapeHtml(order.addressLabel || "Delivery")}</b>${order.area ? ` · ${escapeHtml(order.area)}` : ""}</span><span class="address-toggle">View full address</span></summary><p>${escapeHtml(fullAddress)}</p></details>` : isPickup ? `<div class="order-pickup"><b>Store pickup</b><span>CRAVING HEAVEN · Pathanwadi</span></div>` : "";
    return `<article class="order-card"><div class="order-card-primary"><div class="order-card-title"><h3>Order <span class="order-number">${escapeHtml(readableOrderNumber(order))}</span></h3><span class="status-badge ${order.paymentStatus === "paid" ? "paid" : ""}">${escapeHtml(order.status)} · ${escapeHtml(order.paymentStatus || "pending")}</span></div><div class="order-meta"><span>${escapeHtml(orderDate(order.createdAt))}</span><span>${orderMode}</span><span>${escapeHtml(customer)}</span>${order.paymentMethod ? `<span>${escapeHtml(order.paymentMethod)}</span>` : ""}</div></div><div class="order-card-actions"><strong>${money(order.total)}</strong>${balanceDue ? `<small class="order-balance-due">Due ${money(balanceDue)}</small>` : ""}<div>${canAddWalkinItems ? `<button class="add-order-items-button" type="button" data-add-walkin-items="${escapeHtml(order.id)}">＋ Add items</button>` : ""}${paymentControl}<button class="print-button" type="button" data-print-order="${escapeHtml(order.id)}">Print invoice</button></div></div><div class="order-lines"><p class="order-items-heading">${(order.items || []).length} ${((order.items || []).length === 1) ? "item" : "items"}</p><ul class="order-item-list">${itemRows || `<li>${escapeHtml(lines)}</li>`}</ul>${addressBlock}${loyaltyNote ? `<p class="loyalty-order-note">✦ ${escapeHtml(loyaltyNote)}</p>` : ""}</div>${statusControl}</article>`;
  }).join("");
}
$("orderSearch").addEventListener("input", renderOrders);
document.querySelectorAll("[data-status-filter]").forEach(button => button.addEventListener("click", () => {
  activeStatusFilter = button.dataset.statusFilter;
  renderOrders();
}));

document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
  if (editingWalkinOrderId) cancelWalkinItemAddition(false);
  activeTab = button.dataset.tab;
  document.querySelectorAll("[data-tab]").forEach(tab => tab.classList.toggle("active", tab === button));
  ordersPanel.hidden = activeTab !== "online" && activeTab !== "walkin";
  historyPanel.hidden = activeTab !== "history";
  newOrderPanel.hidden = activeTab !== "new";
  salesPanel.hidden = activeTab !== "sales";
  availabilityPanel.hidden = activeTab !== "availability";
  if (activeTab === "sales") loadTodaySales();
  if (activeTab === "history") loadOrderHistory();
  if (activeTab === "availability") loadOrderingStatus();
  renderOrders();
}));

function printableInvoice(order) {
  const lines = (order.items || []).map(item => `<tr><td>${escapeHtml(item.name)}${item.isFreeOffer || item.isLoyaltyReward ? " <small>(FREE)</small>" : ""}<br><small>Qty ${Number(item.qty) || 0} × ${money(item.price)}</small></td><td>${money((Number(item.price) || 0) * (Number(item.qty) || 0))}</td></tr>`).join("");
  const orderId = order.id || order.orderId;
  const orderNumber = readableOrderNumber(order);
  const customer = order.customerName || "Walk-in customer";
  const address = order.orderType === "pickup"
    ? "Pickup at CRAVING HEAVEN, Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097"
    : [order.addressLabel, order.address, order.landmark, order.area].filter(Boolean).join(", ");
  const orderMode = order.orderType === "walk-in" ? "Walk-in" : order.orderType === "pickup" ? "Online pickup" : "Online delivery";
  const completionLabel = order.orderType === "walk-in" || order.orderType === "pickup" ? "completion" : "delivery";
  const discount = Number(order.discountAmount || 0);
  $("invoice").innerHTML = `<div class="invoice-sheet"><h1>CRAVING HEAVEN</h1><p>Shop 10, Pearl Oasis Building, Pathanwadi, Malad East, Mumbai – 400097</p><p>7700929693</p><div class="invoice-rule"></div><div class="invoice-top"><span><b>Order</b><br>${escapeHtml(orderNumber)}</span><span><b>Date</b><br>${escapeHtml(orderDate(order.createdAt || new Date().toISOString()))}</span></div><p style="text-align:left"><b>${escapeHtml(orderMode)}</b><br>${escapeHtml(customer)}${order.mobile ? `<br>${escapeHtml(order.mobile)}` : ""}${address ? `<br>${escapeHtml(address)}` : ""}</p><table class="invoice-table"><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table><div class="invoice-total"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>${order.pointsRedeemed ? `<div class="invoice-total"><span>Craving Points redeemed (${Number(order.pointsRedeemed)})</span><span>−${money(order.pointsDiscount || 0)}</span></div>` : ""}${discount > Number(order.pointsDiscount || 0) ? `<div class="invoice-total"><span>Reward discount</span><span>−${money(discount - Number(order.pointsDiscount || 0))}</span></div>` : ""}${Number(order.deliveryCharge) ? `<div class="invoice-total"><span>Delivery</span><span>${money(order.deliveryCharge)}</span></div>` : ""}<div class="invoice-total grand"><span>Total</span><span>${money(order.total)}</span></div>${Number(order.balanceDue || 0) ? `<div class="invoice-total"><span>Balance due</span><span>${money(order.balanceDue)}</span></div>` : ""}<div class="invoice-rule"></div><div class="invoice-total"><span>Payment</span><span>${escapeHtml(order.paymentMethod || "—")} · ${escapeHtml(order.paymentStatus || "pending")}</span></div>${order.loyaltyLinked ? `<p style="text-align:left">Craving Points: ${Number(order.pointsToAward || 0)} after ${completionLabel}. Reward progress is tracked on completed orders.</p>` : ""}<p class="invoice-thanks">Thank you. Made with quality, served with love!</p></div>`;
  window.print();
}
ordersList.addEventListener("click", event => {
  const addItemsButton = event.target.closest("[data-add-walkin-items]");
  if (addItemsButton) {
    const order = orders.find(item => item.id === addItemsButton.dataset.addWalkinItems);
    if (order) beginWalkinItemAddition(order);
    return;
  }
  const paymentButton = event.target.closest("[data-mark-paid]");
  if (paymentButton) {
    const orderId = paymentButton.dataset.markPaid;
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    paymentButton.disabled = true;
    paymentButton.textContent = "Saving…";
    httpsCallable(functions, "staffMarkOrderPaid")({ orderId }).then(() => {
      order.paymentStatus = "paid";
      order.amountPaid = Number(order.total || 0);
      order.balanceDue = 0;
      renderOrders();
      $("orderStatusMessage").textContent = `Payment recorded for ${readableOrderNumber(order)}.`;
    }).catch(error => {
      paymentButton.disabled = false;
      paymentButton.textContent = "Mark paid";
      $("orderStatusMessage").textContent = error.code === "functions/failed-precondition"
        ? "Payment status changed or this order was cancelled. Refresh the order list."
        : "Could not record payment. Check the connection and retry.";
    });
    return;
  }
  const statusButton = event.target.closest("[data-update-status]");
  if (statusButton) {
    $("orderStatusMessage").textContent = "";
    const orderId = statusButton.dataset.updateStatus;
    const select = ordersList.querySelector(`[data-status-select="${CSS.escape(orderId)}"]`);
    const order = orders.find(item => item.id === orderId);
    if (!order || !select) return;
    statusButton.disabled = true;
    statusButton.textContent = "Saving…";
    httpsCallable(functions, "staffUpdateOrderStatus")({ orderId, status: select.value }).then(() => {
      order.status = select.value;
      renderOrders();
    }).catch(error => {
      statusButton.disabled = false;
      statusButton.textContent = "Update";
      $("orderStatusMessage").textContent = error.code === "functions/failed-precondition" ? "This order changed elsewhere. Refresh and try again." : "Could not update this order. Check the connection and retry.";
    });
    return;
  }
  const button = event.target.closest("[data-print-order]");
  if (!button) return;
  const order = orders.find(item => item.id === button.dataset.printOrder);
  if (order) printableInvoice(order);
});

function getCatalogItems() {
  const items = [];
  for (const section of Object.values(window.MENU_DATA || {})) {
    for (const item of section.items || []) {
      if (Array.isArray(item.options)) {
        for (const option of item.options) items.push({ name: option.name, price: Number(option.price), group: section.title });
      } else items.push({ name: item.name, price: Number(item.price), group: section.title });
    }
  }
  for (const combo of window.COMBO_MENU_DATA || []) items.push({ name: combo.name, price: Number(combo.price), group: "COMBOS" });
  return items;
}
let catalogItems = getCatalogItems();
const menuCategory = $("menuCategory");
function renderMenuCategories() {
  const categories = [...new Set(catalogItems.map(item => item.group))];
  menuCategory.innerHTML = `<option value="all">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
}
function applyPublicMenu(config) {
  if (!config?.menu || !Array.isArray(config.combos)) return false;
  for (const key of Object.keys(window.MENU_DATA || {})) delete window.MENU_DATA[key];
  Object.assign(window.MENU_DATA, config.menu);
  window.COMBO_MENU_DATA.splice(0, window.COMBO_MENU_DATA.length, ...config.combos);
  catalogItems = getCatalogItems();
  renderMenuCategories();
  return true;
}

function renderMenuResults() {
  const query = $("menuSearch").value.trim().toLowerCase();
  const category = menuCategory.value;
  const filtered = catalogItems.map((item, index) => ({ ...item, index })).filter(item => (category === "all" || item.group === category) && (!query || `${item.group} ${item.name}`.toLowerCase().includes(query)));
  $("menuCount").textContent = `${filtered.length} items`;
  $("menuResults").innerHTML = filtered.length ? filtered.map(item => `<button class="menu-result" type="button" data-add-menu="${item.index}"><span class="menu-result-copy"><small>${escapeHtml(item.group)}</small><strong>${escapeHtml(item.name)}</strong></span><span class="menu-result-price">${money(item.price)}<b>＋</b></span></button>`).join("") : '<p class="cart-empty">No menu items match that search.</p>';
}
menuCategory.addEventListener("change", renderMenuResults);
$("menuSearch").addEventListener("input", renderMenuResults);
$("menuResults").addEventListener("click", event => {
  const button = event.target.closest("[data-add-menu]");
  if (button) addCatalogItem(Number(button.dataset.addMenu));
});
renderMenuResults();
httpsCallable(functions, "getPublicBusinessConfig")({})
  .then(result => {
    if (applyPublicMenu(result.data)) renderMenuResults();
  })
  .catch(error => console.warn("Could not load updated staff menu:", error));

let customerLookupTimer = null;
let customerLookupVersion = 0;
let lastLookedUpMobile = "";
let lastLookupResult = null;
let autoFilledCustomerName = "";
let priorCustomerMobile = "";
const mobileField = $("walkinMobile");
const loyaltyHint = $("walkinLoyaltyHint");

async function lookupWalkinCustomer() {
  const rawMobile = mobileField.value.trim();
  const digits = rawMobile.replace(/\D/g, "");
  const normalizedMobile = digits.length === 10 ? `+91${digits}` : digits.length === 12 && digits.startsWith("91") ? `+${digits}` : rawMobile;
  if (!/^\+91[6-9]\d{9}$/.test(normalizedMobile)) {
    if (digits.length >= 10) loyaltyHint.textContent = "Enter a valid Indian mobile number to look up the customer.";
    return null;
  }
  if (normalizedMobile === lastLookedUpMobile) return lastLookupResult;
  const requestVersion = ++customerLookupVersion;
  loyaltyHint.textContent = "Looking up customer account…";
  try {
    const result = await httpsCallable(functions, "staffLookupCustomer")({ mobile: normalizedMobile });
    const currentDigits = mobileField.value.trim().replace(/\D/g, "");
    const currentMobile = currentDigits.length === 10 ? `+91${currentDigits}` : currentDigits.length === 12 && currentDigits.startsWith("91") ? `+${currentDigits}` : "";
    if (requestVersion !== customerLookupVersion || normalizedMobile !== currentMobile) return null;
    lastLookedUpMobile = normalizedMobile;
    lastLookupResult = result.data;
    if (result.data?.found) {
      if (result.data.name && (!$("walkinName").value.trim() || $("walkinName").value.trim() === "Walk-in customer" || $("walkinName").value.trim() === autoFilledCustomerName)) {
        $("walkinName").value = result.data.name;
        autoFilledCustomerName = result.data.name;
      }
      const rewards = Array.isArray(result.data.availableRewards) ? result.data.availableRewards : [];
      const upcoming = Array.isArray(result.data.upcomingRewards) ? result.data.upcomingRewards : [];
      const readyText = rewards.length ? rewards.map(reward => `${reward.title} — ${reward.detail}`).join("; ") : "None yet";
      const nextText = upcoming.length ? upcoming.map(reward => `Order ${reward.order}: ${reward.title} (${reward.detail})`).join("; ") : "Journey complete — next cycle starts on the next delivered order";
      const pointsBalance = Math.max(0, Number(result.data.points || 0));
      const pointRedemptionText = pointsBalance >= 100
        ? `${Math.floor(pointsBalance / 100) * 100} points currently redeemable in 100-point steps (100 points = ₹10)`
        : `${pointsBalance} points · ${money(pointsBalance / 10)} value · ${100 - pointsBalance} more needed to reach the 100-point redemption minimum`;
      loyaltyHint.classList.add("is-matched");
      loyaltyHint.classList.remove("is-missing");
      loyaltyHint.textContent = `Account found: ${result.data.name || "Customer"}\n${pointsBalance.toLocaleString("en-IN")} Craving Points · ${Number(result.data.completedOrders || 0)} completed orders\nPoint redemption: ${pointRedemptionText}\nMilestone rewards ready: ${readyText}\nComing up: ${nextText}\nPoints and reward progress update when this walk-in order is completed.`;
      renderWalkinBenefits();
    } else {
      if (autoFilledCustomerName && $("walkinName").value.trim() === autoFilledCustomerName) $("walkinName").value = "Walk-in customer";
      autoFilledCustomerName = "";
      loyaltyHint.classList.remove("is-matched");
      loyaltyHint.classList.add("is-missing");
      loyaltyHint.textContent = "No verified website account found for this number. The order can still be created, but loyalty won't be linked.";
      $("walkinBenefits").hidden = true;
    }
    return result.data;
  } catch (error) {
    if (requestVersion === customerLookupVersion) {
      loyaltyHint.classList.remove("is-matched");
      loyaltyHint.classList.add("is-missing");
      loyaltyHint.textContent = "Customer details could not be loaded. Check the number or connection and retry.";
    }
    return null;
  }
}

mobileField.addEventListener("input", () => {
  clearTimeout(customerLookupTimer);
  customerLookupVersion += 1;
  lastLookedUpMobile = "";
  lastLookupResult = null;
  $("walkinRedeemPoints").value = "0";
  $("walkinReward").value = "";
  renderWalkinBenefits();
  const rawMobile = mobileField.value.trim();
  if (rawMobile !== priorCustomerMobile && autoFilledCustomerName && $("walkinName").value.trim() === autoFilledCustomerName) {
    $("walkinName").value = "Walk-in customer";
    autoFilledCustomerName = "";
  }
  priorCustomerMobile = rawMobile;
  const digits = rawMobile.replace(/\D/g, "");
  if (digits.length >= 10) {
    loyaltyHint.textContent = "Looking up customer account…";
    customerLookupTimer = setTimeout(() => lookupWalkinCustomer(), 450);
  } else {
    loyaltyHint.classList.remove("is-matched", "is-missing");
    loyaltyHint.textContent = "Enter a customer's registered mobile number to look up their profile and Craving Points.";
    $("walkinBenefits").hidden = true;
  }
});
mobileField.addEventListener("blur", () => {
  clearTimeout(customerLookupTimer);
  if (mobileField.value.trim()) lookupWalkinCustomer();
});

function getWalkinEligibleSubtotal() {
  return cart.reduce((sum, item) => sum + (item.group === "COMBOS" || item.group === "EXTRAS & DIPS" ? 0 : item.price * item.qty), 0);
}

function renderWalkinBenefits() {
  const benefitsPanel = $("walkinBenefits");
  if (editingWalkinOrderId) {
    benefitsPanel.hidden = true;
    $("walkinDiscountRow").hidden = true;
    return;
  }
  const customer = lastLookupResult?.found ? lastLookupResult : null;
  if (!customer) {
    benefitsPanel.hidden = true;
    $("walkinDiscountRow").hidden = true;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    $("walkinTotal").textContent = money(subtotal);
    return;
  }
  benefitsPanel.hidden = false;
  const balance = Math.max(0, Number(customer.points || 0));
  const eligibleSubtotal = getWalkinEligibleSubtotal();
  const selectedPoints = Number($("walkinRedeemPoints").value || 0);
  const selectedRewardId = $("walkinReward").value;
  const pointsPlaceholder = balance < 100
      ? `${balance} points · need ${100 - balance} more to redeem`
      : eligibleSubtotal < 10
        ? "Add regular menu items to use points"
        : "Don't use points";
  const pointOptions = [`<option value="0">${escapeHtml(pointsPlaceholder)}</option>`];
  const redeemablePoints = Math.floor(Math.min(balance, 1000, eligibleSubtotal * 10) / 100) * 100;
  for (let points = 100; points <= redeemablePoints; points += 100) {
    pointOptions.push(`<option value="${points}">${points.toLocaleString("en-IN")} points · save ${money(points / 100 * 10)}</option>`);
  }
  $("walkinRedeemPoints").innerHTML = pointOptions.join("");
  $("walkinRedeemPoints").value = String(Math.min(selectedPoints, redeemablePoints));
  $("walkinRedeemPoints").disabled = !redeemablePoints;

  const rewards = Array.isArray(customer.availableRewards) ? customer.availableRewards : [];
  const oldestReward = rewards.find(reward => !reward.expiresAt || new Date(reward.expiresAt).getTime() > Date.now());
  const rewardOptions = ['<option value="">Don\'t use a reward</option>'];
  for (const reward of rewards) {
    const webOnly = reward.kind === "free-delivery";
    const mustUseOlder = oldestReward && reward.ticketId !== oldestReward.ticketId;
    const shortfall = Math.max(0, Number(reward.minimum || 0) - eligibleSubtotal);
    const percentValue = Math.min(Math.floor(eligibleSubtotal * Number(reward.percent || 0) / 100), Number(reward.maxDiscount) > 0 ? Number(reward.maxDiscount) : eligibleSubtotal);
    const noEligibleDiscount = reward.kind === "percent-discount" && percentValue <= 0;
    const note = mustUseOlder ? " · use the older reward first" : webOnly ? " · use for website delivery" : shortfall ? ` · add ${money(shortfall)} regular menu items` : noEligibleDiscount ? " · add regular menu items to use" : "";
    rewardOptions.push(`<option value="${escapeHtml(reward.ticketId)}" ${mustUseOlder || webOnly || shortfall || noEligibleDiscount ? "disabled" : ""}>${escapeHtml(reward.title)}${note ? ` — ${escapeHtml(note.slice(3))}` : ""}</option>`);
  }
  $("walkinReward").innerHTML = rewardOptions.join("");
  if (selectedRewardId && rewards.some(reward => reward.ticketId === selectedRewardId && reward.ticketId === oldestReward?.ticketId && reward.kind !== "free-delivery" && Number(reward.minimum || 0) <= eligibleSubtotal && (reward.kind !== "percent-discount" || Math.min(Math.floor(eligibleSubtotal * Number(reward.percent || 0) / 100), Number(reward.maxDiscount) > 0 ? Number(reward.maxDiscount) : eligibleSubtotal) > 0))) {
    $("walkinReward").value = selectedRewardId;
  } else $("walkinReward").value = "";
  $("walkinReward").disabled = !oldestReward || oldestReward.kind === "free-delivery" || Number(oldestReward.minimum || 0) > eligibleSubtotal || (oldestReward.kind === "percent-discount" && Math.min(Math.floor(eligibleSubtotal * Number(oldestReward.percent || 0) / 100), Number(oldestReward.maxDiscount) > 0 ? Number(oldestReward.maxDiscount) : eligibleSubtotal) <= 0);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  let benefitDiscount = 0;
  let benefitLabel = "";
  let hint = "One benefit per order. Points reduce eligible regular menu items only; combos and extras stay full price. Rewards must be used in order; free-delivery rewards are for website delivery orders.";
  if (Number($("walkinRedeemPoints").value) > 0) {
    const points = Number($("walkinRedeemPoints").value);
    benefitDiscount = points / 100 * 10;
    benefitLabel = `Craving Points · ${points.toLocaleString("en-IN")} points`;
    hint = `Save ${money(benefitDiscount)} with Craving Points on this order.`;
  } else if ($("walkinReward").value) {
    const reward = rewards.find(item => item.ticketId === $("walkinReward").value);
    if (reward) {
      benefitLabel = reward.title;
      if (reward.kind === "discount") {
        benefitDiscount = Number(reward.amount || 0);
        hint = `${money(benefitDiscount)} off will be applied to this order.`;
      } else if (reward.kind === "percent-discount") {
        const cap = Number(reward.maxDiscount || 0);
        benefitDiscount = Math.min(Math.floor(getWalkinEligibleSubtotal() * Number(reward.percent || 0) / 100), cap > 0 ? cap : getWalkinEligibleSubtotal());
        hint = `${Number(reward.percent || 0)}% off eligible regular menu items · save ${money(benefitDiscount)}. Combos, extras and delivery are excluded.`;
      } else if (reward.kind === "free-item") {
        benefitDiscount = Number(reward.itemPrice || 0);
        hint = `${reward.item} will be added to the order for free.`;
      } else if (reward.kind === "bonus-points") hint = `${Number(reward.points || 0)} bonus Craving Points will be added after delivery.`;
      else if (reward.kind === "double-points") hint = "Double Craving Points will be calculated after delivery.";
    }
  }
  $("walkinDiscountRow").hidden = !benefitLabel;
  if (benefitLabel) {
    $("walkinDiscountLabel").textContent = benefitLabel;
    $("walkinDiscountAmount").textContent = benefitLabel.includes("points") ? `−${money(benefitDiscount)}` : (["free-item"].includes(rewards.find(item => item.ticketId === $("walkinReward").value)?.kind) ? "FREE" : `−${money(benefitDiscount)}`);
  }
  $("walkinBenefitHint").textContent = hint;
  $("walkinTotal").textContent = money(Math.max(0, subtotal - benefitDiscount));
}

$("walkinRedeemPoints").addEventListener("change", () => {
  if (Number($("walkinRedeemPoints").value) > 0) $("walkinReward").value = "";
  renderWalkinBenefits();
});
$("walkinReward").addEventListener("change", () => {
  if ($("walkinReward").value) $("walkinRedeemPoints").value = "0";
  renderWalkinBenefits();
});

function addCatalogItem(index) {
  const item = catalogItems[index];
  if (!item) return;
  const existing = cart.find(line => line.name === item.name);
  if (existing) existing.qty += 1;
  else cart.push({ ...item, qty: 1 });
  renderWalkinCart();
}

function renderWalkinCart() {
  const cartNode = $("walkinCart");
  if (!cart.length) cartNode.innerHTML = '<div class="cart-empty">Choose a dish to start this order.</div>';
  else cartNode.innerHTML = cart.map((item, index) => `<div class="walkin-line"><div class="walkin-line-main"><div class="walkin-item-copy"><strong>${escapeHtml(item.name)}</strong><small>${money(item.price)} each</small></div><div class="line-controls" aria-label="Quantity for ${escapeHtml(item.name)}"><button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button><output aria-live="polite">${Number(item.qty) || 0}</output><button type="button" data-cart-action="increase" data-index="${index}" aria-label="Increase ${escapeHtml(item.name)} quantity">+</button></div></div><div class="walkin-line-footer"><strong class="line-total">${money(item.price * item.qty)}</strong><button type="button" class="remove-line" data-remove="${index}">Remove item</button></div></div>`).join("");
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  $("cartItemCount").textContent = `${cart.reduce((sum, item) => sum + item.qty, 0)} items`;
  $("walkinTotal").textContent = money(total);
  $("saveWalkinButton").disabled = !cart.length;
  renderWalkinBenefits();
}
$("walkinCart").addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  const quantityButton = target?.closest("[data-cart-action]");
  const removeButton = target?.closest("[data-remove]");
  if (quantityButton) {
    const index = Number(quantityButton.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
    const change = quantityButton.dataset.cartAction === "increase" ? 1 : -1;
    cart[index].qty = Math.max(0, (Number(cart[index].qty) || 0) + change);
    if (cart[index].qty === 0) cart.splice(index, 1);
    renderWalkinCart();
  } else if (removeButton) {
    const index = Number(removeButton.dataset.remove);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    renderWalkinCart();
  }
});

function beginWalkinItemAddition(order) {
  editingWalkinOrderId = order.id;
  pendingWalkinRequestId = crypto.randomUUID();
  cart = [];
  $("walkinEditorTitle").textContent = `Add items to ${readableOrderNumber(order)}`;
  $("walkinEditHint").hidden = false;
  $("cancelEditOrderButton").hidden = false;
  $("walkinCustomerFields").hidden = true;
  $("walkinPaymentFields").hidden = true;
  $("walkinStaffGuide").hidden = true;
  $("walkinBenefits").hidden = true;
  $("walkinTotalLabel").textContent = "Items to add";
  $("saveWalkinButton").textContent = "Add items to this order";
  $("orderMessage").textContent = "";
  document.querySelectorAll("[data-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === "new"));
  activeTab = "new";
  ordersPanel.hidden = true;
  newOrderPanel.hidden = false;
  renderWalkinCart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelWalkinItemAddition(returnToOrders = true) {
  editingWalkinOrderId = null;
  pendingWalkinRequestId = null;
  cart = [];
  $("walkinEditorTitle").textContent = "New walk-in order";
  $("walkinEditHint").hidden = true;
  $("cancelEditOrderButton").hidden = true;
  $("walkinCustomerFields").hidden = false;
  $("walkinPaymentFields").hidden = false;
  $("walkinStaffGuide").hidden = false;
  $("walkinTotalLabel").textContent = "Order total";
  $("saveWalkinButton").textContent = "Create walk-in order";
  $("orderMessage").textContent = "";
  $("walkinName").value = "Walk-in customer";
  mobileField.value = "";
  lastLookupResult = null;
  lastLookedUpMobile = "";
  autoFilledCustomerName = "";
  renderWalkinCart();
  if (returnToOrders) {
    activeTab = "walkin";
    document.querySelectorAll("[data-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === "walkin"));
    ordersPanel.hidden = false;
    newOrderPanel.hidden = true;
  }
}

$("cancelEditOrderButton").addEventListener("click", () => cancelWalkinItemAddition());

$("saveWalkinButton").addEventListener("click", async () => {
  const button = $("saveWalkinButton");
  orderMessage.textContent = "";
  button.disabled = true;
  const editOrderId = editingWalkinOrderId;
  button.textContent = editOrderId ? "Adding items…" : "Creating order…";
  pendingWalkinRequestId ||= crypto.randomUUID();
  try {
    if (editOrderId) {
      const targetOrder = orders.find(order => order.id === editOrderId);
      if (!targetOrder) throw new Error("This walk-in order is no longer in the recent list. Refresh and try again.");
      const result = await httpsCallable(functions, "staffAddItemsToWalkInOrder")({
        orderId: editOrderId,
        requestId: pendingWalkinRequestId,
        items: cart.map(item => ({ name: item.name, qty: item.qty }))
      });
      Object.assign(targetOrder, result.data);
      pendingWalkinRequestId = null;
      orderMessage.textContent = `${readableOrderNumber(targetOrder)} updated · new total ${money(targetOrder.total)}${targetOrder.balanceDue ? ` · due ${money(targetOrder.balanceDue)}` : ""}.`;
      $("orderStatusMessage").textContent = `${readableOrderNumber(targetOrder)} updated. The order total and points were recalculated; use Print invoice when needed.`;
      cancelWalkinItemAddition();
      renderOrders();
      return;
    }
    await lookupWalkinCustomer();
    const walkinOrder = {
      customerName: $("walkinName").value.trim() || "Walk-in customer",
      mobile: $("walkinMobile").value.replace(/[\s()-]/g, "").trim(),
      paymentMethod: $("paymentMethod").value,
      paymentStatus: $("paymentStatus").value,
      redeemPoints: Number($("walkinRedeemPoints").value || 0),
      loyaltyRewardId: $("walkinReward").value,
      requestId: pendingWalkinRequestId,
      items: cart.map(item => ({ name: item.name, qty: item.qty }))
    };
    const result = await httpsCallable(functions, "createWalkInOrder")(walkinOrder);
    const created = { id: result.data.orderId, orderNumber: result.data.orderNumber || "", ...walkinOrder, items: result.data.items || cart.map(item => ({ ...item, lineTotal: item.price * item.qty })), subtotal: Number(result.data.subtotal ?? result.data.total), discountAmount: Number(result.data.discountAmount || 0), pointsDiscount: Number(result.data.pointsDiscount || 0), pointsRedeemed: Number(result.data.pointsRedeemed || 0), deliveryCharge: 0, total: result.data.total, amountPaid: Number(result.data.amountPaid || 0), balanceDue: Number(result.data.balanceDue || 0), paymentStatus: result.data.paymentStatus || walkinOrder.paymentStatus, source: "walk-in", orderType: "walk-in", status: "new", loyaltyLinked: Boolean(result.data.loyaltyLinked), pointsToAward: Number(result.data.pointsToAward || 0), benefitTitle: result.data.benefitTitle || "", createdAt: new Date().toISOString() };
    orders.unshift(created);
    pendingWalkinRequestId = null;
    cart = [];
    renderWalkinCart();
    $("walkinName").value = "Walk-in customer";
    $("walkinMobile").value = "";
    autoFilledCustomerName = "";
    priorCustomerMobile = "";
    lastLookedUpMobile = "";
    lastLookupResult = null;
    renderWalkinBenefits();
    orderMessage.textContent = `${readableOrderNumber(created)} created.`;
    activeTab = "walkin";
    $("orderStatusMessage").textContent = created.loyaltyLinked
      ? `${created.benefitTitle ? `${created.benefitTitle} applied. ` : ""}Customer account matched. ${created.pointsToAward} Craving Points and reward progress will be credited when this walk-in order is completed.`
      : (created.mobile ? "Order created. No verified customer account matched this number, so points and rewards are not linked." : "Order created without a customer phone number; points and rewards are not linked.");
    document.querySelectorAll("[data-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === "walkin"));
    ordersPanel.hidden = false;
    newOrderPanel.hidden = true;
    renderOrders();
  } catch (error) {
    orderMessage.textContent = error.code === "functions/permission-denied" ? "Staff access is required. Refresh the page and sign in again." : error.message?.replace(/^FirebaseError:\s*/i, "") || "Could not create order. Please check the items and try again.";
    button.disabled = false;
  } finally {
    button.textContent = editingWalkinOrderId ? "Add items to this order" : "Create walk-in order";
    button.disabled = !cart.length;
  }
});

window.addEventListener("afterprint", () => { $("invoice").replaceChildren(); });
