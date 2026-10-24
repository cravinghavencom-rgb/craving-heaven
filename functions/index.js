const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp, FieldPath } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { MENU_DATA, COMBO_MENU_DATA } = require("./menu-catalog");
const REWARDS = require("./rewards-config");

initializeApp();
const activeProjectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
if (activeProjectId === "demo-craving-heaven-local" && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9400";
}
const db = getFirestore();
const REGION = "asia-south1";
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_EMULATOR !== "true";
const DELIVERY_CHARGE = 30;
const FREE_DELIVERY_THRESHOLD = 300;
const DEFAULT_STORE_OPEN_TIME = "16:30";
const DEFAULT_STORE_CLOSE_TIME = "23:45";
const DELIVERY_AREAS = new Set([
  "Pathanwadi", "Kurar Village", "Koknipada", "Triveni Nagar", "Sanjay Nagar",
  "MHB Colony", "Dindoshi", "Laxman Nagar", "Rani Sati Marg", "Gokuldham", "Tapovan"
]);
const ORDERING_STATUS_REF = () => db.collection("restaurantSettings").doc("onlineOrdering");

function mumbaiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function orderNumberPrefix(source, orderType) {
  if (source === "walk-in") return "WK";
  return orderType === "pickup" ? "PK" : "DL";
}

function orderNumberDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "2-digit"
  }).format(now).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

async function reserveOrderNumber(transaction, source, orderType) {
  const prefix = orderNumberPrefix(source, orderType);
  const now = new Date();
  const date = orderNumberDate(now);
  const counterRef = db.collection("orderCounters").doc(`${prefix}_${mumbaiDateKey(now)}`);
  const snapshot = await transaction.get(counterRef);
  const sequence = Math.max(0, Number(snapshot.data()?.sequence || 0)) + 1;
  transaction.set(counterRef, { sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return `${prefix}-${date}-${String(sequence).padStart(3, "0")}`;
}

function getStoreHours(settings = {}) {
  const openingTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.openingTime || "")
    ? settings.openingTime : DEFAULT_STORE_OPEN_TIME;
  const closingTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.closingTime || "")
    ? settings.closingTime : DEFAULT_STORE_CLOSE_TIME;
  return { openingTime, closingTime };
}

function timeToMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isStoreOpenNow(now = new Date(), settings = {}) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value || 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value || 0);
  const currentMinutes = hour * 60 + minute;
  const { openingTime, closingTime } = getStoreHours(settings);
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);
  if (openingMinutes === closingMinutes) return false;
  return openingMinutes < closingMinutes
    ? currentMinutes >= openingMinutes && currentMinutes < closingMinutes
    : currentMinutes >= openingMinutes || currentMinutes < closingMinutes;
}

function isStaffSessionEnabled(settings = {}, now = new Date()) {
  if (settings.enabled !== true) return false;
  const today = mumbaiDateKey(now);
  if (settings.enabledForDate === today) return true;
  const { openingTime, closingTime } = getStoreHours(settings);
  if (timeToMinutes(openingTime) < timeToMinutes(closingTime)) return false;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(now));
  const minute = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", minute: "2-digit" }).format(now));
  return hour * 60 + minute < timeToMinutes(closingTime)
    && settings.enabledForDate === mumbaiDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

function buildOrderingStatus(settings = {}, now = new Date()) {
  const today = mumbaiDateKey(now);
  const adminMode = settings.adminModeForDate === today ? settings.adminMode : "";
  const paused = settings.paused === true;
  const staffEnabled = isStaffSessionEnabled(settings, now);
  const isOpen = isStoreOpenNow(now, settings);
  const manualOnline = adminMode === "online";
  const manualClosed = adminMode === "closed";
  const manualPaused = adminMode === "paused";
  const acceptingOnlineOrders = manualOnline || (!manualClosed && !manualPaused && isOpen && staffEnabled && !paused);
  const hours = getStoreHours(settings);
  return {
    isOpen,
    paused: manualPaused || (!manualClosed && paused),
    staffEnabled,
    acceptingOnlineOrders,
    adminMode,
    hours,
    message: manualOnline
      ? "Online ordering is open."
      : manualPaused || paused
        ? "High order volume: we’re temporarily not taking online orders. Please try again shortly."
        : manualClosed
          ? "We’re closed for now, but we’ll be back soon with your favourites. Please check back a little later."
          : !staffEnabled
      ? "Online ordering is off until staff starts taking orders. Please check back soon."
      : !isOpen
        ? "Online ordering is closed right now. Please check back later."
        : "Online ordering is open."
  };
}

async function readOrderingStatus() {
  const snapshot = await ORDERING_STATUS_REF().get();
  return buildOrderingStatus(snapshot.exists ? snapshot.data() : {});
}

exports.getOrderingStatus = onCall({ region: REGION }, async () => readOrderingStatus());

exports.staffSetOnlineOrderingEnabled = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  if (typeof request.data?.enabled !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose whether online ordering should be on or off.");
  }
  await ORDERING_STATUS_REF().set({
    enabled: request.data.enabled,
    enabledForDate: request.data.enabled ? mumbaiDateKey() : null,
    paused: false,
    adminMode: null,
    adminModeForDate: null,
    updatedBy: staffUid,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return readOrderingStatus();
});

exports.staffSetOnlineOrderingPaused = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  if (typeof request.data?.paused !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose whether online orders should be paused.");
  }
  await ORDERING_STATUS_REF().set({
    paused: request.data.paused,
    adminMode: null,
    adminModeForDate: null,
    updatedBy: staffUid,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return readOrderingStatus();
});

async function requireStaff(request) {
  if (!request.auth?.uid || (request.auth.token.staff !== true && request.auth.token.admin !== true)) {
    throw new HttpsError("permission-denied", "Staff access is required.");
  }
  // Check the current Auth record as well as the ID token. This makes staff
  // removal effective immediately instead of waiting for the token to expire.
  let currentUser;
  try {
    currentUser = await getAuth().getUser(request.auth.uid);
  } catch (error) {
    console.error("Could not verify current staff access", error);
    throw new HttpsError("permission-denied", "Staff access could not be verified.");
  }
  if (currentUser.disabled || (currentUser.customClaims?.staff !== true && currentUser.customClaims?.admin !== true)) {
    throw new HttpsError("permission-denied", "Staff access is required.");
  }
  return request.auth.uid;
}

async function requireAdmin(request) {
  if (!request.auth?.uid || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
  try {
    const currentUser = await getAuth().getUser(request.auth.uid);
    if (currentUser.disabled || currentUser.customClaims?.admin !== true) {
      throw new HttpsError("permission-denied", "Administrator access is required.");
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Could not verify current administrator access", error);
    throw new HttpsError("permission-denied", "Administrator access could not be verified.");
  }
  return request.auth.uid;
}

async function requireActiveCustomer(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in with your mobile number to continue.");
  let user;
  try {
    user = await getAuth().getUser(uid);
  } catch (error) {
    console.error("Could not verify current customer account", error);
    throw new HttpsError("permission-denied", "Customer account could not be verified.");
  }
  const block = await db.collection("customerBlocks").doc(uid).get();
  if (user.disabled || block.exists) {
    throw new HttpsError("permission-denied", "This customer account is blocked. Please contact CRAVING HEAVEN.");
  }
  if (!request.auth.token.phone_number && !user.phoneNumber) {
    throw new HttpsError("unauthenticated", "Sign in with your mobile number to continue.");
  }
  return uid;
}

exports.adminUpdateRestaurantSettings = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const data = request.data || {};
  const patch = {};
  const allowedActions = new Set(["online", "pause", "closed"]);

  if (data.action !== undefined) {
    if (!allowedActions.has(data.action)) {
      throw new HttpsError("invalid-argument", "Choose online, pause, or closed.");
    }
    const today = mumbaiDateKey();
    patch.adminMode = data.action;
    patch.adminModeForDate = today;
    if (data.action === "online") {
      patch.enabled = true;
      patch.enabledForDate = today;
      patch.paused = false;
    } else if (data.action === "pause") {
      patch.enabled = true;
      patch.enabledForDate = today;
      patch.paused = true;
    } else {
      patch.enabled = false;
      patch.enabledForDate = null;
      patch.paused = false;
    }
  }

  const hasHours = data.openingTime !== undefined || data.closingTime !== undefined;
  if (hasHours) {
    const snapshot = await ORDERING_STATUS_REF().get();
    const current = snapshot.exists ? snapshot.data() : {};
    const openingTime = data.openingTime ?? getStoreHours(current).openingTime;
    const closingTime = data.closingTime ?? getStoreHours(current).closingTime;
    const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validTime(openingTime) || !validTime(closingTime) || openingTime === closingTime) {
      throw new HttpsError("invalid-argument", "Enter valid store hours. Opening and closing times must be different.");
    }
    patch.openingTime = openingTime;
    patch.closingTime = closingTime;
  }

  if (!Object.keys(patch).length) {
    throw new HttpsError("invalid-argument", "Choose a store status or update the store hours.");
  }
  patch.updatedBy = adminUid;
  patch.updatedAt = FieldValue.serverTimestamp();
  await ORDERING_STATUS_REF().set(patch, { merge: true });
  return readOrderingStatus();
});

const MENU_CONFIG_REF = () => db.collection("restaurantSettings").doc("menuCatalog");
const REWARDS_CONFIG_REF = () => db.collection("restaurantSettings").doc("rewardsConfig");
const CRAVING_DASH_CONFIG_REF = () => db.collection("restaurantSettings").doc("cravingDash");

function removeDiscontinuedMenuItems(menu) {
  const clean = {};
  for (const [id, section] of Object.entries(menu || {})) {
    clean[id] = {
      ...section,
      items: (Array.isArray(section?.items) ? section.items : []).filter(item => {
        if (String(item?.name || "").trim().toLowerCase() === "cheese slice") return false;
        return !Array.isArray(item?.options) || item.options.every(option => String(option?.name || "").trim().toLowerCase() !== "cheese slice");
      }).map(item => Array.isArray(item.options)
        ? { ...item, options: item.options.filter(option => String(option?.name || "").trim().toLowerCase() !== "cheese slice") }
        : item)
    };
  }
  return clean;
}

async function readBusinessConfig() {
  const [menuSnapshot, rewardsSnapshot, gameSnapshot] = await Promise.all([MENU_CONFIG_REF().get(), REWARDS_CONFIG_REF().get(), CRAVING_DASH_CONFIG_REF().get()]);
  const menu = menuSnapshot.exists && menuSnapshot.data()?.menu && typeof menuSnapshot.data().menu === "object"
    ? menuSnapshot.data().menu : MENU_DATA;
  const combos = menuSnapshot.exists && Array.isArray(menuSnapshot.data()?.combos)
    ? menuSnapshot.data().combos : COMBO_MENU_DATA;
  const savedRewards = rewardsSnapshot.exists && Array.isArray(rewardsSnapshot.data()?.journey)
    ? rewardsSnapshot.data().journey : REWARDS.journey;
  const rewards = { ...REWARDS, journey: savedRewards };
  rewards.rewardById = Object.fromEntries(savedRewards.filter(item => item?.id).map(item => [item.id, item]));
  const cravingDash = gameSnapshot.exists && gameSnapshot.data()?.cravingDash && typeof gameSnapshot.data().cravingDash === "object"
    ? gameSnapshot.data().cravingDash : { enabled: false, campaignId: "", stages: [] };
  return { menu: removeDiscontinuedMenuItems(menu), combos, rewards, cravingDash };
}

function buildPriceByName(menuData, combos) {
  const prices = new Map();
  for (const section of Object.values(menuData || {})) {
    for (const item of Array.isArray(section?.items) ? section.items : []) {
      if (Array.isArray(item.options)) {
        for (const option of item.options) prices.set(option.name, Number(option.price));
      } else prices.set(item.name, Number(item.price));
    }
  }
  for (const combo of Array.isArray(combos) ? combos : []) prices.set(combo.name, Number(combo.price));
  return prices;
}

function publicBusinessConfig(config) {
  const { rewardById, ...rewards } = config.rewards;
  const cravingDash = {
    enabled: config.cravingDash?.enabled === true,
    campaignId: String(config.cravingDash?.campaignId || ""),
    stages: (Array.isArray(config.cravingDash?.stages) ? config.cravingDash.stages : []).filter(stage => stage.enabled !== false).map(stage => ({
      id: String(stage.id), order: Number(stage.order), title: String(stage.title), instructions: String(stage.instructions), targetScore: Number(stage.targetScore),
      reward: stage.reward?.kind === "points"
        ? { kind: "points", points: Number(stage.reward.points) }
        : stage.reward?.kind === "percent-discount"
          ? { kind: "percent-discount", percent: Number(stage.reward.percent), minimum: Number(stage.reward.minimum || 0), maxDiscount: Number(stage.reward.maxDiscount || 0), expiryHours: 48 }
          : { kind: "free-item", item: String(stage.reward?.item || ""), minimum: Number(stage.reward?.minimum || 0), expiryHours: 48 }
    }))
  };
  return { menu: config.menu, combos: config.combos, rewards, cravingDash };
}

function safeFirestoreData(value) {
  if (value instanceof Date) return value.toISOString();
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(safeFirestoreData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, safeFirestoreData(child)]));
  return value;
}

function validateMenuCatalog(menu) {
  if (!menu || typeof menu !== "object" || Array.isArray(menu)) throw new HttpsError("invalid-argument", "Provide menu categories and items.");
  const entries = Object.entries(menu);
  if (!entries.length || entries.length > 30) throw new HttpsError("invalid-argument", "Menu needs between 1 and 30 categories.");
  const clean = {};
  const names = new Set();
  for (const [id, section] of entries) {
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id) || !section || typeof section.title !== "string" || !Array.isArray(section.items) || section.items.length > 100) {
      throw new HttpsError("invalid-argument", "A menu category or its item list is invalid.");
    }
    clean[id] = {
      title: section.title.trim().slice(0, 60),
      subtitle: String(section.subtitle || "").trim().slice(0, 120),
      items: section.items.map(item => {
        const name = String(item?.name || "").trim();
        if (name.length < 2 || name.length > 100) throw new HttpsError("invalid-argument", "Menu item names must be between 2 and 100 characters.");
        const options = Array.isArray(item.options) ? item.options : null;
        const rows = options ? options.map(option => ({ name: String(option.name || "").trim(), label: String(option.label || "").trim().slice(0, 40), price: Number(option.price) })) : [{ name, price: Number(item.price) }];
        if (!rows.length || rows.length > 10) throw new HttpsError("invalid-argument", `Add valid sizes for ${name}.`);
        for (const row of rows) {
          if (row.name.length < 2 || !Number.isSafeInteger(row.price) || row.price < 1 || row.price > 20000 || names.has(row.name.toLowerCase())) {
            throw new HttpsError("invalid-argument", `The name or price for ${row.name || name} is invalid or duplicated.`);
          }
          names.add(row.name.toLowerCase());
        }
        const image = String(item.image || "").trim();
        if (image && (!image.startsWith("images/") || image.includes("..") || !/^images\/[\w./-]+\.(png|jpe?g|webp)$/i.test(image))) {
          throw new HttpsError("invalid-argument", `Use a website image path under images/ for ${name}, or leave it blank.`);
        }
        const output = { name, image, description: String(item.description || `${name}.`).trim().slice(0, 180) };
        if (options) output.options = rows.map((row, index) => ({ name: row.name, label: options[index].label || row.name, price: row.price }));
        else output.price = rows[0].price;
        return output;
      })
    };
  }
  return clean;
}

function validateRewardJourney(journey, menu) {
  if (!Array.isArray(journey) || journey.length < 1 || journey.length > 30) throw new HttpsError("invalid-argument", "Reward journey must contain 1 to 30 order milestones.");
  const prices = buildPriceByName(menu, COMBO_MENU_DATA);
  const ids = new Set();
  const orders = new Set();
  const validKinds = new Set(["welcome", "progress", "free-delivery", "free-item", "discount", "bonus-points", "double-points"]);
  return journey.map(entry => {
    const order = Number(entry?.order);
    const kind = String(entry?.kind || "");
    const id = entry?.id ? String(entry.id).trim() : "";
    const title = String(entry?.title || "").trim();
    const detail = String(entry?.detail || "").trim();
    const requiresId = !["progress", "welcome"].includes(kind);
    if (!Number.isSafeInteger(order) || order < 1 || order > 30 || orders.has(order) || !validKinds.has(kind) || title.length < 2 || title.length > 100 || detail.length > 180 || (requiresId && !id) || (id && (!/^[a-zA-Z0-9_-]{2,64}$/.test(id) || ids.has(id)))) {
      throw new HttpsError("invalid-argument", "A reward title, type, ID, or order number is invalid or duplicated.");
    }
    orders.add(order);
    if (id) ids.add(id);
    const reward = { order, kind, title, detail };
    if (id) reward.id = id;
    if (["free-delivery", "free-item", "discount"].includes(kind)) {
      reward.minimum = Number(entry.minimum || 0);
      if (!Number.isSafeInteger(reward.minimum) || reward.minimum < 0 || reward.minimum > 10000) throw new HttpsError("invalid-argument", `The minimum spend for ${title} is invalid.`);
    }
    if (kind === "free-item") {
      reward.item = String(entry.item || "").trim();
      reward.itemPrice = prices.get(reward.item);
      if (!reward.item || !Number.isSafeInteger(reward.itemPrice) || (menu.extras?.items || []).some(item => item.name === reward.item) || COMBO_MENU_DATA.some(combo => combo.name === reward.item)) throw new HttpsError("invalid-argument", `Choose a regular menu item for ${title}.`);
    }
    if (kind === "discount") {
      reward.amount = Number(entry.amount || 0);
      if (!Number.isSafeInteger(reward.amount) || reward.amount < 1 || reward.amount > 1000) throw new HttpsError("invalid-argument", `The discount for ${title} is invalid.`);
    }
    if (kind === "bonus-points") {
      reward.points = Number(entry.points || 0);
      if (!Number.isSafeInteger(reward.points) || reward.points < 1 || reward.points > 10000) throw new HttpsError("invalid-argument", `The point reward for ${title} is invalid.`);
    }
    if (kind === "double-points") {
      reward.maxBonusPoints = Number(entry.maxBonusPoints || 0);
      if (!Number.isSafeInteger(reward.maxBonusPoints) || reward.maxBonusPoints < 1 || reward.maxBonusPoints > 10000) throw new HttpsError("invalid-argument", `The point bonus limit for ${title} is invalid.`);
    }
    return reward;
  }).sort((left, right) => left.order - right.order);
}

function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return "";
}

const FREE_OFFERS = Object.freeze({});

function mumbaiWeekday() {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date());
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function validateAndPriceItems(items, menuData = MENU_DATA, comboData = COMBO_MENU_DATA) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw new HttpsError("invalid-argument", "Your cart is empty or has too many different items.");
  }
  let quantityTotal = 0;
  let subtotal = 0;
  let eligibleSubtotal = 0;
  let regularPointSubtotal = 0;
  let comboPointSubtotal = 0;
  let burgerCount = 0;
  let freeOffer = null;
  const pricedItems = [];
  const priceByName = buildPriceByName(menuData, comboData);
  const extraNames = new Set((menuData.extras?.items || []).map(item => item.name));
  const comboNames = new Set(comboData.map(combo => combo.name));

  for (const line of items) {
    const name = typeof line?.name === "string" ? line.name.trim() : "";
    const qty = Number(line?.qty);
    if (!name || !Number.isSafeInteger(qty) || qty < 1 || qty > 50) {
      throw new HttpsError("invalid-argument", "One or more cart items are invalid.");
    }
    quantityTotal += qty;
    if (quantityTotal > 100) throw new HttpsError("invalid-argument", "Your order contains too many items.");

    if (line.isFreeOffer) {
      if (freeOffer || qty !== 1 || !FREE_OFFERS[line.freeOfferId]) {
        throw new HttpsError("failed-precondition", "Only one valid free offer may be used per order.");
      }
      freeOffer = { id: line.freeOfferId, ...FREE_OFFERS[line.freeOfferId] };
      if (name.toUpperCase() !== freeOffer.name) {
        throw new HttpsError("failed-precondition", "The selected free offer does not match the cart.");
      }
      pricedItems.push({ name: freeOffer.name, price: 0, qty: 1, isFreeOffer: true });
      continue;
    }

    const price = priceByName.get(name);
    if (!Number.isSafeInteger(price) || price <= 0) {
      throw new HttpsError("invalid-argument", `The menu item “${name}” is not available.`);
    }
    const isCombo = comboNames.has(name);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    if (!isCombo && !extraNames.has(name)) eligibleSubtotal += lineTotal;
    if (isCombo) comboPointSubtotal += lineTotal;
    else if (!extraNames.has(name)) regularPointSubtotal += lineTotal;
    if (!isCombo && name.toLowerCase() === "classic crunchy burger") burgerCount += qty;
    pricedItems.push({ name, price, qty, isCombo, isFreeOffer: false, lineTotal });
  }

  if (freeOffer) {
    const weekday = mumbaiWeekday();
    if (!freeOffer.days.includes(weekday)) throw new HttpsError("failed-precondition", "This free offer is not available today.");
    if (freeOffer.kind === "subtotal" && eligibleSubtotal < freeOffer.threshold) {
      throw new HttpsError("failed-precondition", "Add more regular menu items to qualify for this free offer. Combos do not count toward spend offers.");
    }
    if (freeOffer.kind === "burger-count" && burgerCount < freeOffer.requiredQty) {
      throw new HttpsError("failed-precondition", "Add 3 Classic Crunchy Burgers to qualify for this offer.");
    }
  }

  return { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal, freeOffer };
}

exports.getPublicBusinessConfig = onCall({ region: REGION }, async () => publicBusinessConfig(await readBusinessConfig()));

exports.adminGetBusinessConfig = onCall({ region: REGION }, async request => {
  await requireAdmin(request);
  const config = await readBusinessConfig();
  return { ...publicBusinessConfig(config), cravingDash: config.cravingDash };
});

exports.adminSaveMenuCatalog = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const menu = removeDiscontinuedMenuItems(validateMenuCatalog(request.data?.menu));
  await MENU_CONFIG_REF().set({ menu, updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { saved: true, categories: Object.keys(menu).length, items: Object.values(menu).reduce((sum, section) => sum + section.items.length, 0) };
});

exports.adminSaveRewardsConfig = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const businessConfig = await readBusinessConfig();
  const journey = validateRewardJourney(request.data?.journey, businessConfig.menu);
  const keepIds = new Set(journey.filter(item => item.id).map(item => item.id));
  const accounts = await db.collection("loyaltyAccounts").get();
  for (const accountDoc of accounts.docs) {
    const activeTickets = (accountDoc.data().availableRewards || []).filter(ticket => !ticket.expiresAt || timestampMillis(ticket.expiresAt) > Date.now());
    if (activeTickets.some(ticket => !keepIds.has(ticket.id))) {
      throw new HttpsError("failed-precondition", "This reward lineup still has active customer rewards. Keep those reward IDs until the issued rewards expire or are used.");
    }
  }
  await REWARDS_CONFIG_REF().set({ journey, updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { saved: true, milestones: journey.length };
});

function gameRewardItemNames(menu, combos = []) {
  const names = [];
  for (const [key, section] of Object.entries(menu || {})) {
    if (/extra|dip/i.test(key) || /extra|dip/i.test(String(section?.title || ""))) continue;
    for (const item of section?.items || []) {
      if (item.options?.length) names.push(...item.options.map(option => String(option.name)));
      else if (item.name) names.push(String(item.name));
    }
  }
  for (const combo of combos || []) if (combo?.name) names.push(String(combo.name));
  return [...new Set(names)];
}

function validateCravingDashConfig(raw, menu, combos = []) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.stages) || raw.stages.length > 30) {
    throw new HttpsError("invalid-argument", "Add between zero and 30 game stages.");
  }
  const foods = [];
  for (const key of ["burgers", "french-fries", "wraps", "strips"]) {
    for (const item of menu[key]?.items || []) {
      if (item.options?.length) foods.push(...item.options.map(option => String(option.name)));
      else foods.push(String(item.name));
    }
  }
  const rewardItems = gameRewardItemNames(menu, combos);
  const menuPrices = buildPriceByName(menu, combos);
  const ids = new Set();
  const stages = raw.stages.map((stage, index) => {
    const id = String(stage?.id || "").trim();
    const title = String(stage?.title || "").trim();
    const instructions = String(stage?.instructions || "").trim();
    const targetScore = Number(stage?.targetScore);
    if (!/^[a-z0-9][a-z0-9_-]{1,39}$/i.test(id) || ids.has(id) || title.length < 2 || title.length > 60 || instructions.length < 5 || instructions.length > 240 || !Number.isSafeInteger(targetScore) || targetScore < 1 || targetScore > 12) {
      throw new HttpsError("invalid-argument", `Stage ${index + 1} has invalid details. Target score must be 1–12.`);
    }
    ids.add(id);
    const reward = stage.reward || {};
    let cleanReward;
    if (reward.kind === "points") {
      const points = Number(reward.points);
      if (!Number.isSafeInteger(points) || points < 1 || points > 10000) throw new HttpsError("invalid-argument", `Stage ${index + 1} must award between 1 and 10,000 Craving Points.`);
      cleanReward = { kind: "points", points };
    } else if (reward.kind === "free-item") {
      const item = String(reward.item || "").trim();
      const minimum = Number(reward.minimum || 0);
      if (!rewardItems.includes(item) || menuPrices.get(item) <= 0 || !Number.isSafeInteger(minimum) || minimum < 0 || minimum > 5000) {
        throw new HttpsError("invalid-argument", `Stage ${index + 1} must select an available menu item or combo and a minimum spend from ₹0 to ₹5,000.`);
      }
      cleanReward = { kind: "free-item", item, minimum };
    } else if (reward.kind === "percent-discount") {
      const percent = Number(reward.percent), minimum = Number(reward.minimum || 0), maxDiscount = Number(reward.maxDiscount || 0);
      if (!Number.isSafeInteger(percent) || percent < 1 || percent > 100 || !Number.isSafeInteger(minimum) || minimum < 0 || minimum > 5000 || !Number.isSafeInteger(maxDiscount) || maxDiscount < 0 || maxDiscount > 10000) {
        throw new HttpsError("invalid-argument", `Stage ${index + 1} must have a 1–100% discount, minimum from ₹0 to ₹5,000, and maximum discount from ₹0 to ₹10,000.`);
      }
      cleanReward = { kind: "percent-discount", percent, minimum, maxDiscount };
    } else throw new HttpsError("invalid-argument", `Choose Craving Points, a free menu item, or a bill discount for stage ${index + 1}.`);
    return { id, order: index + 1, title, instructions, targetScore, enabled: stage.enabled !== false, reward: cleanReward };
  });
  return {
    enabled: raw.enabled === true && stages.some(stage => stage.enabled),
    campaignId: String(raw.campaignId || "").trim().slice(0, 60) || "campaign-v1",
    stages
  };
}

exports.adminSaveCravingDashConfig = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const adminUid = await requireAdmin(request);
  const config = await readBusinessConfig();
  const cravingDash = validateCravingDashConfig(request.data?.cravingDash, config.menu, config.combos);
  const ref = CRAVING_DASH_CONFIG_REF();
  const prior = await ref.get();
  const auditRef = db.collection("adminAuditLogs").doc();
  await db.runTransaction(async transaction => {
    transaction.set(ref, { cravingDash, updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.create(auditRef, {
      type: "craving-dash-config", adminUid,
      before: { enabled: prior.data()?.cravingDash?.enabled === true, stages: Array.isArray(prior.data()?.cravingDash?.stages) ? prior.data().cravingDash.stages.length : 0 },
      after: { enabled: cravingDash.enabled, stages: cravingDash.stages.length, campaignId: cravingDash.campaignId },
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return { saved: true, enabled: cravingDash.enabled, stages: cravingDash.stages.length };
});

function gameStageFoods(menu) {
  const foods = [];
  for (const key of ["burgers", "french-fries", "wraps", "strips"]) {
    for (const item of menu[key]?.items || []) {
      if (item.options?.length) foods.push(...item.options.map(option => String(option.name)));
      else foods.push(String(item.name));
    }
  }
  return foods;
}

function publicGameReward(reward) {
  return reward.kind === "points"
    ? { kind: "points", points: Number(reward.points) }
    : reward.kind === "percent-discount"
      ? { kind: "percent-discount", percent: Number(reward.percent), minimum: Number(reward.minimum || 0), maxDiscount: Number(reward.maxDiscount || 0), expiryHours: 48 }
      : { kind: "free-item", item: String(reward.item || ""), minimum: Number(reward.minimum || 0), expiryHours: 48 };
}

exports.getCravingDashState = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const uid = await requireActiveCustomer(request);
  const config = await readBusinessConfig();
  const game = config.cravingDash || { enabled: false, stages: [] };
  const progressRef = db.collection("cravingDashAccounts").doc(uid);
  const [progressSnapshot, loyaltySnapshot] = await Promise.all([
    progressRef.get(), db.collection("loyaltyAccounts").doc(uid).get()
  ]);
  const progress = progressSnapshot.exists ? progressSnapshot.data() : {};
  const completed = progress.campaignId === String(game.campaignId || "campaign-v1") && Array.isArray(progress.completedStageIds) ? progress.completedStageIds : [];
  const stages = (Array.isArray(game.stages) ? game.stages : []).filter(stage => stage.enabled !== false).sort((a, b) => a.order - b.order);
  const next = stages.findIndex(stage => !completed.includes(stage.id));
  const current = next >= 0 ? stages[next] : null;
  const loyalty = loyaltySnapshot.exists ? loyaltySnapshot.data() : {};
  const activeRewards = (Array.isArray(loyalty.availableRewards) ? loyalty.availableRewards : [])
    .filter(reward => reward.source === "craving-dash" && (!reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now()))
    .map(reward => ({ ticketId: String(reward.ticketId), title: String(reward.title), kind: String(reward.kind || "free-item"), item: String(reward.item || ""), percent: Number(reward.percent || 0), maxDiscount: Number(reward.maxDiscount || 0), minimum: Number(reward.minimum || 0), expiresAt: new Date(timestampMillis(reward.expiresAt)).toISOString() }));
  return {
    enabled: game.enabled === true,
    campaignId: String(game.campaignId || ""),
    points: Math.max(0, Number(loyalty.points || 0)),
    completedStageIds: completed,
    completedStages: completed.length,
    totalStages: stages.length,
    currentStage: current ? { id: current.id, order: current.order, title: current.title, instructions: current.instructions, targetScore: current.targetScore, reward: publicGameReward(current.reward) } : null,
    nextStages: current ? stages.filter(stage => stage.order > current.order).slice(0, 2).map(stage => ({ id: stage.id, order: stage.order, title: stage.title, reward: publicGameReward(stage.reward), locked: true })) : [],
    availableRewards: activeRewards
  };
});

exports.startCravingDashStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const uid = await requireActiveCustomer(request);
  const config = await readBusinessConfig();
  const game = config.cravingDash || {};
  if (game.enabled !== true) throw new HttpsError("failed-precondition", "Craving Dash is paused right now. Please check again soon.");
  const stages = (Array.isArray(game.stages) ? game.stages : []).filter(stage => stage.enabled !== false).sort((a, b) => a.order - b.order);
  const progressRef = db.collection("cravingDashAccounts").doc(uid);
  const progressSnapshot = await progressRef.get();
  const completed = progressSnapshot.data()?.campaignId === String(game.campaignId || "campaign-v1") && Array.isArray(progressSnapshot.data()?.completedStageIds) ? progressSnapshot.data().completedStageIds : [];
  const stage = stages.find(item => !completed.includes(item.id));
  if (!stage) throw new HttpsError("failed-precondition", "You have cleared all current Craving Dash stages.");
  const challengeId = db.collection("cravingDashChallenges").doc().id;
  const foods = gameStageFoods(config.menu);
  if (foods.length < 2) throw new HttpsError("failed-precondition", "The game food list is not available yet.");
  const roundFoods = foods.slice().sort(() => Math.random() - 0.5).slice(0, 12);
  const objects = roundFoods.map((name, index) => {
    const correct = index < stage.targetScore;
    return { id: `food-${index}`, name, correct };
  }).sort(() => Math.random() - 0.5).map((item, index) => ({ ...item, id: `food-${index}` }));
  const challengeRef = progressRef.collection("challenges").doc(challengeId);
  const now = Date.now();
  await challengeRef.create({ uid, stageId: stage.id, campaignId: String(game.campaignId || "campaign-v1"), targetScore: Number(stage.targetScore), reward: stage.reward, objects, nextActionIndex: 0, score: 0, lastActionAt: 0, startedAt: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + 90000), consumed: false });
  return { challengeId, stage: { id: stage.id, title: stage.title, instructions: stage.instructions, targetScore: stage.targetScore, reward: publicGameReward(stage.reward) }, ticket: objects.filter(item => item.correct).map(item => item.name), objects: objects.map(({ id, name }) => ({ id, name })), durationSeconds: 60 };
});

exports.adminStartCravingDashTest = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const adminUid = await requireAdmin(request);
  const stageId = String(request.data?.stageId || "");
  const config = await readBusinessConfig();
  const game = config.cravingDash || {};
  const stages = (Array.isArray(game.stages) ? game.stages : []).sort((a, b) => a.order - b.order);
  const stage = stages.find(item => item.id === stageId);
  if (!stage) throw new HttpsError("not-found", "Save this stage configuration before starting its test.");
  const foods = gameStageFoods(config.menu);
  if (foods.length < 2) throw new HttpsError("failed-precondition", "The game food list is not available yet.");
  const roundFoods = foods.slice().sort(() => Math.random() - 0.5).slice(0, 12);
  while (roundFoods.length < 12) roundFoods.push(foods[roundFoods.length % foods.length]);
  const objects = roundFoods.map((name, index) => ({ id: `food-${index}`, name, correct: index < Number(stage.targetScore) }))
    .sort(() => Math.random() - 0.5).map((item, index) => ({ ...item, id: `food-${index}` }));
  const challengeId = db.collection("cravingDashChallenges").doc().id;
  const challengeRef = db.collection("cravingDashAccounts").doc(adminUid).collection("challenges").doc(challengeId);
  const now = Date.now();
  await challengeRef.create({ uid: adminUid, stageId: stage.id, campaignId: String(game.campaignId || "campaign-v1"), targetScore: Number(stage.targetScore), reward: stage.reward, objects, nextActionIndex: 0, score: 0, lastActionAt: 0, startedAt: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + 90000), consumed: false, isAdminTest: true });
  return { adminTest: true, challengeId, stage: { id: stage.id, order: stage.order, title: stage.title, instructions: stage.instructions, targetScore: stage.targetScore, reward: publicGameReward(stage.reward) }, ticket: objects.filter(item => item.correct).map(item => item.name), objects: objects.map(({ id, name }) => ({ id, name })), durationSeconds: 60 };
});

exports.recordCravingDashAction = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const adminTest = request.data?.adminTest === true;
  const uid = adminTest ? await requireAdmin(request) : await requireActiveCustomer(request);
  const challengeId = String(request.data?.challengeId || "");
  const objectId = String(request.data?.objectId || "");
  const action = request.data?.action;
  const actionIndex = Number(request.data?.actionIndex);
  const actionRequestId = String(request.data?.actionRequestId || "");
  if (!/^[A-Za-z0-9_-]{18,40}$/.test(challengeId) || !/^food-\d{1,2}$/.test(objectId) || !["serve", "skip"].includes(action) || !Number.isSafeInteger(actionIndex) || actionIndex < 0 || actionIndex > 11 || !/^[A-Za-z0-9_-]{16,80}$/.test(actionRequestId)) {
    throw new HttpsError("invalid-argument", "This game round is invalid. Start a new round.");
  }
  const progressRef = db.collection("cravingDashAccounts").doc(uid);
  const challengeRef = progressRef.collection("challenges").doc(challengeId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(challengeRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "This game round has expired. Start again.");
    const challenge = snapshot.data();
    if (challenge.lastActionRequestId === actionRequestId) return challenge.lastActionResult;
    const now = Date.now();
    if (challenge.uid !== uid || Boolean(challenge.isAdminTest) !== adminTest || challenge.consumed || now > timestampMillis(challenge.expiresAt)) throw new HttpsError("failed-precondition", "This game round is no longer active.");
    if (actionIndex !== Number(challenge.nextActionIndex || 0)) throw new HttpsError("failed-precondition", "Your tray action is out of order. Please restart the round.");
    if (now - Number(challenge.lastActionAt || 0) < 500) throw new HttpsError("resource-exhausted", "Take a moment to serve each food before the next swipe.");
    const object = (Array.isArray(challenge.objects) ? challenge.objects : []).find(item => item.id === objectId);
    if (!object || object.id !== `food-${actionIndex}`) throw new HttpsError("invalid-argument", "This food is not the next one in the round.");
    const score = Math.max(0, Number(challenge.score || 0) + (action === "serve" ? (object.correct === true ? 1 : -1) : 0));
    const result = { nextActionIndex: actionIndex + 1, score };
    transaction.update(challengeRef, { nextActionIndex: actionIndex + 1, score, lastActionAt: now, lastActionRequestId: actionRequestId, lastActionResult: result });
    return result;
  });
});

exports.submitCravingDashStage = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async request => {
  const adminTest = request.data?.adminTest === true;
  const uid = adminTest ? await requireAdmin(request) : await requireActiveCustomer(request);
  const challengeId = String(request.data?.challengeId || "");
  if (!/^[A-Za-z0-9_-]{18,40}$/.test(challengeId)) {
    throw new HttpsError("invalid-argument", "This game round is invalid. Start a new round.");
  }
  const config = await readBusinessConfig();
  const game = config.cravingDash || {};
  const stages = (Array.isArray(game.stages) ? game.stages : []).filter(stage => stage.enabled !== false).sort((a, b) => a.order - b.order);
  const accountRef = db.collection("loyaltyAccounts").doc(uid);
  const progressRef = db.collection("cravingDashAccounts").doc(uid);
  const challengeRef = progressRef.collection("challenges").doc(challengeId);
  const auditRef = db.collection("gameRewardAudits").doc(challengeId);
  return db.runTransaction(async transaction => {
    const [challengeSnapshot, progressSnapshot, accountSnapshot] = await Promise.all([transaction.get(challengeRef), transaction.get(progressRef), transaction.get(accountRef)]);
    if (!challengeSnapshot.exists) throw new HttpsError("not-found", "This game round has expired. Start again.");
    const challenge = challengeSnapshot.data();
    if (challenge.consumed) return challenge.result || { success: false, duplicate: true };
    const now = Date.now();
    if (adminTest) {
      if (challenge.uid !== uid || challenge.isAdminTest !== true || now < timestampMillis(challenge.startedAt) + 8000 || now > timestampMillis(challenge.expiresAt) || Number(challenge.nextActionIndex || 0) !== 12) {
        throw new HttpsError("failed-precondition", "The admin test round is expired or incomplete. Start the stage test again.");
      }
      const score = Math.max(0, Number(challenge.score || 0));
      const targetScore = Number(challenge.targetScore);
      const result = { adminTest: true, success: score >= targetScore, score, targetScore, stageId: challenge.stageId, pointsAwarded: 0, rewardPreview: publicGameReward(challenge.reward) };
      transaction.update(challengeRef, { consumed: true, result, completedAt: FieldValue.serverTimestamp() });
      return result;
    }
    if (challenge.isAdminTest === true) throw new HttpsError("permission-denied", "Admin test rounds can only be checked in admin test mode.");
    if (now < timestampMillis(challenge.startedAt) + 8000 || now > timestampMillis(challenge.expiresAt) || challenge.uid !== uid || challenge.campaignId !== String(game.campaignId || "campaign-v1") || game.enabled !== true || Number(challenge.nextActionIndex || 0) !== 12) {
      throw new HttpsError("failed-precondition", "This round is expired or was not completed in the allowed time. Start another round.");
    }
    const stage = stages.find(item => item.id === challenge.stageId);
    const completed = progressSnapshot.data()?.campaignId === String(game.campaignId || "campaign-v1") && Array.isArray(progressSnapshot.data()?.completedStageIds) ? [...progressSnapshot.data().completedStageIds] : [];
    if (!stage || completed.includes(stage.id)) throw new HttpsError("already-exists", "This stage has already been completed.");
    const expectedStage = stages.find(item => !completed.includes(item.id));
    if (!expectedStage || expectedStage.id !== stage.id) throw new HttpsError("failed-precondition", "Clear the stages in order.");
    const score = Math.max(0, Number(challenge.score || 0));
    const targetScore = Number(challenge.targetScore);
    const prize = challenge.reward;
    const won = score >= targetScore;
    const loyalty = accountSnapshot.exists ? accountSnapshot.data() : {};
    const pointsBefore = Math.max(0, Number(loyalty.points || 0));
    let rewardTicket = null;
    let pointsAwarded = 0;
    if (won) {
      completed.push(stage.id);
      const issuedAt = Timestamp.fromMillis(now);
      if (prize.kind === "points") {
        pointsAwarded = Number(prize.points);
        transaction.set(accountRef, { points: pointsBefore + pointsAwarded, totalEarned: Math.max(0, Number(loyalty.totalEarned || 0)) + pointsAwarded, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.create(accountRef.collection("entries").doc(`game-${challengeId}`), { points: pointsAwarded, type: "craving-dash", reason: `Craving Dash · ${stage.title}`, gameStageId: stage.id, createdAt: FieldValue.serverTimestamp() });
      } else if (prize.kind === "free-item") {
        const expiresAt = Timestamp.fromMillis(now + 48 * 60 * 60 * 1000);
        rewardTicket = { ticketId: `dash-${challengeId}`, id: `dash-${stage.id}`, source: "craving-dash", kind: "free-item", title: `${stage.title} reward`, detail: `${prize.item} free · valid for 48 hours`, item: prize.item, minimum: Number(prize.minimum || 0), issuedAt, expiresAt, gameStageId: stage.id };
        transaction.set(accountRef, { availableRewards: [...(Array.isArray(loyalty.availableRewards) ? loyalty.availableRewards : []), rewardTicket], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } else if (prize.kind === "percent-discount") {
        const expiresAt = Timestamp.fromMillis(now + 48 * 60 * 60 * 1000);
        const capText = Number(prize.maxDiscount) > 0 ? ` · up to ₹${Number(prize.maxDiscount)}` : "";
        rewardTicket = { ticketId: `dash-${challengeId}`, id: `dash-${stage.id}`, source: "craving-dash", kind: "percent-discount", title: `${stage.title} reward`, detail: `${Number(prize.percent)}% off eligible regular menu items${capText} · valid for 48 hours`, percent: Number(prize.percent), maxDiscount: Number(prize.maxDiscount || 0), minimum: Number(prize.minimum || 0), issuedAt, expiresAt, gameStageId: stage.id };
        transaction.set(accountRef, { availableRewards: [...(Array.isArray(loyalty.availableRewards) ? loyalty.availableRewards : []), rewardTicket], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      transaction.set(progressRef, { campaignId: String(game.campaignId || "campaign-v1"), completedStageIds: completed, updatedAt: FieldValue.serverTimestamp(), lastStageId: stage.id }, { merge: true });
      transaction.create(auditRef, { uid, stageId: stage.id, rewardKind: prize.kind, pointsAwarded, freeItem: rewardTicket?.item || null, createdAt: FieldValue.serverTimestamp() });
    }
    const result = { success: won, score, targetScore, stageId: stage.id, pointsAwarded, reward: rewardTicket ? { title: rewardTicket.title, kind: rewardTicket.kind, item: rewardTicket.item || "", percent: Number(rewardTicket.percent || 0), maxDiscount: Number(rewardTicket.maxDiscount || 0), minimum: rewardTicket.minimum, expiresAt: new Date(now + 48 * 60 * 60 * 1000).toISOString() } : null };
    transaction.update(challengeRef, { consumed: true, result, completedAt: FieldValue.serverTimestamp() });
    return result;
  });
});

exports.adminListAccessUsers = onCall({ region: REGION }, async request => {
  await requireAdmin(request);
  const users = [];
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    users.push(...page.users.filter(user => user.customClaims?.staff === true || user.customClaims?.admin === true).map(user => ({
      uid: user.uid,
      mobile: user.phoneNumber || "",
      name: user.displayName || "",
      role: user.customClaims?.admin === true ? "admin" : "staff",
      lastSignIn: user.metadata?.lastSignInTime || null,
      disabled: user.disabled === true
    })));
    pageToken = page.pageToken;
  } while (pageToken);
  return { users: users.sort((a, b) => a.role.localeCompare(b.role) || a.mobile.localeCompare(b.mobile)) };
});

exports.adminSetUserRole = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  const role = String(request.data?.role || "");
  if (!mobile || !["admin", "staff", "customer"].includes(role)) throw new HttpsError("invalid-argument", "Enter a valid mobile number and choose customer, staff, or admin.");
  let user;
  try {
    user = await getAuth().getUserByPhoneNumber(mobile);
  } catch (error) {
    if (error.code === "auth/user-not-found") throw new HttpsError("not-found", "This number must sign in with OTP on the website once before access can be assigned.");
    throw new HttpsError("unavailable", "Could not look up this phone account. Please retry.");
  }
  const claims = { ...(user.customClaims || {}) };
  if (role === "admin") { claims.admin = true; claims.staff = true; }
  else if (role === "staff") { delete claims.admin; claims.staff = true; }
  else { delete claims.admin; delete claims.staff; }
  if (role !== "admin" && user.customClaims?.admin === true) {
    let adminCount = 0;
    let pageToken;
    do {
      const page = await getAuth().listUsers(1000, pageToken);
      adminCount += page.users.filter(candidate => !candidate.disabled && candidate.customClaims?.admin === true).length;
      pageToken = page.pageToken;
    } while (pageToken && adminCount < 2);
    if (adminCount <= 1) throw new HttpsError("failed-precondition", "Keep at least one active administrator account.");
  }
  await getAuth().setCustomUserClaims(user.uid, claims);
  await getAuth().revokeRefreshTokens(user.uid);
  await db.collection("adminAccessChanges").add({ changedBy: adminUid, targetUid: user.uid, mobile, role, createdAt: FieldValue.serverTimestamp() });
  return { mobile, role, changedBy: adminUid, message: "The account must sign in again for the new access to take effect." };
});

exports.adminListCustomers = onCall({ region: REGION }, async request => {
  await requireAdmin(request);
  const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(1000).get();
  const customers = new Map();
  for (const document of snapshot.docs) {
    const order = document.data();
    const mobile = normalizeIndianMobile(order.mobile);
    if (!mobile) continue;
    const key = order.uid || mobile;
    const row = customers.get(key) || { uid: order.uid || "", mobile, name: String(order.customerName || "Customer"), orders: 0, spend: 0, lastOrderAt: null };
    row.orders += 1;
    if (!["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) row.spend += Math.max(0, Number(order.total || 0));
    row.lastOrderAt ||= order.createdAt?.toDate?.().toISOString?.() || null;
    if (row.name === "Customer" && order.customerName) row.name = String(order.customerName);
    customers.set(key, row);
  }
  return { customers: [...customers.values()].sort((a, b) => String(b.lastOrderAt || "").localeCompare(String(a.lastOrderAt || ""))).slice(0, 500) };
});

exports.adminGetCustomerDetails = onCall({ region: REGION }, async request => {
  await requireAdmin(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  if (!mobile) throw new HttpsError("invalid-argument", "Enter a valid Indian mobile number.");
  let user = null;
  try { user = await getAuth().getUserByPhoneNumber(mobile); }
  catch (error) { if (error.code !== "auth/user-not-found") throw new HttpsError("unavailable", "Could not look up this customer account."); }
  const queries = [db.collection("orders").where("mobile", "==", mobile).orderBy("createdAt", "desc").limit(1000)];
  if (user) queries.unshift(db.collection("orders").where("uid", "==", user.uid).orderBy("createdAt", "desc").limit(1000));
  const [profileSnapshot, loyaltySnapshot, blockSnapshot, ...orderSnapshots] = await Promise.all([
    user ? db.collection("customerProfiles").doc(user.uid).get() : Promise.resolve(null),
    user ? db.collection("loyaltyAccounts").doc(user.uid).get() : Promise.resolve(null),
    user ? db.collection("customerBlocks").doc(user.uid).get() : Promise.resolve(null),
    ...queries.map(query => query.get())
  ]);
  const orderMap = new Map();
  for (const result of orderSnapshots) for (const document of result.docs) orderMap.set(document.id, { id: document.id, ...safeFirestoreData(document.data()) });
  const orders = [...orderMap.values()].sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
  const profile = profileSnapshot?.exists ? profileSnapshot.data() : {};
  const loyalty = loyaltySnapshot?.exists ? loyaltySnapshot.data() : {};
  const savedAddresses = Array.isArray(profile.addresses) ? profile.addresses : [];
  const savedAddressKeys = new Set(savedAddresses.map(address => [address.address, address.landmark, address.area].map(value => String(value || "").trim().toLowerCase()).join("|")));
  const orderAddresses = orders.filter(order => order.orderType !== "pickup" && String(order.address || "").trim()).map(order => ({
    orderId: order.id,
    orderNumber: String(order.orderNumber || ""),
    createdAt: order.createdAt,
    label: String(order.addressLabel || "").slice(0, 30),
    address: String(order.address || "").slice(0, 300),
    landmark: String(order.landmark || "").slice(0, 100),
    area: String(order.area || "").slice(0, 80)
  })).filter(address => !savedAddressKeys.has([address.address, address.landmark, address.area].map(value => String(value || "").trim().toLowerCase()).join("|")));
  return {
    found: Boolean(user || orders.length), mobile,
    uid: user?.uid || "",
    accountDisabled: user?.disabled === true,
    customerBlocked: Boolean(user && (user.disabled || blockSnapshot?.exists)),
    customerBlockManaged: blockSnapshot?.data()?.blocked === true,
    name: String(profile.name || user?.displayName || orders.find(order => order.customerName)?.customerName || "Customer").slice(0, 80),
    addresses: safeFirestoreData(savedAddresses),
    orderAddresses: safeFirestoreData(orderAddresses),
    points: Math.max(0, Number(loyalty.points || 0)),
    completedOrders: Math.max(0, Number(loyalty.completedOrders || 0)),
    availableRewards: safeFirestoreData(loyalty.availableRewards || []),
    orders,
    historyLimited: orders.length >= 1000
  };
});

exports.adminSetCustomerBlocked = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  const blocked = request.data?.blocked;
  if (!mobile || typeof blocked !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose a valid customer number and block status.");
  }
  let user;
  try {
    user = await getAuth().getUserByPhoneNumber(mobile);
  } catch (error) {
    if (error.code === "auth/user-not-found") throw new HttpsError("not-found", "No signed-in customer account exists for this number.");
    console.error("Could not find customer to update block status", error);
    throw new HttpsError("unavailable", "Customer account could not be loaded.");
  }
  if (user.customClaims?.admin === true || user.customClaims?.staff === true) {
    throw new HttpsError("failed-precondition", "Team accounts cannot be blocked from the customer controls. Change team access in the Access tab.");
  }

  const blockRef = db.collection("customerBlocks").doc(user.uid);
  const prior = await blockRef.get();
  if (blocked) {
    if (!prior.exists || prior.data()?.blocked !== true) {
      await blockRef.set({
        uid: user.uid,
        mobile,
        blocked: true,
        previousDisabled: user.disabled === true,
        blockedBy: adminUid,
        blockedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    if (!user.disabled) await getAuth().updateUser(user.uid, { disabled: true });
    await getAuth().revokeRefreshTokens(user.uid);
  } else {
    if (!prior.exists || prior.data()?.blocked !== true) {
      throw new HttpsError("failed-precondition", "This account has no customer block to reverse.");
    }
    const restoreDisabled = prior.data()?.previousDisabled === true;
    await getAuth().updateUser(user.uid, { disabled: restoreDisabled });
    await blockRef.delete();
  }
  await db.collection("adminCustomerBlockChanges").add({
    adminUid,
    customerUid: user.uid,
    mobile,
    action: blocked ? "blocked" : "unblocked",
    createdAt: FieldValue.serverTimestamp()
  });
  return { uid: user.uid, mobile, blocked, message: blocked ? "Customer access blocked." : "Customer access restored." };
});

exports.adminDeleteCustomerAccount = onCall({ region: REGION, timeoutSeconds: 540 }, async request => {
  const adminUid = await requireAdmin(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  if (!mobile) throw new HttpsError("invalid-argument", "Enter a valid Indian mobile number.");

  let user = null;
  try {
    user = await getAuth().getUserByPhoneNumber(mobile);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      console.error("Could not load customer for account deletion", error);
      throw new HttpsError("unavailable", "Customer account could not be loaded.");
    }
  }
  if (user?.customClaims?.admin === true || user?.customClaims?.staff === true) {
    throw new HttpsError("failed-precondition", "Team accounts cannot be deleted from customer controls. Change team access in the Access tab.");
  }

  const uid = user?.uid || "";
  if (uid) {
    // Keep a minimal tombstone so a previously issued ID token remains blocked by Firestore rules.
    await db.collection("customerBlocks").doc(uid).set({
      blocked: true,
      deleted: true,
      deletedBy: adminUid,
      deletedAt: FieldValue.serverTimestamp()
    });
    if (!user.disabled) await getAuth().updateUser(uid, { disabled: true });
    await getAuth().revokeRefreshTokens(uid);
  }

  const matchingOrderRefs = new Map();
  const findOrderRefs = async (field, value) => {
    if (!value) return;
    let cursor = null;
    while (true) {
      let query = db.collection("orders").where(field, "==", value).orderBy(FieldPath.documentId()).limit(400);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      if (page.empty) break;
      page.docs.forEach(document => matchingOrderRefs.set(document.id, document.ref));
      cursor = page.docs[page.docs.length - 1];
      if (page.size < 400) break;
    }
  };
  await Promise.all([findOrderRefs("mobile", mobile), findOrderRefs("uid", uid)]);

  const personalOrderFields = ["uid", "mobile", "customerName", "address", "addressLabel", "landmark"];
  let anonymizedOrders = 0;
  const orderRefs = [...matchingOrderRefs.values()];
  for (let start = 0; start < orderRefs.length; start += 400) {
    const batch = db.batch();
    orderRefs.slice(start, start + 400).forEach(ref => {
      batch.update(ref, Object.fromEntries(personalOrderFields.map(field => [field, FieldValue.delete()])));
    });
    await batch.commit();
    anonymizedOrders += Math.min(400, orderRefs.length - start);
  }

  if (uid) {
    const auditCollections = [
      { name: "adminCustomerBlockChanges", field: "customerUid", update: { customerUid: FieldValue.delete(), mobile: FieldValue.delete() } },
      { name: "adminAccessChanges", field: "targetUid", update: { targetUid: FieldValue.delete(), mobile: FieldValue.delete() } },
      { name: "adminAdjustments", field: "customerUid", update: { customerUid: FieldValue.delete(), mobile: FieldValue.delete(), response: FieldValue.delete(), reason: "Customer account deleted; identifying details removed." } }
    ];
    for (const audit of auditCollections) {
      const auditSnapshot = await db.collection(audit.name).where(audit.field, "==", uid).get();
      for (let start = 0; start < auditSnapshot.docs.length; start += 400) {
        const batch = db.batch();
        auditSnapshot.docs.slice(start, start + 400).forEach(document => batch.update(document.ref, audit.update));
        await batch.commit();
      }
    }
  }

  if (uid) {
    const loyaltyRef = db.collection("loyaltyAccounts").doc(uid);
    let cursor = null;
    while (true) {
      let query = loyaltyRef.collection("entries").orderBy(FieldPath.documentId()).limit(400);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      if (page.empty) break;
      const batch = db.batch();
      page.docs.forEach(document => batch.delete(document.ref));
      await batch.commit();
      cursor = page.docs[page.docs.length - 1];
      if (page.size < 400) break;
    }
    const requestSnapshot = await db.collection("orderRequests").where("uid", "==", uid).get();
    for (let start = 0; start < requestSnapshot.docs.length; start += 400) {
      const batch = db.batch();
      requestSnapshot.docs.slice(start, start + 400).forEach(document => batch.delete(document.ref));
      await batch.commit();
    }
    await Promise.all([
      db.collection("customerProfiles").doc(uid).delete(),
      loyaltyRef.delete()
    ]);
    try {
      await getAuth().deleteUser(uid);
    } catch (error) {
      console.error("Customer data was removed but Auth account deletion failed", error);
      throw new HttpsError("internal", "Customer data was removed, but login cleanup did not finish. Retry account deletion or contact support.");
    }
  }

  await db.collection("adminCustomerDeletionAudits").add({
    adminUid,
    accountDeleted: Boolean(uid),
    anonymizedOrders,
    deletedAt: FieldValue.serverTimestamp()
  });
  return {
    deleted: true,
    accountDeleted: Boolean(uid),
    anonymizedOrders,
    message: `Customer account data and rewards were deleted. ${anonymizedOrders} historical order${anonymizedOrders === 1 ? " was" : "s were"} retained without customer contact details.`
  };
});

function mumbaiMidnight(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
}

function mumbaiRange(range, now = new Date()) {
  const todayKey = mumbaiDateKey(now);
  const [year, month] = todayKey.split("-").map(Number);
  let startKey = todayKey;
  if (range === "week") {
    const weekday = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
    const monday = new Date(Date.UTC(year, month - 1, Number(todayKey.slice(-2)) - ((weekday + 6) % 7)));
    startKey = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  } else if (range === "month") startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  else if (range !== "today") throw new HttpsError("invalid-argument", "Choose today, week, or month.");
  return { start: mumbaiMidnight(startKey), end: now, startKey, todayKey };
}

function summarizeSales(orders) {
  const summary = { total: { sales: 0, orders: 0 }, online: { sales: 0, orders: 0 }, walkIn: { sales: 0, orders: 0 } };
  const items = new Map();
  const locations = new Map();
  const weekdays = new Map(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => [day, { sales: 0, orders: 0 }]));
  for (const order of orders) {
    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) continue;
    const amount = Math.max(0, Number(order.total || 0));
    const channel = order.source === "walk-in" ? summary.walkIn : summary.online;
    summary.total.sales += amount; summary.total.orders += 1; channel.sales += amount; channel.orders += 1;
    const location = order.source === "walk-in" ? "Walk-in / Counter" : order.orderType === "pickup" ? "Store pickup" : String(order.area || "").trim() || "Area not recorded";
    const locationRow = locations.get(location) || { location, sales: 0, orders: 0 };
    locationRow.sales += amount; locationRow.orders += 1; locations.set(location, locationRow);
    const weekday = order.createdAt?.toDate ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(order.createdAt.toDate()) : "";
    if (weekdays.has(weekday)) { weekdays.get(weekday).sales += amount; weekdays.get(weekday).orders += 1; }
    for (const line of Array.isArray(order.items) ? order.items : []) {
      const name = String(line.name || "Unknown item");
      const row = items.get(name) || { name, quantity: 0, listedValue: 0 };
      const qty = Math.max(0, Number(line.qty || 0));
      row.quantity += qty;
      row.listedValue += Math.max(0, Number(line.price || 0)) * qty;
      items.set(name, row);
    }
  }
  return { summary, items: [...items.values()].sort((a, b) => b.quantity - a.quantity), locations: [...locations.values()].sort((a, b) => b.sales - a.sales), weekdays: [...weekdays.entries()].map(([day, values]) => ({ day, ...values })) };
}

exports.adminGetSalesAnalytics = onCall({ region: REGION }, async request => {
  await requireAdmin(request);
  const range = String(request.data?.range || "today");
  const { start, end, startKey } = mumbaiRange(range);
  const endTimestamp = Timestamp.fromDate(new Date(end.getTime() + 1));
  const result = await db.collection("orders").where("createdAt", ">=", Timestamp.fromDate(start)).where("createdAt", "<", endTimestamp).orderBy("createdAt", "desc").limit(20000).get();
  const orders = result.docs.map(document => document.data());
  const report = summarizeSales(orders);
  const [monthYear, monthNumber] = mumbaiDateKey().split("-").map(Number);
  const monthStart = mumbaiMidnight(`${monthYear}-${String(monthNumber).padStart(2, "0")}-01`);
  const weekdaySnapshot = range === "month" ? null : await db.collection("orders").where("createdAt", ">=", Timestamp.fromDate(monthStart)).where("createdAt", "<", endTimestamp).limit(20000).get();
  const weekdayReport = weekdaySnapshot ? summarizeSales(weekdaySnapshot.docs.map(document => document.data())).weekdays : report.weekdays;
  return { range, startDate: startKey, endDate: mumbaiDateKey(), timezone: "Asia/Kolkata", ...report, weekdays: weekdayReport, truncated: result.size === 20000 };
});

exports.adminAdjustCustomerBenefits = onCall({ region: REGION }, async request => {
  const adminUid = await requireAdmin(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  const pointsDelta = Number(request.data?.pointsDelta || 0);
  const rewardId = String(request.data?.rewardId || "").trim();
  const reason = String(request.data?.reason || "").trim();
  const requestId = String(request.data?.requestId || "");
  if (!mobile || !Number.isSafeInteger(pointsDelta) || Math.abs(pointsDelta) > 10000 || (!pointsDelta && !rewardId) || reason.length < 5 || reason.length > 250 || !/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Enter a customer, a points change or reward, and a reason (5–250 characters).");
  }
  let user;
  try { user = await getAuth().getUserByPhoneNumber(mobile); }
  catch (error) { if (error.code === "auth/user-not-found") throw new HttpsError("not-found", "This customer must sign in with OTP on the website before receiving points or rewards."); throw error; }
  const rewardConfig = (await readBusinessConfig()).rewards;
  const reward = rewardId ? rewardConfig.rewardById[rewardId] : null;
  if (rewardId && (!reward || ["welcome", "progress"].includes(reward.kind))) throw new HttpsError("not-found", "That reward is not available to grant from the current lineup.");
  const accountRef = db.collection("loyaltyAccounts").doc(user.uid);
  const adjustmentRef = db.collection("adminAdjustments").doc(`${adminUid}_${requestId}`);
  return db.runTransaction(async transaction => {
    const [adjustmentSnapshot, accountSnapshot] = await Promise.all([transaction.get(adjustmentRef), transaction.get(accountRef)]);
    if (adjustmentSnapshot.exists) return adjustmentSnapshot.data().response;
    const account = accountSnapshot.exists ? accountSnapshot.data() : {};
    const currentPoints = Math.max(0, Number(account.points || 0));
    if (currentPoints + pointsDelta < 0) throw new HttpsError("failed-precondition", "The customer does not have enough points for that deduction.");
    const availableRewards = Array.isArray(account.availableRewards) ? [...account.availableRewards] : [];
    let issuedReward = null;
    if (reward) {
      issuedReward = {
        ticketId: `admin-${requestId}`, id: reward.id, order: reward.order,
        title: reward.title, detail: reward.detail,
        expiresAt: reward.kind === "free-item" ? new Date(Date.now() + rewardConfig.freeItemExpiryDays * 86400000) : null,
        issuedAt: new Date()
      };
      availableRewards.push(issuedReward);
    }
    const response = { mobile, points: currentPoints + pointsDelta, reward: issuedReward ? { id: issuedReward.id, title: issuedReward.title } : null };
    transaction.set(accountRef, {
      uid: user.uid, points: currentPoints + pointsDelta,
      totalEarned: Math.max(0, Number(account.totalEarned || 0)) + Math.max(0, pointsDelta),
      totalRedeemed: Math.max(0, Number(account.totalRedeemed || 0)) + Math.max(0, -pointsDelta),
      availableRewards, updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.create(accountRef.collection("entries").doc(`admin-${requestId}`), { points: pointsDelta, reason, adminUid, type: "admin-adjustment", createdAt: FieldValue.serverTimestamp(), rewardId: rewardId || null });
    transaction.create(adjustmentRef, { adminUid, customerUid: user.uid, mobile, pointsDelta, rewardId: rewardId || null, reason, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
});

exports.createOrder = onCall({ region: REGION }, async request => {
  const activeCustomerUid = await requireActiveCustomer(request);
  // Phone Auth emulator tokens can omit phone_number even when the verified
  // Firebase user record has it. Use the trusted Auth record as the fallback.
  const authenticatedCustomer = await getAuth().getUser(activeCustomerUid);
  const customerMobile = request.auth.token.phone_number || authenticatedCustomer.phoneNumber || "";
  const data = request.data || {};
  const orderType = data.orderType === undefined ? "delivery" : data.orderType;
  if (!["delivery", "pickup"].includes(orderType)) {
    throw new HttpsError("invalid-argument", "Choose delivery or store pickup.");
  }
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "";
  const address = orderType === "delivery" && typeof data.address === "string" ? data.address.trim() : "";
  const addressLabel = orderType === "delivery" && typeof data.addressLabel === "string" ? data.addressLabel.trim() : "";
  const addressId = orderType === "delivery" && typeof data.addressId === "string" ? data.addressId.trim() : "";
  const landmark = orderType === "delivery" && typeof data.landmark === "string" ? data.landmark.trim() : "";
  const area = orderType === "delivery" && typeof data.area === "string" ? data.area.trim() : "";
  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (customerName.length < 2 || customerName.length > 80 || (orderType === "delivery" && (address.length < 8 || address.length > 300 || addressLabel.length < 1 || addressLabel.length > 30 || /[\u0000-\u001f\u007f]/.test(addressLabel) || !/^[A-Za-z0-9_-]{1,80}$/.test(addressId) || landmark.length > 100 || !DELIVERY_AREAS.has(area)))) {
    throw new HttpsError("invalid-argument", "Enter your full address, choose a Home, Work, or Other label, and select a supported delivery area.");
  }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Order reference is missing. Please retry checkout.");
  }
  const paymentMethod = orderType === "pickup" ? "Pay on Pickup" : "Pay on Delivery";
  if (data.paymentMethod && data.paymentMethod !== paymentMethod) {
    throw new HttpsError("invalid-argument", "Choose the payment method for your delivery or pickup order.");
  }

  const businessConfig = await readBusinessConfig();
  const rewardConfig = businessConfig.rewards;
  const priceByName = buildPriceByName(businessConfig.menu, businessConfig.combos);
  const { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal, freeOffer } = validateAndPriceItems(data.items, businessConfig.menu, businessConfig.combos);
  const uid = activeCustomerUid;
  const accountRef = db.collection("loyaltyAccounts").doc(uid);
  const profileRef = db.collection("customerProfiles").doc(uid);
  const requestRef = db.collection("orderRequests").doc(`${uid}_${requestId}`);
  const orderRef = db.collection("orders").doc();
  const orderingStatusRef = ORDERING_STATUS_REF();

  const result = await db.runTransaction(async transaction => {
    const existingRequest = await transaction.get(requestRef);
    if (existingRequest.exists) return existingRequest.data().response;

    const orderingStatusSnapshot = await transaction.get(orderingStatusRef);
    const orderingSettings = orderingStatusSnapshot.exists ? orderingStatusSnapshot.data() : {};
    const orderingDecision = buildOrderingStatus(orderingSettings);
    if (!orderingDecision.acceptingOnlineOrders) {
      throw new HttpsError("failed-precondition", orderingDecision.message);
    }

    const [accountSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(accountRef),
      orderType === "delivery" ? transaction.get(profileRef) : Promise.resolve(null)
    ]);
    const account = accountSnapshot.exists ? accountSnapshot.data() : {};
    const profile = profileSnapshot?.exists ? profileSnapshot.data() : {};
    const balance = Math.max(0, Number(account.points || 0));
    const availableRewards = Array.isArray(account.availableRewards) ? account.availableRewards : [];
    const loyaltyRewardTicketId = typeof data.loyaltyRewardId === "string" ? data.loyaltyRewardId : "";
    const requestedPoints = Number(data.redeemPoints || 0);
    const applyFirstOrderReward = data.applyFirstOrderReward === true;
    const hasOtherBenefit = Boolean(freeOffer || loyaltyRewardTicketId || requestedPoints > 0);
    let welcomeUsed = false;
    let pointsDiscount = 0;
    let discountAmount = 0;
    let deliveryReward = false;
    let pointsBonus = 0;
    let pointsMultiplier = 1;
    let claimedReward = null;
    let loyaltyReward = null;

    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0 || requestedPoints > rewardConfig.maxRedeemPointsPerOrder || requestedPoints % 100 !== 0) {
      throw new HttpsError("invalid-argument", "Redeem Craving Points in 100-point steps, up to 1,000 per order.");
    }
    if (requestedPoints && (requestedPoints > balance || freeOffer || loyaltyRewardTicketId || applyFirstOrderReward)) {
      throw new HttpsError("failed-precondition", "Craving Points cannot be combined with another offer or reward, or your balance is too low.");
    }
    if (loyaltyRewardTicketId) {
      claimedReward = availableRewards.find(reward => reward.ticketId === loyaltyRewardTicketId || (!reward.ticketId && reward.id === loyaltyRewardTicketId));
      const isGameVoucher = claimedReward?.source === "craving-dash" && ["free-item", "percent-discount"].includes(claimedReward.kind);
      loyaltyReward = isGameVoucher
        ? { kind: claimedReward.kind, title: claimedReward.title, detail: claimedReward.detail, item: claimedReward.item, percent: Number(claimedReward.percent || 0), maxDiscount: Number(claimedReward.maxDiscount || 0), minimum: Number(claimedReward.minimum || 0) }
        : claimedReward ? rewardConfig.rewardById[claimedReward.id] : null;
      if (!loyaltyReward || freeOffer || requestedPoints) {
        throw new HttpsError("failed-precondition", "This reward is no longer available or cannot be combined with another offer.");
      }
      const oldestReward = availableRewards.filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now()).sort((a, b) => timestampMillis(a.issuedAt) - timestampMillis(b.issuedAt))[0];
      if (!oldestReward || (oldestReward.ticketId || oldestReward.id) !== loyaltyRewardTicketId) {
        throw new HttpsError("failed-precondition", "Use your oldest available Royal Rewards benefit first.");
      }
      if (claimedReward.expiresAt && timestampMillis(claimedReward.expiresAt) <= Date.now()) {
        throw new HttpsError("failed-precondition", "This reward has expired. Choose another available reward.");
      }
      if (eligibleSubtotal < Number(loyaltyReward.minimum || 0)) {
        throw new HttpsError("failed-precondition", `Add ${Math.max(0, Number(loyaltyReward.minimum) - eligibleSubtotal)} more in regular menu items to use this reward. Combos do not count toward spend rewards.`);
      }
      if (loyaltyReward.kind === "free-delivery" && orderType === "pickup") {
        throw new HttpsError("failed-precondition", "Free-delivery rewards can only be used on delivery orders.");
      }
      if (loyaltyReward.kind === "free-delivery") deliveryReward = true;
      if (loyaltyReward.kind === "free-delivery" && subtotal >= FREE_DELIVERY_THRESHOLD) {
        throw new HttpsError("failed-precondition", "Your order already qualifies for free delivery. Save this reward for a future order.");
      }
      if (loyaltyReward.kind === "discount") discountAmount = loyaltyReward.amount;
      if (loyaltyReward.kind === "percent-discount") {
        const percent = Number(loyaltyReward.percent), cap = Number(loyaltyReward.maxDiscount || 0);
        if (!isGameVoucher || !Number.isSafeInteger(percent) || percent < 1 || percent > 100 || !Number.isSafeInteger(cap) || cap < 0 || cap > 10000) throw new HttpsError("failed-precondition", "This game discount reward is not valid.");
        discountAmount = Math.min(Math.floor(eligibleSubtotal * percent / 100), cap > 0 ? cap : eligibleSubtotal);
        if (discountAmount <= 0) throw new HttpsError("failed-precondition", "Add eligible regular menu items before using this percentage reward.");
      }
      if (loyaltyReward.kind === "bonus-points") pointsBonus = loyaltyReward.points;
      if (loyaltyReward.kind === "double-points") pointsMultiplier = 2;
      if (loyaltyReward.kind === "free-item") {
        const itemPrice = priceByName.get(loyaltyReward.item);
        if (!Number.isSafeInteger(itemPrice) || itemPrice <= 0) throw new HttpsError("failed-precondition", "This reward item is unavailable.");
        if (isGameVoucher && !gameRewardItemNames(businessConfig.menu, businessConfig.combos).includes(loyaltyReward.item)) throw new HttpsError("failed-precondition", "This game reward item is no longer eligible in the menu.");
        const isComboReward = (businessConfig.combos || []).some(combo => combo.name === loyaltyReward.item);
        pricedItems.push({ name: loyaltyReward.item, price: 0, qty: 1, isCombo: isComboReward, isFreeOffer: false, isLoyaltyReward: true, loyaltyRewardId: loyaltyRewardTicketId, lineTotal: 0 });
      }
    }
    if (applyFirstOrderReward) {
      if (hasOtherBenefit || account.welcomeCompleted || account.welcomeReservationId || eligibleSubtotal <= 0) {
        throw new HttpsError("failed-precondition", "Your first-order burger reward needs a paid regular-menu item and cannot be combined with another offer or reward.");
      }
      const oldOrders = await transaction.get(db.collection("orders").where("uid", "==", uid).where("source", "==", "website").limit(1));
      if (!oldOrders.empty) throw new HttpsError("failed-precondition", "The free burger reward is only for your first online order.");
      welcomeUsed = true;
      const welcomeItemPrice = priceByName.get(rewardConfig.welcomeItem);
      if (!Number.isSafeInteger(welcomeItemPrice) || welcomeItemPrice <= 0) throw new HttpsError("failed-precondition", "The first-order reward item is unavailable.");
      pricedItems.push({ name: rewardConfig.welcomeItem, price: 0, qty: 1, isCombo: false, isFreeOffer: false, isLoyaltyReward: true, isWelcomeReward: true, lineTotal: 0 });
    }

    pointsDiscount = requestedPoints / rewardConfig.pointsPerRedemptionRupees * 10;
    if (pointsDiscount > eligibleSubtotal) throw new HttpsError("failed-precondition", "Your food subtotal is too low for that points redemption.");
    const deliveryCharge = orderType === "pickup" || deliveryReward || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
    const totalDiscount = discountAmount + pointsDiscount;
    const total = Math.max(0, subtotal - totalDiscount + deliveryCharge);
    const regularSpentForPoints = Math.max(0, regularPointSubtotal - discountAmount - pointsDiscount);
    const basePoints = Math.floor(regularSpentForPoints / rewardConfig.pointRateRegularRupees) + Math.floor(comboPointSubtotal / rewardConfig.pointRateComboRupees);
    const pointsToAward = (pointsMultiplier === 2 ? basePoints + Math.min(basePoints, Number(loyaltyReward.maxBonusPoints || 0)) : basePoints) + pointsBonus;
    const remainingRewards = loyaltyRewardTicketId ? availableRewards.filter(reward => reward.ticketId !== loyaltyRewardTicketId && !( !reward.ticketId && reward.id === loyaltyRewardTicketId)) : availableRewards;

    const orderNumber = await reserveOrderNumber(transaction, "website", orderType);
    let addressSaved = false;
    if (orderType === "delivery") {
      const addresses = Array.isArray(profile.addresses) ? [...profile.addresses] : [];
      const addressKey = [address, landmark, area].map(value => String(value || "").trim().toLowerCase()).join("|");
      let addressIndex = addresses.findIndex(item => item?.id === addressId);
      if (addressIndex < 0) addressIndex = addresses.findIndex(item => [item?.address, item?.landmark, item?.area].map(value => String(value || "").trim().toLowerCase()).join("|") === addressKey);
      const canSaveAddress = addressIndex >= 0 || addresses.length < 10;
      const nextAddress = {
        id: addressIndex >= 0 ? String(addresses[addressIndex].id || addressId) : addressId,
        label: addressLabel,
        name: customerName,
        address,
        landmark,
        area,
        isDefault: addressIndex >= 0 ? addresses[addressIndex].isDefault === true : addresses.length === 0
      };
      if (addressIndex >= 0) addresses[addressIndex] = nextAddress;
      else if (canSaveAddress) addresses.push(nextAddress);
      if (canSaveAddress) {
        if (nextAddress.isDefault) addresses.forEach((item, index) => { item.isDefault = index === (addressIndex >= 0 ? addressIndex : addresses.length - 1); });
        transaction.set(profileRef, { name: customerName, addresses, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        addressSaved = true;
      }
    }

    transaction.create(orderRef, {
      orderNumber,
      uid,
      customerName,
      mobile: customerMobile,
      address,
      addressLabel,
      landmark,
      area,
      paymentMethod,
      items: pricedItems,
      subtotal,
      eligibleSubtotal,
      discountAmount: totalDiscount,
      discountType: welcomeUsed ? "welcome-gift" : loyaltyReward?.kind || (freeOffer ? "daily-offer" : requestedPoints ? "points" : "none"),
      deliveryReward,
      pointsRedeemed: requestedPoints,
      pointsDiscount,
      pointsToAward,
      claimedRewardId: loyaltyRewardTicketId || null,
      claimedReward: loyaltyRewardTicketId ? { ticketId: loyaltyRewardTicketId, id: claimedReward.id, kind: loyaltyReward.kind, title: loyaltyReward.title, expiresAt: claimedReward.expiresAt || null } : null,
      welcomeUsed,
      deliveryCharge,
      total,
      status: "new",
      orderType,
      source: "website",
      pointsStatus: orderType === "pickup" ? "pending-completion" : "pending-delivery",
      createdAt: FieldValue.serverTimestamp()
    });
    if (requestedPoints || loyaltyRewardTicketId || welcomeUsed) {
      transaction.set(accountRef, {
        uid,
        points: balance - requestedPoints,
        availableRewards: remainingRewards,
        ...(welcomeUsed ? { welcomeReservationId: orderRef.id } : {}),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    const response = { orderId: orderRef.id, orderNumber, subtotal, discountAmount: totalDiscount, deliveryCharge, total, pointsRedeemed: requestedPoints, addressSaved, items: pricedItems };
    transaction.create(requestRef, { uid, orderId: orderRef.id, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
  return result;
});

exports.staffListOrders = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const dateKey = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const mumbaiToday = mumbaiDateKey();
  const startKey = dateKey(request.data?.startDate) || mumbaiToday;
  const endKey = dateKey(request.data?.endDate) || startKey;
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd) - 330 * 60 * 1000);
  const end = new Date(Date.UTC(ey, em - 1, ed + 1) - 330 * 60 * 1000);
  const startValid = [start.getUTCFullYear(), String(start.getUTCMonth() + 1).padStart(2, "0"), String(start.getUTCDate()).padStart(2, "0")].join("-") === startKey;
  const endDate = new Date(Date.UTC(ey, em - 1, ed));
  const endValid = [endDate.getUTCFullYear(), String(endDate.getUTCMonth() + 1).padStart(2, "0"), String(endDate.getUTCDate()).padStart(2, "0")].join("-") === endKey;
  const requestedDays = (end.getTime() - start.getTime()) / 86400000;
  if (!startValid || !endValid || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || startKey > endKey || requestedDays > 366) {
    throw new HttpsError("invalid-argument", "Choose a valid date range of 366 days or less.");
  }
  const snapshot = await db.collection("orders")
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  return {
    startDate: startKey,
    endDate: endKey,
    truncated: snapshot.size === 500,
    orders: snapshot.docs.map(document => {
      const order = document.data();
      return {
        id: document.id,
        orderNumber: String(order.orderNumber || ""),
        customerName: String(order.customerName || "Customer"),
        mobile: String(order.mobile || ""),
        address: String(order.address || ""),
        addressLabel: String(order.addressLabel || ""),
        landmark: String(order.landmark || ""),
        area: String(order.area || ""),
        items: Array.isArray(order.items) ? order.items : [],
        subtotal: Number(order.subtotal || 0),
        discountAmount: Number(order.discountAmount || 0),
        deliveryCharge: Number(order.deliveryCharge || 0),
        total: Number(order.total || 0),
        paymentMethod: String(order.paymentMethod || ""),
        paymentStatus: String(order.paymentStatus || "pending"),
        amountPaid: Number(order.amountPaid || (String(order.paymentStatus || "").toLowerCase() === "paid" ? order.total || 0 : 0)),
        balanceDue: Number(order.balanceDue ?? (String(order.paymentStatus || "pending").toLowerCase() === "paid" ? 0 : order.total || 0)),
        status: String(order.status || "new"),
        pointsToAward: Number(order.pointsToAward || 0),
        loyaltyLinked: Boolean(order.uid),
        source: String(order.source || "website"),
        orderType: String(order.orderType || "delivery"),
        createdAt: order.createdAt?.toDate?.().toISOString?.() || null
      };
    })
  };
});

exports.staffGetTodaySales = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const part = type => parts.find(value => value.type === type)?.value;
  const dayKey = `${part("year")}-${part("month")}-${part("day")}`;
  const [year, month, day] = dayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const snapshot = await db.collection("orders")
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .get();
  const totals = {
    date: dayKey,
    timezone: "Asia/Kolkata",
    total: { sales: 0, orders: 0 },
    online: { sales: 0, orders: 0 },
    walkIn: { sales: 0, orders: 0 }
  };
  for (const document of snapshot.docs) {
    const order = document.data();
    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) continue;
    const channel = order.source === "walk-in" ? totals.walkIn : totals.online;
    const amount = Math.max(0, Number(order.total || 0));
    totals.total.sales += amount;
    totals.total.orders += 1;
    channel.sales += amount;
    channel.orders += 1;
  }
  return totals;
});

exports.staffLookupCustomer = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  if (!mobile) throw new HttpsError("invalid-argument", "Enter a valid Indian mobile number.");
  let user;
  try {
    user = await getAuth().getUserByPhoneNumber(mobile);
  } catch (error) {
    if (error.code === "auth/user-not-found") return { found: false };
    console.error("Could not look up customer account by phone", error);
    throw new HttpsError("unavailable", "Customer lookup is temporarily unavailable.");
  }
  const [profileSnapshot, loyaltySnapshot, orderSnapshot] = await Promise.all([
    db.collection("customerProfiles").doc(user.uid).get(),
    db.collection("loyaltyAccounts").doc(user.uid).get(),
    db.collection("orders").where("uid", "==", user.uid).limit(20).get()
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const loyalty = loyaltySnapshot.exists ? loyaltySnapshot.data() : {};
  const availableRewards = Array.isArray(loyalty.availableRewards) ? loyalty.availableRewards : [];
  const activeRewards = availableRewards
    .filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now())
    .sort((left, right) => timestampMillis(left.issuedAt) - timestampMillis(right.issuedAt));
  const completedOrders = Math.max(0, Number(loyalty.completedOrders || 0));
  const cycleOrder = completedOrders === 0 ? 0 : ((completedOrders - 1) % 30) + 1;
  const previewOrder = cycleOrder === 30 ? 0 : cycleOrder;
  const activeRewardIds = new Set(activeRewards.map(reward => reward.id));
  const rewardConfig = (await readBusinessConfig()).rewards;
  const upcomingRewards = rewardConfig.journey.filter(reward => reward.id && reward.order > previewOrder && !activeRewardIds.has(reward.id)).slice(0, 2);
  const recentOrderName = [...orderSnapshot.docs]
    .sort((left, right) => timestampMillis(right.data().createdAt) - timestampMillis(left.data().createdAt))
    .map(document => String(document.data().customerName || "").trim())
    .find(name => name.length >= 2);
  return {
    found: true,
    name: String(profile.name || user.displayName || recentOrderName || "").slice(0, 80),
    points: Math.max(0, Number(loyalty.points || 0)),
    completedOrders,
    availableRewards: activeRewards.map(reward => {
      const definition = rewardConfig.rewardById[reward.id] || reward;
      const expiry = reward.expiresAt ? timestampMillis(reward.expiresAt) : 0;
      return {
        ticketId: String(reward.ticketId || reward.id || ""),
        id: String(reward.id || ""),
        kind: String(definition.kind || reward.kind || ""),
        title: String(definition.title || reward.title || "Reward"),
        detail: String(definition.detail || reward.detail || "Ready to use"),
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
        minimum: Number(definition.minimum || 0),
        amount: Number(definition.amount || 0),
        item: String(definition.item || ""),
        percent: Number(definition.percent || 0),
        maxDiscount: Number(definition.maxDiscount || 0),
        itemPrice: Number(definition.itemPrice || 0),
        points: Number(definition.points || 0),
        maxBonusPoints: Number(definition.maxBonusPoints || 0),
        issuedAt: timestampMillis(reward.issuedAt)
      };
    }),
    upcomingRewards: upcomingRewards.map(reward => ({ order: reward.order, title: reward.title, detail: reward.detail }))
  };
});

exports.staffUpdateOrderStatus = onCall({ region: REGION, cpu: "gcf_gen1", maxInstances: 10 }, async request => {
  await requireStaff(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  const nextStatus = typeof request.data?.status === "string" ? request.data.status : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Choose a valid order.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snapshot.data();
    const currentStatus = String(order.status || "new").toLowerCase();
    const finishStatus = order.source === "walk-in" || order.orderType === "pickup" ? "completed" : "delivered";
    const allowedNext = {
      new: ["preparing", finishStatus, "cancelled"],
      preparing: ["ready", finishStatus, "cancelled"],
      ready: [finishStatus, "cancelled"]
    };
    if (!allowedNext[currentStatus]?.includes(nextStatus)) {
      throw new HttpsError("failed-precondition", "That status change is no longer available. Refresh the order list.");
    }
    transaction.update(orderRef, { status: nextStatus, updatedAt: FieldValue.serverTimestamp() });
    return { orderId, status: nextStatus };
  });
});

exports.staffMarkOrderPaid = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Choose a valid order.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snapshot.data();
    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) {
      throw new HttpsError("failed-precondition", "Cancelled orders cannot be marked as paid.");
    }
    if (String(order.paymentStatus || "pending").toLowerCase() !== "pending") {
      throw new HttpsError("failed-precondition", "This order is already marked as paid.");
    }
    transaction.update(orderRef, {
      paymentStatus: "paid",
      amountPaid: Number(order.total || 0),
      balanceDue: 0,
      paymentReceivedAt: FieldValue.serverTimestamp(),
      paymentRecordedBy: staffUid,
      updatedAt: FieldValue.serverTimestamp()
    });
    return { orderId, paymentStatus: "paid" };
  });
});

exports.staffAddItemsToWalkInOrder = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  const requestId = typeof request.data?.requestId === "string" ? request.data.requestId : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId) || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Choose a valid walk-in order and retry the item update.");
  }
  const config = await readBusinessConfig();
  const additions = validateAndPriceItems(
    Array.isArray(request.data?.items) ? request.data.items.map(item => ({ name: item?.name, qty: item?.qty })) : [],
    config.menu,
    config.combos
  );
  const orderRef = db.collection("orders").doc(orderId);
  const requestRef = db.collection("orderRequests").doc(`staff_add_${staffUid}_${requestId}`);
  return db.runTransaction(async transaction => {
    const [requestSnapshot, orderSnapshot] = await Promise.all([transaction.get(requestRef), transaction.get(orderRef)]);
    if (requestSnapshot.exists) return requestSnapshot.data().response;
    if (!orderSnapshot.exists) throw new HttpsError("not-found", "Walk-in order not found.");
    const order = orderSnapshot.data();
    if (order.source !== "walk-in" || !["new", "preparing", "ready"].includes(String(order.status || "new").toLowerCase())) {
      throw new HttpsError("failed-precondition", "Items can only be added while the walk-in order is still active.");
    }
    const oldItems = Array.isArray(order.items) ? order.items : [];
    if (oldItems.length + additions.pricedItems.length > 50) throw new HttpsError("failed-precondition", "This order has reached its item limit.");
    const items = [...oldItems, ...additions.pricedItems];
    if (items.reduce((sum, item) => sum + Math.max(0, Number(item.qty || 0)), 0) > 100) {
      throw new HttpsError("failed-precondition", "This order has reached its quantity limit.");
    }
    const subtotal = Number(order.subtotal || 0) + additions.subtotal;
    const eligibleSubtotal = Number(order.eligibleSubtotal || 0) + additions.eligibleSubtotal;
    const total = Number(order.total || 0) + additions.subtotal;
    const oldTotal = Number(order.total || 0);
    const previouslyPaid = Math.max(0, Number(order.amountPaid ?? (String(order.paymentStatus || "").toLowerCase() === "paid" ? oldTotal : 0)));
    const amountPaid = Math.min(total, previouslyPaid);
    const balanceDue = Math.max(0, total - amountPaid);
    const extras = new Set((config.menu.extras?.items || []).map(item => item.name));
    let regularPointSubtotal = 0;
    let comboPointSubtotal = 0;
    for (const item of items) {
      const lineTotal = Math.max(0, Number(item.price || 0)) * Math.max(0, Number(item.qty || 0));
      if (item.isCombo) comboPointSubtotal += lineTotal;
      else if (!extras.has(item.name) && !item.isFreeOffer && !item.isLoyaltyReward) regularPointSubtotal += lineTotal;
    }
    const pointsConfig = config.rewards;
    const basePoints = order.uid
      ? Math.floor(Math.max(0, regularPointSubtotal - Number(order.discountAmount || 0)) / pointsConfig.pointRateRegularRupees)
        + Math.floor(comboPointSubtotal / pointsConfig.pointRateComboRupees)
      : 0;
    const reward = order.claimedReward?.id ? pointsConfig.rewardById[order.claimedReward.id] : null;
    const pointsToAward = (reward?.kind === "double-points"
      ? basePoints + Math.min(basePoints, Number(reward.maxBonusPoints || 0))
      : basePoints) + (reward?.kind === "bonus-points" ? Number(reward.points || 0) : 0);
    const update = {
      items, subtotal, eligibleSubtotal, total, amountPaid, balanceDue,
      paymentStatus: balanceDue === 0 ? "paid" : "pending",
      pointsToAward,
      updatedAt: FieldValue.serverTimestamp(),
      lastItemAdditionAt: FieldValue.serverTimestamp(),
      lastItemAdditionBy: staffUid
    };
    transaction.update(orderRef, update);
    const response = { orderId, orderNumber: String(order.orderNumber || ""), items, subtotal, eligibleSubtotal, total, amountPaid, balanceDue, paymentStatus: update.paymentStatus, pointsToAward };
    transaction.create(requestRef, { staffUid, orderId, addedItems: additions.pricedItems, addedSubtotal: additions.subtotal, previousTotal: oldTotal, newTotal: total, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
});

exports.createWalkInOrder = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  const data = request.data || {};
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "Walk-in customer";
  const rawMobile = typeof data.mobile === "string" ? data.mobile.trim() : "";
  const mobile = rawMobile ? normalizeIndianMobile(rawMobile) : "";
  const paymentMethod = typeof data.paymentMethod === "string" ? data.paymentMethod : "";
  const paymentStatus = typeof data.paymentStatus === "string" ? data.paymentStatus : "";
  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (customerName.length < 2 || customerName.length > 80) {
    throw new HttpsError("invalid-argument", "Enter a customer name (2 to 80 characters).");
  }
  if (rawMobile && !mobile) {
    throw new HttpsError("invalid-argument", "Enter a valid mobile number or leave it blank.");
  }
  if (!["Cash", "UPI"].includes(paymentMethod) || !["paid", "pending"].includes(paymentStatus)) {
    throw new HttpsError("invalid-argument", "Choose a valid payment method and payment status.");
  }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Order reference is missing. Please retry.");
  }
  const businessConfig = await readBusinessConfig();
  const rewardConfig = businessConfig.rewards;
  const priceByName = buildPriceByName(businessConfig.menu, businessConfig.combos);
  const { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal } = validateAndPriceItems(data.items, businessConfig.menu, businessConfig.combos);
  let customerUid = null;
  if (mobile) {
    try {
      customerUid = (await getAuth().getUserByPhoneNumber(mobile)).uid;
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        console.error("Could not match walk-in phone to a customer account", error);
        throw new HttpsError("unavailable", "Could not verify the customer account. Please retry the order.");
      }
    }
  }
  const orderRef = db.collection("orders").doc();
  const requestRef = db.collection("orderRequests").doc(`staff_${staffUid}_${requestId}`);
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(requestRef);
    if (existing.exists) return existing.data().response;
    const accountRef = customerUid ? db.collection("loyaltyAccounts").doc(customerUid) : null;
    const accountSnapshot = accountRef ? await transaction.get(accountRef) : null;
    const account = accountSnapshot?.exists ? accountSnapshot.data() : {};
    const balance = Math.max(0, Number(account.points || 0));
    const availableRewards = Array.isArray(account.availableRewards) ? account.availableRewards : [];
    const requestedPoints = Number(data.redeemPoints || 0);
    const loyaltyRewardTicketId = typeof data.loyaltyRewardId === "string" ? data.loyaltyRewardId : "";
    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0 || requestedPoints > rewardConfig.maxRedeemPointsPerOrder || requestedPoints % 100 !== 0) {
      throw new HttpsError("invalid-argument", "Redeem Craving Points in 100-point steps, up to 1,000 per order.");
    }
    if ((requestedPoints || loyaltyRewardTicketId) && !customerUid) {
      throw new HttpsError("failed-precondition", "Enter the mobile number linked to the customer's website account to use loyalty benefits.");
    }
    if (requestedPoints && (requestedPoints > balance || loyaltyRewardTicketId)) {
      throw new HttpsError("failed-precondition", "Use Craving Points alone, and check the customer's balance.");
    }

    let claimedReward = null;
    let loyaltyReward = null;
    let discountAmount = 0;
    let deliveryReward = false;
    let pointsBonus = 0;
    let pointsMultiplier = 1;
    if (loyaltyRewardTicketId) {
      claimedReward = availableRewards.find(reward => reward.ticketId === loyaltyRewardTicketId || (!reward.ticketId && reward.id === loyaltyRewardTicketId));
      const isGameVoucher = claimedReward?.source === "craving-dash" && ["free-item", "percent-discount"].includes(claimedReward.kind);
      loyaltyReward = isGameVoucher
        ? { kind: claimedReward.kind, title: claimedReward.title, detail: claimedReward.detail, item: claimedReward.item, percent: Number(claimedReward.percent || 0), maxDiscount: Number(claimedReward.maxDiscount || 0), minimum: Number(claimedReward.minimum || 0) }
        : claimedReward ? rewardConfig.rewardById[claimedReward.id] : null;
      if (!loyaltyReward || requestedPoints) throw new HttpsError("failed-precondition", "This reward is no longer available or cannot be combined with points.");
      const activeRewards = availableRewards.filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now());
      const oldestReward = activeRewards.sort((a, b) => timestampMillis(a.issuedAt) - timestampMillis(b.issuedAt))[0];
      if (!oldestReward || (oldestReward.ticketId || oldestReward.id) !== loyaltyRewardTicketId) {
        throw new HttpsError("failed-precondition", "Use the oldest available Royal Rewards benefit first.");
      }
      if (claimedReward.expiresAt && timestampMillis(claimedReward.expiresAt) <= Date.now()) {
        throw new HttpsError("failed-precondition", "This reward has expired. Choose another available reward.");
      }
      if (loyaltyReward.kind === "free-delivery") {
        throw new HttpsError("failed-precondition", "Free delivery rewards can be used on website delivery orders, not counter orders.");
      }
      if (eligibleSubtotal < Number(loyaltyReward.minimum || 0)) {
        throw new HttpsError("failed-precondition", `Add ${Math.max(0, Number(loyaltyReward.minimum) - eligibleSubtotal)} more in regular menu items to use this reward. Combos do not count toward spend rewards.`);
      }
      if (loyaltyReward.kind === "discount") discountAmount = Number(loyaltyReward.amount || 0);
      if (loyaltyReward.kind === "percent-discount") {
        const percent = Number(loyaltyReward.percent), cap = Number(loyaltyReward.maxDiscount || 0);
        if (!isGameVoucher || !Number.isSafeInteger(percent) || percent < 1 || percent > 100 || !Number.isSafeInteger(cap) || cap < 0 || cap > 10000) throw new HttpsError("failed-precondition", "This game discount reward is not valid.");
        discountAmount = Math.min(Math.floor(eligibleSubtotal * percent / 100), cap > 0 ? cap : eligibleSubtotal);
        if (discountAmount <= 0) throw new HttpsError("failed-precondition", "Add eligible regular menu items before using this percentage reward.");
      }
      if (loyaltyReward.kind === "bonus-points") pointsBonus = Number(loyaltyReward.points || 0);
      if (loyaltyReward.kind === "double-points") pointsMultiplier = 2;
      if (loyaltyReward.kind === "free-item") {
        const itemPrice = priceByName.get(loyaltyReward.item);
        if (!Number.isSafeInteger(itemPrice) || itemPrice <= 0) throw new HttpsError("failed-precondition", "This reward item is unavailable.");
        if (isGameVoucher && !gameRewardItemNames(businessConfig.menu, businessConfig.combos).includes(loyaltyReward.item)) throw new HttpsError("failed-precondition", "This game reward item is no longer eligible in the menu.");
        const isComboReward = (businessConfig.combos || []).some(combo => combo.name === loyaltyReward.item);
        pricedItems.push({ name: loyaltyReward.item, price: 0, qty: 1, isCombo: isComboReward, isFreeOffer: false, isLoyaltyReward: true, loyaltyRewardId: loyaltyRewardTicketId, lineTotal: 0 });
      }
    }
    const pointsDiscount = requestedPoints / rewardConfig.pointsPerRedemptionRupees * 10;
    if (pointsDiscount > eligibleSubtotal) throw new HttpsError("failed-precondition", "Craving Points cannot reduce the eligible food subtotal below zero.");
    const totalDiscount = discountAmount + pointsDiscount;
    const total = Math.max(0, subtotal - totalDiscount);
    const regularSpentForPoints = Math.max(0, regularPointSubtotal - discountAmount - pointsDiscount);
    const basePoints = customerUid
      ? Math.floor(regularSpentForPoints / rewardConfig.pointRateRegularRupees) + Math.floor(comboPointSubtotal / rewardConfig.pointRateComboRupees)
      : 0;
    const pointsToAward = (pointsMultiplier === 2 ? basePoints + Math.min(basePoints, Number(loyaltyReward?.maxBonusPoints || 0)) : basePoints) + pointsBonus;
    const remainingRewards = loyaltyRewardTicketId
      ? availableRewards.filter(reward => reward.ticketId !== loyaltyRewardTicketId && !(!reward.ticketId && reward.id === loyaltyRewardTicketId))
      : availableRewards;

    const orderNumber = await reserveOrderNumber(transaction, "walk-in", "walk-in");
    const order = {
      orderNumber,
      uid: customerUid,
      customerName,
      mobile,
      address: "",
      landmark: "",
      area: "",
      paymentMethod,
      paymentStatus,
      amountPaid: paymentStatus === "paid" ? total : 0,
      balanceDue: paymentStatus === "paid" ? 0 : total,
      items: pricedItems,
      subtotal,
      eligibleSubtotal,
      discountAmount: totalDiscount,
      discountType: loyaltyReward?.kind || (requestedPoints ? "points" : "none"),
      deliveryCharge: 0,
      total,
      status: "new",
      source: "walk-in",
      orderType: "walk-in",
      createdBy: staffUid,
      pointsToAward,
      pointsRedeemed: requestedPoints,
      pointsDiscount,
      claimedRewardId: loyaltyRewardTicketId || null,
      claimedReward: loyaltyRewardTicketId ? { ticketId: loyaltyRewardTicketId, id: claimedReward.id, kind: loyaltyReward.kind, title: claimedReward.title, expiresAt: claimedReward.expiresAt || null } : null,
      pointsStatus: customerUid ? "pending-delivery" : "not-applicable",
      createdAt: FieldValue.serverTimestamp()
    };
    transaction.create(orderRef, order);
    if (requestedPoints || loyaltyRewardTicketId) {
      transaction.set(accountRef, {
        uid: customerUid,
        points: balance - requestedPoints,
        availableRewards: remainingRewards,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    const amountPaid = paymentStatus === "paid" ? total : 0;
    const response = { orderId: orderRef.id, orderNumber, subtotal, discountAmount: totalDiscount, pointsDiscount, total, amountPaid, balanceDue: total - amountPaid, paymentStatus, pointsRedeemed: requestedPoints, loyaltyLinked: Boolean(customerUid), pointsToAward, benefitTitle: loyaltyReward?.title || (requestedPoints ? `${requestedPoints} Craving Points` : ""), items: pricedItems };
    transaction.create(requestRef, { orderId: orderRef.id, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
});

// Keep the deployed trigger's stable name so a deploy updates the existing
// production trigger instead of creating a second points-awarding trigger.
exports.onOrderStatusChanged = onDocumentUpdated({ document: "orders/{orderId}", region: REGION }, async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || !["website", "walk-in"].includes(after.source) || !after.uid) return;

  const accountRef = db.collection("loyaltyAccounts").doc(after.uid);
  const entryRef = accountRef.collection("entries").doc(event.params.orderId);
  const isLoyaltyComplete = order => order.source === "walk-in" || order.orderType === "pickup"
    ? ["completed", "delivered"].includes(String(order.status || "").toLowerCase())
    : String(order.status || "").toLowerCase() === "delivered";
  const becameDelivered = !isLoyaltyComplete(before) && isLoyaltyComplete(after);
  const becameCancelled = !["cancelled", "canceled"].includes(String(before.status || "").toLowerCase()) && ["cancelled", "canceled"].includes(String(after.status || "").toLowerCase());
  if (!becameDelivered && !becameCancelled) return;
  const rewardConfig = (await readBusinessConfig()).rewards;
  await db.runTransaction(async transaction => {
    const [orderSnapshot, entrySnapshot, accountSnapshot] = await Promise.all([
      transaction.get(event.data.after.ref), transaction.get(entryRef), transaction.get(accountRef)
    ]);
    if (!orderSnapshot.exists) return;
    const order = orderSnapshot.data();
    const account = accountSnapshot.exists ? accountSnapshot.data() : {};
    const points = Math.max(0, Number(order.pointsToAward || 0));
    if (becameDelivered) {
      if (entrySnapshot.exists) return;
      const completedOrders = Math.max(0, Number(account.completedOrders || 0)) + 1;
      // The welcome offer is first-order only; later cycles continue at journey order 2.
      const step = completedOrders === 1 ? 1 : ((completedOrders - 2) % 29) + 2;
      const milestone = rewardConfig.journey.find(item => item.order === step && item.id);
      const availableRewards = Array.isArray(account.availableRewards) ? [...account.availableRewards] : [];
      if (milestone) {
        availableRewards.push({
          ticketId: `${event.params.orderId}-${milestone.id}`,
          id: milestone.id,
          order: milestone.order,
          title: milestone.title,
          detail: milestone.detail,
          expiresAt: milestone.kind === "free-item" ? new Date(Date.now() + rewardConfig.freeItemExpiryDays * 86400000) : null,
          issuedAt: new Date()
        });
      }
      const currentPoints = Math.max(0, Number(account.points || 0));
      transaction.set(entryRef, { orderId: event.params.orderId, points, amount: Number(order.subtotal || 0), reason: "delivered-order", createdAt: FieldValue.serverTimestamp() });
      transaction.set(accountRef, {
        uid: order.uid,
        points: currentPoints + points,
        totalEarned: Math.max(0, Number(account.totalEarned || 0)) + points,
        totalRedeemed: Math.max(0, Number(account.totalRedeemed || 0)) + Number(order.pointsRedeemed || 0),
        completedOrders,
        availableRewards,
        ...(order.welcomeUsed ? { welcomeCompleted: true, welcomeReservationId: FieldValue.delete() } : {}),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.update(event.data.after.ref, { pointsStatus: "awarded", pointsAwarded: points, rewardsJourneyOrder: completedOrders });
      return;
    }
    if (order.loyaltyReversed) return;
    const availableRewards = Array.isArray(account.availableRewards) ? [...account.availableRewards] : [];
    if (order.claimedRewardId && order.claimedReward && !availableRewards.some(item => item.ticketId === order.claimedRewardId)) {
      const definition = rewardConfig.rewardById[order.claimedReward.id];
      const expired = order.claimedReward.expiresAt && timestampMillis(order.claimedReward.expiresAt) <= Date.now();
      if (definition && !expired) availableRewards.push({ ...order.claimedReward, order: definition.order, detail: definition.detail, expiresAt: order.claimedReward.expiresAt || null });
    }
    transaction.set(accountRef, {
      uid: order.uid,
      points: Math.max(0, Number(account.points || 0)) + Number(order.pointsRedeemed || 0),
      availableRewards,
      ...(order.welcomeUsed ? { welcomeReservationId: FieldValue.delete() } : {}),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.update(event.data.after.ref, { loyaltyReversed: true });
  });
});
