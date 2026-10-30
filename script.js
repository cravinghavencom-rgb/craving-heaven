document.addEventListener("DOMContentLoaded", async () => {
const REWARDS_CONFIG = window.CRAVING_REWARDS || { journey: [], rewardById: {} };
const REWARD_EXCLUDED_NAMES = new Set((MENU_DATA.extras?.items || []).map(item => item.name));
let menuInitialized = false;
let welcomeFlyerShownThisPage = false;
let customerOnlineOrderHistoryLoaded = false;
let customerAuthStateResolved = false;
let customerSessionType = "signed-out";
let customerSessionUid = "";
let customerAuthResolutionId = 0;
function isCustomerSignedIn() {
  const currentUid = window.firebaseAuth?.currentUser?.uid || "";
  return customerSessionType === "customer" && Boolean(currentUid) && currentUid === customerSessionUid;
}
function currentCustomerUser() {
  return isCustomerSignedIn() ? window.firebaseAuth.currentUser : null;
}
function applyRemoteBusinessConfig(data) {
  if (!data || !data.menu || !Array.isArray(data.combos) || !data.rewards) return false;
  for (const key of Object.keys(MENU_DATA)) delete MENU_DATA[key];
  Object.assign(MENU_DATA, data.menu);
  COMBO_MENU_DATA.splice(0, COMBO_MENU_DATA.length, ...data.combos);
  Object.assign(REWARDS_CONFIG, data.rewards, { rewardById: Object.fromEntries((data.rewards.journey || []).filter(reward => reward.id).map(reward => [reward.id, reward])) });
  REWARD_EXCLUDED_NAMES.clear();
  for (const item of MENU_DATA.extras?.items || []) REWARD_EXCLUDED_NAMES.add(item.name);
  return true;
}
async function fetchRemoteBusinessConfig() {
  try {
    const callable = window.FirebaseFunctionsAPI?.httpsCallable;
    if (!callable || !window.firebaseFunctions) return null;
    const response = await callable(window.firebaseFunctions, "getPublicBusinessConfig")({});
    return response.data || null;
  } catch (error) {
    console.warn("Could not load the latest menu and reward settings:", error);
    return null;
  }
}
const BUSINESS_CONFIG_CACHE_KEY = "cravingHeavenBusinessConfig_v1";
try {
  const cachedBusinessConfig = JSON.parse(localStorage.getItem(BUSINESS_CONFIG_CACHE_KEY) || "null");
  if (cachedBusinessConfig?.savedAt && Date.now() - cachedBusinessConfig.savedAt < 24 * 60 * 60 * 1000) {
    applyRemoteBusinessConfig(cachedBusinessConfig.data);
  }
} catch (_) { /* The bundled menu remains available when browser storage is disabled. */ }
function syncFirstVisitFlyerReward() {
  const flyer = document.getElementById("firstVisitFlyer");
  if (!flyer) return;
  const welcomeItem = String(REWARDS_CONFIG.welcomeItem || "Classic Crunchy Burger");
  const menuItem = Object.values(MENU_DATA).flatMap(section => section.items || [])
    .flatMap(item => item.options || [item]).find(item => item.name === welcomeItem);
  const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  const formatRupees = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const image = document.getElementById("firstVisitFlyerImage");
  const emblem = document.getElementById("firstVisitFlyerEmblem");
  const burger = /classic crunchy burger/i.test(welcomeItem);
  const visual = document.querySelector("#firstVisitFlyer .first-visit-flyer-art");
  if (image) { image.hidden = !burger; image.alt = burger ? welcomeItem : ""; }
  if (emblem) emblem.hidden = burger;
  if (visual) visual.classList.toggle("has-food-image", burger);
  setText("firstVisitFlyerValue", `${formatRupees(menuItem?.price)} VALUE`);
  setText("firstVisitFlyerReward", `${welcomeItem} · FREE`);
  setText("firstVisitFlyerTitle", "Your first order gets a free burger!");
  setText("firstVisitFlyerDescription", `Add any regular menu item to your first online order and get a ${welcomeItem} free.`);
  setText("firstVisitFlyerFoot", "FIRST ONLINE ORDER · ONE GIFT PER CUSTOMER");
}
syncFirstVisitFlyerReward();
function hasLocalWelcomeOrderMarker() {
  if (isCustomerSignedIn()) return false;
  try {
    const previousUid = localStorage.getItem("cravingHeavenLastCustomerUid_v1");
    return Boolean(previousUid && localStorage.getItem(`cravingHeavenWelcomeOrderPlaced_${previousUid}`) === "1");
  } catch (_) { return false; }
}
function maybeShowFirstOrderFlyer() {
  const flyer = document.getElementById("firstVisitFlyer");
  if (!flyer || flyer.open || welcomeFlyerShownThisPage || !customerAuthStateResolved || orderAvailability?.isTestCustomer) return;
  const account = currentLoyaltyAccount || {};
  const welcomeAlreadyUsed = account.welcomeCompleted === true || Boolean(account.welcomeReservationId) || customerHasOrderedOnline || hasLocalWelcomeOrderMarker();
  if (isCustomerSignedIn() && (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded)) return;
  if (welcomeAlreadyUsed) {
    if (flyer.open) flyer.close();
    return;
  }
  flyer.showModal();
  welcomeFlyerShownThisPage = true;
}
const businessConfigPromise = fetchRemoteBusinessConfig();
businessConfigPromise.then(data => {
  if (data && applyRemoteBusinessConfig(data)) {
    syncFirstVisitFlyerReward();
    try { localStorage.setItem(BUSINESS_CONFIG_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) { /* Remote config still works without a local cache. */ }
    if (!menuInitialized) return;
    cart = loadCart();
    render();
  }
});
const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_CHARGE = 30;
const ONLINE_CHECKOUT_ENABLED = true;
let orderAvailability = { isOpen: false, paused: false, staffEnabled: false, acceptingOnlineOrders: false, testModeEnabled: false, isTestCustomer: false };
let orderAvailabilityReady = false;
// =========================================================
// FIREBASE PUSH NOTIFICATIONS
// =========================================================

const FCM_VAPID_KEY =
  "BGjzTqS6rjlc-8MfakmsJTYx3VJoMJSayf6WnhkbjAQqvgUmptPscqTLFThnFPjbrLGU0xNVbhd7QiL4bjmeepY";

// ====================== FREE OFFERS ======================
  // =========================================================
  // CUSTOMER PHONE LOGIN / FIREBASE OTP
  // =========================================================

  const customerLoginOverlay = document.getElementById("customerLoginOverlay");
  const customerLoginClose = document.getElementById("customerLoginClose");

  const phoneLoginStep = document.getElementById("phoneLoginStep");
  const otpLoginStep = document.getElementById("otpLoginStep");

  const customerPhone = document.getElementById("customerPhone");
  const customerOtp = document.getElementById("customerOtp");

  const sendOtpButton = document.getElementById("sendOtpButton");
  const verifyOtpButton = document.getElementById("verifyOtpButton");
  const resendOtpButton = document.getElementById("resendOtpButton");
  const changePhoneButton = document.getElementById("changePhoneButton");

  const customerLoginMessage =
    document.getElementById("customerLoginMessage");
  const localDemoLogin = document.getElementById("localDemoLogin");
  const localDemoLoginMessage = document.getElementById("localDemoLoginMessage");

  const otpLoginMessage =
    document.getElementById("otpLoginMessage");

  const placeOrderButton = document.getElementById("placeOrderButton");

  let confirmationResult = null;
  let recaptchaVerifier = null;
  let recaptchaWidgetSequence = 0;

  if (localDemoLogin && window.useLocalFirebaseEmulators === true) {
    localDemoLogin.hidden = false;
  }

  localDemoLogin?.querySelectorAll("[data-demo-customer]").forEach(button => {
    button.addEventListener("click", async () => {
      if (window.useLocalFirebaseEmulators !== true) return;
      const customerNumber = Number(button.dataset.demoCustomer);
      const buttons = [...localDemoLogin.querySelectorAll("[data-demo-customer]")];
      buttons.forEach(item => { item.disabled = true; });
      if (localDemoLoginMessage) localDemoLoginMessage.textContent = "Opening local demo account…";
      try {
        await window.firebaseAuthPersistenceReady;
        const createSession = window.FirebaseFunctionsAPI.httpsCallable(
          window.firebaseFunctions,
          "localDemoCustomerSession"
        );
        const response = await createSession({ customerNumber });
        await window.FirebaseAuthAPI.signInWithCustomToken(
          window.firebaseAuth,
          response.data.customToken
        );
        updatePlaceOrderButton();
        refreshAccountScreens(window.firebaseAuth.currentUser);
        closeCustomerLogin();
      } catch (error) {
        console.error("Local demo sign-in failed:", error);
        if (localDemoLoginMessage) {
          localDemoLoginMessage.textContent = error?.message || "Could not open this local demo account.";
        }
      } finally {
        buttons.forEach(item => { item.disabled = false; });
      }
    });
  });


  // ---------------------------------------------------------
  // FIREBASE AUTHENTICATION CHECK
  // ---------------------------------------------------------

  function firebaseAuthReady() {
    return (
      window.firebaseAuth &&
      window.FirebaseAuthAPI &&
      window.FirebaseAuthAPI.RecaptchaVerifier &&
      window.FirebaseAuthAPI.signInWithPhoneNumber &&
      window.FirebaseAuthAPI.onAuthStateChanged
    );
  }


  // ---------------------------------------------------------
  // CUSTOMER LOGIN POPUP
  // ---------------------------------------------------------

  function openCustomerLogin() {
    if (!customerLoginOverlay) return;

    // Each login attempt gets a fresh verifier and a fresh DOM target. This
    // avoids Firebase reusing an already-rendered invisible reCAPTCHA after
    // the customer changes their phone number or reopens the login dialog.
    confirmationResult = null;
    resetRecaptcha();

    customerLoginOverlay.classList.add("open");
    customerLoginOverlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("customer-login-open");

    resetCustomerLoginMessages();

    phoneLoginStep.hidden = false;
    otpLoginStep.hidden = true;

    customerOtp.value = "";

    setTimeout(() => {
      customerPhone.focus();
    }, 100);
  }
  window.requestCustomerLogin = openCustomerLogin;


  function closeCustomerLogin() {
    if (!customerLoginOverlay) return;

    if (customerLoginOverlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    customerLoginOverlay.classList.remove("open");
    customerLoginOverlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("customer-login-open");

    confirmationResult = null;
    resetRecaptcha();
  }

  // Keep every customer surface (cart, checkout, rewards, profile and orders)
  // bound to the same resolved Firebase Auth user.
  function setCustomerSession(user, type) {
    customerAuthResolutionId += 1;
    customerSessionType = type;
    customerSessionUid = type === "customer" ? (user?.uid || "") : "";
    customerAuthStateResolved = true;
  }

  async function waitForCustomerAuthResolution(timeoutMs = 8000) {
    try { await window.firebaseAuthPersistenceReady; } catch (_) { /* Fall through to the timeout result. */ }
    const startedAt = Date.now();
    while (!customerAuthStateResolved && Date.now() - startedAt < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return customerAuthStateResolved;
  }


  function resetCustomerLoginMessages() {
    if (customerLoginMessage) {
      customerLoginMessage.textContent = "";
    }

    if (otpLoginMessage) {
      otpLoginMessage.textContent = "";
    }
  }


  // ---------------------------------------------------------
  // PHONE NUMBER VALIDATION
  // ---------------------------------------------------------

  function getCustomerPhoneNumber() {
    const rawPhone = customerPhone.value.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      throw new Error(
        "Please enter a valid 10-digit Indian mobile number."
      );
    }

    return `+91${rawPhone}`;
  }


  // ---------------------------------------------------------
  // CREATE FIREBASE reCAPTCHA
  // ---------------------------------------------------------

  function createRecaptcha() {
    if (!firebaseAuthReady()) {
      throw new Error(
        "Firebase Authentication is not ready. Please refresh the page and try again."
      );
    }

    if (recaptchaVerifier) return recaptchaVerifier;

    const recaptchaHost = document.getElementById("recaptcha-container");
    if (!recaptchaHost) throw new Error("Secure login could not start. Refresh the page and try again.");
    // Give every attempt a new element reference and unique ID. Firebase's
    // invisible widget can retain its render state on a reused DOM target.
    const widgetContainer = document.createElement("div");
    widgetContainer.id = `customer-recaptcha-widget-${++recaptchaWidgetSequence}`;
    recaptchaHost.replaceChildren(widgetContainer);
    recaptchaVerifier = new window.FirebaseAuthAPI.RecaptchaVerifier(
      window.firebaseAuth,
      widgetContainer,
      { size: "invisible" }
    );

    return recaptchaVerifier;
  }


  // ---------------------------------------------------------
  // SEND OTP
  // ---------------------------------------------------------

  async function sendCustomerOtp() {
    resetCustomerLoginMessages();

    let phoneNumber;

    try {
      phoneNumber = getCustomerPhoneNumber();
    } catch (error) {
      customerLoginMessage.textContent = error.message;
      customerPhone.focus();
      return;
    }

    if (!firebaseAuthReady()) {
      customerLoginMessage.textContent =
        "Login service is not ready. Please refresh the page and try again.";
      return;
    }

    sendOtpButton.disabled = true;
    sendOtpButton.textContent = "SENDING OTP...";

    try {
      await window.firebaseAuthPersistenceReady;
      const verifier = createRecaptcha();

      confirmationResult =
        await window.FirebaseAuthAPI.signInWithPhoneNumber(
          window.firebaseAuth,
          phoneNumber,
          verifier
        );

      phoneLoginStep.hidden = true;
      otpLoginStep.hidden = false;

      otpLoginMessage.textContent =
        `OTP sent to +91 ${phoneNumber.slice(-10)}.`;

      customerOtp.value = "";

      setTimeout(() => {
        customerOtp.focus();
      }, 100);

    } catch (error) {
      console.error("Firebase OTP error:", error);

      customerLoginMessage.textContent =
        getFirebaseAuthErrorMessage(error);

      resetRecaptcha();

    } finally {
      sendOtpButton.disabled = false;
      sendOtpButton.textContent = "SEND OTP";
    }
  }


  // ---------------------------------------------------------
  // VERIFY OTP
  // ---------------------------------------------------------

  async function verifyCustomerOtp() {
    resetCustomerLoginMessages();

    const otp = customerOtp.value.replace(/\D/g, "");

    if (!/^\d{6}$/.test(otp)) {
      otpLoginMessage.textContent =
        "Please enter the 6-digit OTP.";
      customerOtp.focus();
      return;
    }

    if (!confirmationResult) {
      otpLoginMessage.textContent =
        "Please request a new OTP.";
      return;
    }

    verifyOtpButton.disabled = true;
    verifyOtpButton.textContent = "VERIFYING...";

    try {
      const credential = await confirmationResult.confirm(otp);
      if (!credential?.user) throw new Error("The verified customer session could not be loaded. Please try signing in again.");
      const token = await credential.user.getIdTokenResult(true);
      if (token.claims.admin === true || token.claims.staff === true) {
        setCustomerSession(credential.user, "team");
        otpLoginMessage.textContent = "This is a team account. Use the Staff or Admin Desk email sign-in.";
        updatePlaceOrderButton();
        if (cartOverlay?.classList.contains("active")) renderCart();
        return;
      }
      setCustomerSession(credential.user, "customer");

      otpLoginMessage.textContent =
        "Mobile number verified successfully.";

      updatePlaceOrderButton();
      // Update every customer surface from Firebase's single authenticated
      // session immediately; do not wait for the auth listener/account reads.
      refreshAccountScreens(credential.user);
      if (cartOverlay?.classList.contains("active")) renderCart();

      setTimeout(() => {
        closeCustomerLogin();
      }, 700);

    } catch (error) {
      console.error("OTP verification error:", error);

      otpLoginMessage.textContent =
        getFirebaseAuthErrorMessage(error);

    } finally {
      verifyOtpButton.disabled = false;
      verifyOtpButton.textContent = "VERIFY OTP";
    }
  }


  // ---------------------------------------------------------
  // RESEND OTP
  // ---------------------------------------------------------

  async function resendCustomerOtp() {
    confirmationResult = null;

    resetRecaptcha();

    phoneLoginStep.hidden = false;
    otpLoginStep.hidden = true;

    await sendCustomerOtp();
  }


  // ---------------------------------------------------------
  // CHANGE MOBILE NUMBER
  // ---------------------------------------------------------

  function changeCustomerPhone() {
    confirmationResult = null;

    resetRecaptcha();

    customerOtp.value = "";

    resetCustomerLoginMessages();

    phoneLoginStep.hidden = false;
    otpLoginStep.hidden = true;

    setTimeout(() => {
      customerPhone.focus();
    }, 100);
  }


  // ---------------------------------------------------------
  // RESET reCAPTCHA
  // ---------------------------------------------------------

  function resetRecaptcha() {
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (error) {
        console.warn("Could not clear reCAPTCHA:", error);
      }

      recaptchaVerifier = null;
    }

    const recaptchaContainer = document.getElementById("recaptcha-container");
    if (recaptchaContainer) recaptchaContainer.replaceChildren();
  }


  // ---------------------------------------------------------
  // FIREBASE ERROR MESSAGES
  // ---------------------------------------------------------

  function getFirebaseAuthErrorMessage(error) {
    if (!error) {
      return "Something went wrong. Please try again.";
    }

    switch (error.code) {
      case "auth/invalid-phone-number":
        return "Please enter a valid Indian mobile number.";

      case "auth/missing-phone-number":
        return "Enter your mobile number to receive an OTP.";

      case "auth/invalid-verification-code":
        return "Incorrect OTP. Please check the OTP and try again.";

      case "auth/code-expired":
        return "This OTP has expired. Please request a new OTP.";

      case "auth/too-many-requests":
        return "Too many attempts. Please wait and try again later.";

      case "auth/quota-exceeded":
        return "SMS limit reached. Please try again later.";

      case "auth/billing-not-enabled":
        return "Phone verification requires Firebase billing to be enabled.";

      case "auth/operation-not-allowed":
        return "Phone login is not enabled in Firebase Authentication.";

      case "auth/captcha-check-failed":
        return "Security verification failed. Please refresh and try again.";

      case "auth/invalid-app-credential":
        return "Security verification expired. Please request a new OTP.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "auth/user-disabled":
        return "This account has been disabled.";

      default:
        return error.message ||
          "Unable to send or verify OTP. Please try again.";
    }
  }


  // ---------------------------------------------------------
  // PLACE ORDER BUTTON
  // ---------------------------------------------------------

  function updatePlaceOrderButton() {
  if (!placeOrderButton) return;

  // ONLINE CHECKOUT DISABLED
  if (!ONLINE_CHECKOUT_ENABLED) {

    placeOrderButton.textContent = "ONLINE ORDERING UNAVAILABLE";

    placeOrderButton.classList.add(
      "place-order-disabled"
    );

    placeOrderButton.disabled = true;

    placeOrderButton.setAttribute(
      "aria-disabled",
      "true"
    );

    return;
  }

  if (!orderAvailabilityReady || !orderAvailability.acceptingOnlineOrders) {
    placeOrderButton.classList.add("place-order-disabled");
    placeOrderButton.disabled = true;
    placeOrderButton.setAttribute("aria-disabled", "true");
    placeOrderButton.textContent = !orderAvailabilityReady
      ? "CHECKING ORDER STATUS"
      : !orderAvailability.staffEnabled
        ? "ONLINE ORDERING OFF"
        : orderAvailability.paused
        ? "ONLINE ORDERS PAUSED"
        : "ONLINE ORDERS CLOSED";
    return;
  }

  if (!customerAuthStateResolved) {
    placeOrderButton.classList.add("place-order-disabled");
    placeOrderButton.disabled = true;
    placeOrderButton.setAttribute("aria-disabled", "true");
    placeOrderButton.textContent = "CHECKING SIGN-IN";
    return;
  }

  // ONLINE CHECKOUT ENABLED
  placeOrderButton.classList.remove(
    "place-order-disabled"
  );

  placeOrderButton.disabled = false;

  placeOrderButton.removeAttribute(
    "aria-disabled"
  );

  if (isCustomerSignedIn()) {
    placeOrderButton.textContent =
      "CONTINUE TO CHECKOUT";
  } else {
    placeOrderButton.textContent =
      "LOGIN TO PLACE ORDER";
  }
}


async function handlePlaceOrderClick() {

  if (!cart.length) {

    alert(
      "YOUR CART IS EMPTY. Please add something to your order."
    );

    return;
  }

  if (!customerAuthStateResolved) {
    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "CHECKING SIGN-IN";
    await waitForCustomerAuthResolution();
    updatePlaceOrderButton();
  }

  if (!isCustomerSignedIn()) {

    openCustomerLogin();

    return;
  }

  openCheckout();
}


  // ---------------------------------------------------------
  // FIREBASE LOGIN STATE
  // ---------------------------------------------------------

  function setupCustomerAuthListener() {
    if (!firebaseAuthReady()) {
      console.error("Firebase Authentication API is unavailable.");
      customerAuthStateResolved = true;
      return;
    }

    window.FirebaseAuthAPI.onAuthStateChanged(
      window.firebaseAuth,
      async user => {
        const resolutionId = ++customerAuthResolutionId;
        customerAuthStateResolved = false;
        customerSessionType = user ? "checking" : "signed-out";
        customerSessionUid = "";
        if (user) {
          try {
            // Auth has already restored the persisted session. Avoid forcing a
            // network token refresh on every tab/page initialization; this
            // prevents transient auth failures from splitting customer UI state.
            const token = await user.getIdTokenResult();
            if (resolutionId !== customerAuthResolutionId) return;
            customerSessionType = token.claims.admin === true || token.claims.staff === true ? "team" : "customer";
            customerSessionUid = customerSessionType === "customer" ? user.uid : "";
          } catch (error) {
            if (resolutionId !== customerAuthResolutionId) return;
            console.error("Could not classify the signed-in session:", error);
            customerSessionType = "unknown";
          }
        }
        if (resolutionId !== customerAuthResolutionId) return;
        const nextUid = user?.uid || "";
        if (lastCustomerAuthUid && lastCustomerAuthUid !== nextUid) {
          currentLoyaltyAccount = { points: 0, completedOrders: 0, availableRewards: [] };
          loyaltyAccountLoaded = false;
          customerOnlineOrderHistoryLoaded = false;
          customerAccountLoadFailed = false;
          customerHasOrderedOnline = false;
          selectedMilestoneRewardId = null;
          selectedPointsToRedeem = 0;
          selectedWelcomeOffer = false;
          removeSelectedFreeOffer();
          if (cartOverlay?.classList.contains("active")) renderCart();
        }
        lastCustomerAuthUid = nextUid;
        customerAuthStateResolved = true;
        if (user?.uid) {
          try { localStorage.setItem("cravingHeavenLastCustomerUid_v1", user.uid); } catch (_) { /* Login flow still works when browser storage is disabled. */ }
        }

        updatePlaceOrderButton();
        renderRewardsJourney(currentLoyaltyAccount, isCustomerSignedIn());
        if (cartOverlay?.classList.contains("active")) renderCart();
        refreshAccountScreens(customerSessionType === "customer" ? user : null);

        if (user) {
          console.log(
            "Customer logged in:",
            user.phoneNumber || user.uid
          );
        } else {
          console.log("No customer is currently logged in.");
        }
      }
    );
  }


  function setAppScreen(screenName) {
    document.querySelectorAll("[data-app-screen]").forEach(section => {
      section.hidden = section.dataset.appScreen !== screenName;
    });
    document.querySelectorAll(".app-screen").forEach(section => {
      section.classList.toggle("is-active", section.id === `screen-${screenName}`);
    });
    customerBottomNav?.querySelectorAll("[data-screen]").forEach(button => {
      const active = button.dataset.screen === screenName;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (categoryNavigation) categoryNavigation.hidden = screenName !== "menu";
    if (screenName === "game") window.dispatchEvent(new Event("craving-heaven:show-game"));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (screenName === "orders" || screenName === "profile" || screenName === "rewards") refreshAccountScreens(currentCustomerUser());
  }

  function accountSignInCard(message) {
    return `<div class="account-empty"><div class="account-empty-icon">♙</div><h2>Sign in to continue</h2><p>${esc(message)}</p><button type="button" class="account-primary-button" data-account-login>LOGIN WITH MOBILE</button></div>`;
  }
  function gamePointLots(account) {
    return (Array.isArray(account?.gamePointLots) ? account.gamePointLots : []).filter(lot => {
      const expiry = lot.expiresAt?.toDate ? lot.expiresAt.toDate() : new Date(lot.expiresAt || 0);
      return Number(lot.points) > 0 && !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
    });
  }
  function cravingPointsBalance(account) {
    return Math.max(0, Number(account?.points || 0)) + gamePointLots(account).reduce((sum, lot) => sum + Math.max(0, Number(lot.points || 0)), 0);
  }

  function renderRewardsJourney(account = currentLoyaltyAccount, signedIn = isCustomerSignedIn()) {
    const root = document.getElementById("rewardsJourneyCards");
    const count = document.getElementById("rewardOrderCount");
    if (!root || !count) return;
    if (!signedIn) {
      count.textContent = "Sign in to track";
      root.innerHTML = `<div class="rewards-login-hint">Sign in to see your Craving Points and next rewards.<br><button type="button" class="account-primary-button" data-account-login>LOG IN</button></div>`;
      return;
    }
    if (customerAccountLoadFailed) {
      count.textContent = "Account unavailable";
      root.innerHTML = `<div class="rewards-login-hint">We couldn’t load your rewards. Check your account access or connection, then <button type="button" class="account-inline-retry" data-reload-account>try again</button>.</div>`;
      return;
    }
    if (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded) {
      count.textContent = "Loading account…";
      root.innerHTML = `<div class="rewards-login-hint">Loading your Craving Points and rewards…</div>`;
      return;
    }
    const completed = Math.max(0, Number(account.completedOrders || 0));
    count.textContent = `${completed} completed ${completed === 1 ? "order" : "orders"}`;
    const available = (Array.isArray(account.availableRewards) ? account.availableRewards : []).filter(item => {
      if (!item.expiresAt) return true;
      const expiry = item.expiresAt?.toDate ? item.expiresAt.toDate() : new Date(item.expiresAt);
      return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
    });
    const cycleOrder = completed === 0 ? 0 : ((completed - 1) % 30) + 1;
    // Every 30 completed orders begins a fresh reward cycle at order 1.
    const previewOrder = cycleOrder === 30 ? 0 : cycleOrder;
    const availableIds = new Set(available.map(item => item.id));
    const welcomeReward = REWARDS_CONFIG.journey.find(item => Number(item.order) === 1 && item.kind === "free-item" && item.item === REWARDS_CONFIG.welcomeItem);
    const welcomeAvailableNow = completed === 0 && loyaltyAccountLoaded && customerOnlineOrderHistoryLoaded && !customerHasOrderedOnline
      && account.welcomeCompleted !== true && !account.welcomeReservationId;
    const upcoming = REWARDS_CONFIG.journey.filter(item => item.id && item.order > previewOrder && !availableIds.has(item.id)
      && !(welcomeAvailableNow && item.id === welcomeReward?.id)).slice(0, 2);
    const visibleReadyCount = Math.min(available.length, 1) + (welcomeAvailableNow ? 1 : 0);
    const cards = [
      ...(welcomeAvailableNow ? [`<article class="journey-card journey-card-ready"><span class="journey-card-status">FIRST ONLINE ORDER GIFT</span><strong>${esc(REWARDS_CONFIG.welcomeItem)} · FREE</strong><p>Add any regular menu item to your first online order. The burger appears in your cart at ₹0; combos or extras alone do not qualify.</p><button type="button" class="journey-use-button" data-screen="menu">VIEW MENU</button></article>`] : []),
      ...available.slice(0, 1).map(reward => {
        const definition = REWARDS_CONFIG.rewardById[reward.id] || reward;
        const expiry = reward.expiresAt ? (reward.expiresAt?.toDate ? reward.expiresAt.toDate() : new Date(reward.expiresAt)) : null;
        const gameReward = ["craving-dash", "craving-runner"].includes(reward.source);
        const expires = expiry && !Number.isNaN(expiry.getTime()) ? `${gameReward ? "Expires" : "Use by"} ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: gameReward ? "numeric" : undefined, minute: gameReward ? "2-digit" : undefined }).format(expiry)}` : "Ready to use";
        return `<article class="journey-card journey-card-ready"><span class="journey-card-status">✦ READY TO USE</span><strong>${esc(definition.title || reward.title)}</strong><p>${esc(definition.detail || reward.detail || "Use this reward on your next order")}</p><small>${esc(expires)}</small><button type="button" class="journey-use-button" data-use-reward="${esc(reward.ticketId || reward.id)}">USE IN CART</button></article>`;
      }),
      ...upcoming.slice(0, Math.max(0, 2 - visibleReadyCount)).map(item => `<article class="journey-card journey-card-locked"><span class="journey-card-status">🔒 ORDER ${item.order}</span><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></article>`)
    ];
    root.innerHTML = cards.length ? cards.join("") : `<div class="rewards-login-hint">You’ve reached the end of this reward journey. Keep ordering to begin the next round.</div>`;
  }

  function setAddressFormVisible(visible) {
    if (!addressForm) return;
    if (visible && deliveryLocationDialog && !deliveryLocationDialog.open) deliveryLocationDialog.showModal();
    addressForm.hidden = !visible;
    if (visible) addressForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderSavedAddresses() {
    if (!savedAddresses) return;
    const addresses = Array.isArray(currentCustomerProfile.addresses) ? currentCustomerProfile.addresses : [];
    if (!isCustomerSignedIn()) {
      savedAddresses.innerHTML = `<div class="address-empty">Log in to save delivery addresses.</div>`;
      return;
    }
    if (!addresses.length) {
      savedAddresses.innerHTML = `<div class="address-empty">No saved addresses yet. Add one to make checkout quicker.</div>`;
      return;
    }
    savedAddresses.innerHTML = addresses.map(address => `
      <article class="saved-address-card">
        <header><strong>${esc(address.label || "Address")}</strong>${address.isDefault ? '<span class="saved-address-default">Default</span>' : ""}</header>
        <p><strong>${esc(address.name || "")}</strong><br>${esc(address.address || "")}${address.landmark ? `<br>Near ${esc(address.landmark)}` : ""}<br>${esc(address.area || "")}</p>
        <footer>
          <button type="button" data-edit-address="${esc(address.id)}">EDIT</button>
          ${address.isDefault ? "" : `<button type="button" data-default-address="${esc(address.id)}">SET DEFAULT</button>`}
          <button type="button" data-delete-address="${esc(address.id)}">DELETE</button>
        </footer>
      </article>`).join("");
  }

  async function saveCustomerProfile(nextProfile) {
    const user = currentCustomerUser();
    if (!user) throw new Error("Please log in to save your address.");
    const callable = window.FirebaseFunctionsAPI?.httpsCallable;
    if (!callable || !window.firebaseFunctions) throw new Error("The secure address service is unavailable. Please try again.");
    const response = await callable(window.firebaseFunctions, "saveCustomerProfile")({
      name: String(nextProfile.name || "").trim(),
      addresses: Array.isArray(nextProfile.addresses) ? nextProfile.addresses : []
    });
    currentCustomerProfile = { ...currentCustomerProfile, ...nextProfile };
    renderSavedAddresses();
    refreshHomeDeliverySelector();
  }

  async function submitAddressForm(event) {
    event.preventDefault();
    if (addressMessage) addressMessage.textContent = "";
    const id = document.getElementById("addressId").value.trim();
    const label = document.getElementById("addressLabel").value.trim();
    const name = document.getElementById("addressContactName").value.trim();
    const address = document.getElementById("addressLine").value.trim();
    const landmark = document.getElementById("addressLandmark").value.trim();
    const area = addressArea.value;
    const isDefault = document.getElementById("addressDefault").checked;
    if (name.length < 2 || address.length < 8 || !area) {
      addressMessage.textContent = "Enter a contact name, full address, and delivery area.";
      return;
    }
    const addresses = [...(currentCustomerProfile.addresses || [])];
    const addressId = id || (crypto.randomUUID ? crypto.randomUUID() : `addr-${Date.now()}`);
    const oldAddress = addresses.find(item => item.id === addressId);
    const location = pendingGpsCoordinates || oldAddress?.location || null;
    const nextAddress = { id: addressId, label: label || "Address", name, address, landmark, area, isDefault: isDefault || addresses.length === 0, ...(location ? { location } : {}) };
    const existingIndex = addresses.findIndex(item => item.id === addressId);
    if (existingIndex < 0 && addresses.length >= 10) {
      addressMessage.textContent = "You can save up to 10 addresses.";
      return;
    }
    if (nextAddress.isDefault) addresses.forEach(item => { item.isDefault = false; });
    if (existingIndex < 0) addresses.push(nextAddress);
    else addresses[existingIndex] = nextAddress;
    const submitButton = addressForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "SAVING…";
    try {
      await saveCustomerProfile({ ...currentCustomerProfile, name, addresses });
      pendingGpsCoordinates = null;
      addressForm.reset();
      document.getElementById("addressId").value = "";
      setAddressFormVisible(false);
      refreshHomeDeliverySelector(`address:${addressId}`);
      if (checkoutSavedAddress) {
        checkoutSavedAddress.value = addressId;
        checkoutSavedAddress.dispatchEvent(new Event("change", { bubbles: true }));
      }
      prefillCheckoutFromDefaultAddress();
      deliveryLocationDialog?.close();
    } catch (error) {
      console.error("Could not save delivery address:", error);
      addressMessage.textContent = "Could not save this address. Please try again.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "SAVE ADDRESS";
    }
  }

  function editAddress(addressId) {
    const address = currentCustomerProfile.addresses.find(item => item.id === addressId);
    if (!address) return;
    document.getElementById("addressId").value = address.id;
    const labelSelect = document.getElementById("addressLabel");
    const savedLabel = address.label || "Home";
    if (![...labelSelect.options].some(option => option.value === savedLabel)) labelSelect.add(new Option(savedLabel, savedLabel));
    labelSelect.value = savedLabel;
    document.getElementById("addressContactName").value = address.name || "";
    document.getElementById("addressLine").value = address.address || "";
    document.getElementById("addressLandmark").value = address.landmark || "";
    addressArea.value = address.area || "";
    document.getElementById("addressDefault").checked = !!address.isDefault;
    if (addressMessage) addressMessage.textContent = "";
    setAddressFormVisible(true);
  }

  function refreshHomeDeliverySelector(preferredValue = "") {
    if (!homeDeliveryArea || !checkoutArea) return;
    const areas = [...checkoutArea.options].filter(option => option.value);
    const addresses = Array.isArray(currentCustomerProfile.addresses) ? currentCustomerProfile.addresses : [];
    let wanted = preferredValue;
    if (!wanted) {
      try { wanted = homeDeliveryArea.value || localStorage.getItem("chHomeDeliveryArea") || ""; } catch { wanted = homeDeliveryArea.value || ""; }
    }
    homeDeliveryArea.replaceChildren(new Option("Choose your area", ""));
    const areaGroup = document.createElement("optgroup");
    areaGroup.label = "Delivery areas";
    areas.forEach(option => areaGroup.append(new Option(option.textContent.trim(), `area:${option.value}`)));
    homeDeliveryArea.append(areaGroup);
    if (addresses.length) {
      const addressGroup = document.createElement("optgroup");
      addressGroup.label = "Saved addresses";
      addresses.forEach(address => {
        const title = address.label || "Saved address";
        const detail = [address.area, address.address].filter(Boolean).join(" · ");
        addressGroup.append(new Option(detail ? `${title} · ${detail}` : title, `address:${address.id}`));
      });
      homeDeliveryArea.append(addressGroup);
    }
    const valid = [...homeDeliveryArea.options].some(option => option.value === wanted);
    const defaultAddress = addresses.find(item => item.isDefault) || addresses[0];
    homeDeliveryArea.value = valid ? wanted : defaultAddress ? `address:${defaultAddress.id}` : "";
    const selection = homeDeliveryArea.value;
    const selectedAddress = selection.startsWith("address:") ? addresses.find(item => item.id === selection.slice(8)) : null;
    const selectedArea = selection.startsWith("area:") ? selection.slice(5) : "";
    if (homeDeliveryLabel) homeDeliveryLabel.textContent = selectedAddress ? `${selectedAddress.label || "Saved address"} · ${selectedAddress.area || ""}`.trim().replace(/ ·$/, "") : selectedArea || "Choose your location";
    if (homeDeliveryDetail) homeDeliveryDetail.textContent = selectedAddress ? [selectedAddress.address, selectedAddress.landmark ? `Near ${selectedAddress.landmark}` : ""].filter(Boolean).join(" · ") : selectedArea ? "Delivery area selected" : "Tap to set delivery address";
    try {
      if (homeDeliveryArea.value) localStorage.setItem("chHomeDeliveryArea", homeDeliveryArea.value);
      else if (wanted.startsWith("address:") && !addresses.length) { /* Keep the saved choice until the signed-in profile loads. */ }
      else localStorage.removeItem("chHomeDeliveryArea");
    } catch {}
    renderHomeDeliveryAddresses();
  }

  function renderHomeDeliveryAddresses() {
    if (!homeSavedAddressList) return;
    const addresses = Array.isArray(currentCustomerProfile.addresses) ? currentCustomerProfile.addresses : [];
    if (!isCustomerSignedIn()) {
      homeSavedAddressList.innerHTML = `<p class="delivery-address-empty">Sign in to keep Home, Work, and other addresses saved to your account.</p>`;
      return;
    }
    if (!addresses.length) {
      homeSavedAddressList.innerHTML = `<p class="delivery-address-empty">No saved addresses yet. Use GPS or add an address below.</p>`;
      return;
    }
    const selectedId = homeDeliveryArea?.value.startsWith("address:") ? homeDeliveryArea.value.slice(8) : "";
    homeSavedAddressList.innerHTML = addresses.map(address => `
      <button type="button" class="home-saved-address${address.id === selectedId ? " is-selected" : ""}" data-home-address="${esc(address.id)}">
        <span class="home-saved-address-icon" aria-hidden="true">${address.label === "Work" ? "⌂" : address.label === "Home" ? "⌂" : "⌖"}</span>
        <span><strong>${esc(address.label || "Saved address")}${address.isDefault ? " · Default" : ""}</strong><small>${esc([address.address, address.landmark ? `Near ${address.landmark}` : "", address.area].filter(Boolean).join(", "))}</small></span>
        <span class="home-saved-address-check" aria-hidden="true">${address.id === selectedId ? "✓" : ""}</span>
      </button>`).join("");
  }

  function prefillCheckoutFromDefaultAddress() {
    if (checkoutSavedAddress) {
      const addresses = currentCustomerProfile.addresses || [];
      checkoutSavedAddress.innerHTML = `<option value="">Enter a new address</option>${addresses.map(item => `<option value="${esc(item.id)}">${esc(item.label || "Address")} — ${esc(item.area || "")}</option>`).join("")}`;
      if (savedAddressPickerWrap) savedAddressPickerWrap.hidden = !addresses.length;
    }
    refreshHomeDeliverySelector();
    const selection = homeDeliveryArea?.value || "";
    const selectedArea = selection.startsWith("area:") ? selection.slice(5) : "";
    const selectedId = selection.startsWith("address:") ? selection.slice(8) : "";
    const addresses = currentCustomerProfile.addresses || [];
    const chosen = (selectedId && addresses.find(item => item.id === selectedId))
      || (!selectedArea && (addresses.find(item => item.isDefault) || addresses[0]));
    if (!chosen) {
      if (checkoutArea && selectedArea) checkoutArea.value = selectedArea;
      return;
    }
    if (checkoutSavedAddress) checkoutSavedAddress.value = chosen.id;
    if (checkoutAddressLabel && chosen.label) {
      if (![...checkoutAddressLabel.options].some(option => option.value === chosen.label)) checkoutAddressLabel.add(new Option(chosen.label, chosen.label));
      checkoutAddressLabel.value = chosen.label;
    }
    if (checkoutName && !checkoutName.value) checkoutName.value = chosen.name || "";
    if (checkoutAddress && !checkoutAddress.value) checkoutAddress.value = chosen.address || "";
    if (checkoutLandmark && !checkoutLandmark.value) checkoutLandmark.value = chosen.landmark || "";
    if (checkoutArea && chosen.area) checkoutArea.value = chosen.area;
    if (homeDeliveryArea && chosen.area) {
      refreshHomeDeliverySelector(`address:${chosen.id}`);
    }
  }

  function orderHistoryDate(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "Recent order";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  async function refreshAccountScreens(user) {
    if (user && (customerSessionType !== "customer" || user.uid !== window.firebaseAuth?.currentUser?.uid)) user = null;
    const refreshId = ++accountRefreshToken;
    if (!ordersContent || !profileContent) return;
    const addAddressButton = document.getElementById("addAddressButton");
    if (!user) {
      if (addAddressButton) addAddressButton.textContent = "LOGIN TO ADD ADDRESS";
      currentCustomerProfile = { addresses: [] };
      ordersContent.innerHTML = accountSignInCard("Log in with your mobile number to see orders placed with this account.");
      profileContent.innerHTML = `<div class="profile-account-card"><div class="profile-avatar">♙</div><div><span>WELCOME TO</span><strong>CRAVING HEAVEN</strong><p>Sign in to view your profile.</p></div><button type="button" class="account-primary-button" data-account-login>LOGIN</button></div>`;
      renderSavedAddresses();
      refreshHomeDeliverySelector();
      const pointsBalance = document.getElementById("loyaltyPointsBalance");
      if (pointsBalance) pointsBalance.textContent = "—";
      const pointsValue = document.getElementById("loyaltyPointsValue");
      if (pointsValue) pointsValue.textContent = "—";
      const homePointsBalance = document.getElementById("homeLoyaltyPointsBalance");
      if (homePointsBalance) homePointsBalance.textContent = "Sign in";
      const headerPointsBalance = document.getElementById("headerCravingPointsBalance");
      if (headerPointsBalance) headerPointsBalance.textContent = "Sign in";
      const homePointsSummary = document.getElementById("homeLoyaltySummary");
      if (homePointsSummary) homePointsSummary.textContent = "to see your points.";
      currentLoyaltyAccount = { points: 0, completedOrders: 0, availableRewards: [] };
      loyaltyAccountLoaded = false;
      customerAccountLoadFailed = false;
      customerAccountLoadDiagnostic = "";
      customerHasOrderedOnline = false;
      customerOnlineOrderHistoryLoaded = false;
      renderRewardsJourney(currentLoyaltyAccount, false);
      if (cartOverlay?.classList.contains("active")) renderCart();
      maybeShowFirstOrderFlyer();
      return;
    }

    if (addAddressButton) addAddressButton.textContent = "+ ADD ADDRESS";
    const phone = user.phoneNumber || "Mobile number verified";
    loyaltyAccountLoaded = false;
    customerAccountLoadFailed = false;
    customerAccountLoadDiagnostic = "";
    const homePointsBalance = document.getElementById("homeLoyaltyPointsBalance");
    const homePointsSummary = document.getElementById("homeLoyaltySummary");
    if (homePointsBalance) homePointsBalance.textContent = "Loading…";
      const headerPointsBalance = document.getElementById("headerCravingPointsBalance");
      if (headerPointsBalance) headerPointsBalance.textContent = "…";
    if (homePointsSummary) homePointsSummary.textContent = "your Craving Points.";
    profileContent.innerHTML = `<div class="profile-account-card"><div class="profile-avatar">${esc(phone.slice(-2))}</div><div><span>LOGGED IN AS</span><strong>${esc(phone)}</strong><p>Your account is ready.</p></div><button type="button" class="account-secondary-button" data-account-logout>LOG OUT</button></div>`;
    if (savedAddresses) savedAddresses.innerHTML = `<div class="account-loading">Loading saved addresses…</div>`;
    ordersContent.innerHTML = `<div class="account-loading">Loading your orders…</div>`;
    const callable = window.FirebaseFunctionsAPI?.httpsCallable;
    if (!window.firebaseFunctions || !callable) {
      customerAccountLoadFailed = true;
      customerAccountLoadDiagnostic = "account-service-unavailable";
      renderRewardsJourney(currentLoyaltyAccount, isCustomerSignedIn());
      if (homePointsBalance) homePointsBalance.textContent = "—";
      if (headerPointsBalance) headerPointsBalance.textContent = "—";
      if (homePointsSummary) homePointsSummary.textContent = "points are temporarily unavailable.";
      ordersContent.innerHTML = `<div class="account-empty"><p>Order history is temporarily unavailable. Please try again later.</p></div>`;
      return;
    }

    try {
      const response = await callable(window.firebaseFunctions, "getCustomerAccount")({});
      if (refreshId !== accountRefreshToken || window.firebaseAuth?.currentUser?.uid !== user.uid) return;
      const account = response.data || {};
      customerAccountLoadFailed = false;
      customerAccountLoadDiagnostic = "";
      currentCustomerProfile = account.profile || { name: "", addresses: [] };
      if (!Array.isArray(currentCustomerProfile.addresses)) currentCustomerProfile.addresses = [];
      const name = currentCustomerProfile.name || "";
      profileContent.innerHTML = `<div class="profile-account-card"><div class="profile-avatar">${esc(phone.slice(-2))}</div><div><span>LOGGED IN AS</span><strong>${esc(name || phone)}</strong><p>${name ? `${esc(phone)} · Your account is ready.` : "Your account is ready."}</p></div><button type="button" class="account-secondary-button" data-account-logout>LOG OUT</button></div>`;
      renderSavedAddresses();
      prefillCheckoutFromDefaultAddress();
      const orders = Array.isArray(account.orders) ? account.orders : [];
      customerOnlineOrderHistoryLoaded = true;
      customerHasOrderedOnline = orders.some(order => order.source === "website" && order.isTestOrder !== true && !["cancelled", "canceled"].includes(String(order.status || "").toLowerCase()));
      const getTime = value => value?.toDate ? value.toDate().getTime() : new Date(value || 0).getTime();
      orders.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
      const pointsBalance = document.getElementById("loyaltyPointsBalance");
      const loyaltyData = account.loyalty || { points: 0, completedOrders: 0, availableRewards: [] };
      currentLoyaltyAccount = { ...loyaltyData, points: cravingPointsBalance(loyaltyData) };
      loyaltyAccountLoaded = true;
      if (!Array.isArray(currentLoyaltyAccount.availableRewards)) currentLoyaltyAccount.availableRewards = [];
      if (currentLoyaltyAccount.welcomeReservationId) {
        const reservationOrder = orders.find(order => order.id === currentLoyaltyAccount.welcomeReservationId);
        if (reservationOrder && ["cancelled", "canceled"].includes(String(reservationOrder.status || "").toLowerCase())) currentLoyaltyAccount.welcomeReservationId = "";
      }
      try {
        const welcomeIsUsed = currentLoyaltyAccount.welcomeCompleted === true || customerHasOrderedOnline || Boolean(currentLoyaltyAccount.welcomeReservationId);
        if (welcomeIsUsed) localStorage.setItem(`cravingHeavenWelcomeOrderPlaced_${user.uid}`, "1");
        else if (loyaltyAccountLoaded && customerOnlineOrderHistoryLoaded) localStorage.removeItem(`cravingHeavenWelcomeOrderPlaced_${user.uid}`);
      } catch (_) { /* Server account state remains authoritative. */ }
      const points = Math.max(0, Number(currentLoyaltyAccount.points || 0));
      const pointsText = points.toLocaleString("en-IN");
      if (pointsBalance) pointsBalance.textContent = loyaltyAccountLoaded ? pointsText : "—";
      const pointsValue = document.getElementById("loyaltyPointsValue");
      if (pointsValue) pointsValue.textContent = loyaltyAccountLoaded ? `₹${(points / REWARDS_CONFIG.pointsPerRedemptionRupees * 10).toFixed(2)}` : "—";
      const expiryNotice = document.getElementById("gamePointsExpiryNotice");
      const expiringLots = gamePointLots(loyaltyData).sort((a, b) => {
        const date = lot => lot.expiresAt?.toDate ? lot.expiresAt.toDate() : new Date(lot.expiresAt);
        return date(a) - date(b);
      });
      if (expiryNotice) expiryNotice.textContent = expiringLots.length ? `${expiringLots.reduce((sum, lot) => sum + Number(lot.points || 0), 0)} game Craving Points expire ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(expiringLots[0].expiresAt?.toDate ? expiringLots[0].expiresAt.toDate() : new Date(expiringLots[0].expiresAt))}. Use them before then.` : "";
      const homePointsBalance = document.getElementById("homeLoyaltyPointsBalance");
      if (homePointsBalance) homePointsBalance.textContent = loyaltyAccountLoaded ? pointsText : "—";
      const headerPointsBalance = document.getElementById("headerCravingPointsBalance");
      if (headerPointsBalance) headerPointsBalance.textContent = loyaltyAccountLoaded ? `${pointsText} pts` : "Retry";
      const homePointsSummary = document.getElementById("homeLoyaltySummary");
      if (homePointsSummary) homePointsSummary.textContent = loyaltyAccountLoaded ? "Craving Points · combos earn half rate" : "Points could not load · try again";
      renderRewardsJourney(currentLoyaltyAccount, true);
      if (cartOverlay?.classList.contains("active")) renderCart();
      maybeShowFirstOrderFlyer();
      if (!orders.length) {
        ordersContent.innerHTML = `<div class="account-empty"><div class="account-empty-icon">▤</div><h2>No orders yet</h2><p>Your order history will show here after your first order.</p><button type="button" class="account-primary-button" data-screen="menu">EXPLORE MENU</button></div>`;
        return;
      }
      ordersContent.innerHTML = orders.map(order => {
        const orderItems = Array.isArray(order.items) ? order.items.map(item => `${esc(item.name || "Item")} × ${Number(item.qty || 1)}`).join(" · ") : "Order details unavailable";
        const orderMode = order.orderType === "pickup" ? "Store pickup" : "Delivery";
        const orderPrefix = order.orderType === "pickup" ? "PK" : "DL";
        const orderNumber = order.orderNumber || `${orderPrefix}-${String(order.id).slice(-4).toUpperCase()}`;
        return `<article class="order-history-card ${order.isTestOrder ? "test-order-history-card" : ""}"><div class="order-history-head"><div><span class="order-history-date">${order.isTestOrder ? "TEST ORDER · " : ""}${esc(orderHistoryDate(order.createdAt))} · ${orderMode}</span><h2>Order ${esc(orderNumber)}</h2></div><span class="order-status-pill">${esc(String(order.status || "Received"))}</span></div><p>${orderItems}</p><div class="order-history-total"><span>${order.isTestOrder ? "TEST TOTAL · NO PAYMENT DUE" : "ORDER TOTAL"}</span><strong>${money(order.total || order.subtotal || 0)}</strong></div></article>`;
      }).join("");
    } catch (error) {
      console.error("Could not load customer orders:", error);
      customerAccountLoadFailed = true;
      customerAccountLoadDiagnostic = String(error?.code || "account-read-failed").replace(/^firestore\//, "");
      renderRewardsJourney(currentLoyaltyAccount, isCustomerSignedIn());
      if (cartOverlay?.classList.contains("active")) renderCart();
      if (savedAddresses?.querySelector(".account-loading")) {
        savedAddresses.innerHTML = `<div class="address-empty">Saved addresses could not load. <button type="button" class="account-inline-retry" data-reload-account>TRY AGAIN</button></div>`;
      }
      const pointsBalance = document.getElementById("loyaltyPointsBalance");
      if (pointsBalance && pointsBalance.textContent === "Loading…") pointsBalance.textContent = "—";
      const homePointsBalance = document.getElementById("homeLoyaltyPointsBalance");
      if (homePointsBalance && homePointsBalance.textContent === "Loading…") homePointsBalance.textContent = "—";
      const headerPointsBalance = document.getElementById("headerCravingPointsBalance");
      if (headerPointsBalance && headerPointsBalance.textContent === "…") headerPointsBalance.textContent = "—";
      const homePointsSummary = document.getElementById("homeLoyaltySummary");
      if (homePointsSummary && homePointsSummary.textContent === "your Craving Points.") homePointsSummary.textContent = "couldn’t load. Try again later.";
      ordersContent.innerHTML = `<div class="account-empty"><h2>Your account couldn’t load</h2><p>Please check your connection and try again.</p><button type="button" class="account-primary-button" data-reload-account>TRY AGAIN</button></div>`;
    }
  }

  // ---------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------

  if (sendOtpButton) {
    sendOtpButton.addEventListener(
      "click",
      sendCustomerOtp
    );
  }

  if (verifyOtpButton) {
    verifyOtpButton.addEventListener(
      "click",
      verifyCustomerOtp
    );
  }

  if (resendOtpButton) {
    resendOtpButton.addEventListener(
      "click",
      resendCustomerOtp
    );
  }

  if (changePhoneButton) {
    changePhoneButton.addEventListener(
      "click",
      changeCustomerPhone
    );
  }

  if (customerLoginClose) {
    customerLoginClose.addEventListener(
      "click",
      closeCustomerLogin
    );
  }

  if (customerLoginOverlay) {
    customerLoginOverlay.addEventListener(
      "click",
      event => {
        if (event.target === customerLoginOverlay) {
          closeCustomerLogin();
        }
      }
    );
  }

  if (placeOrderButton) {
    placeOrderButton.addEventListener(
      "click",
      handlePlaceOrderClick
    );
  }

  if (customerPhone) {
    customerPhone.addEventListener(
      "input",
      () => {
        customerPhone.value =
          customerPhone.value.replace(/\D/g, "").slice(0, 10);
      }
    );

    customerPhone.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          sendCustomerOtp();
        }
      }
    );
  }

  if (customerOtp) {
    customerOtp.addEventListener(
      "input",
      () => {
        customerOtp.value =
          customerOtp.value.replace(/\D/g, "").slice(0, 6);
      }
    );

    customerOtp.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          verifyCustomerOtp();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        customerLoginOverlay &&
        customerLoginOverlay.classList.contains("open")
      ) {
        closeCustomerLogin();
      }
    }
  );

  // Start Firebase customer authentication listener.
  setupCustomerAuthListener();

  // Set initial Place Order button state.
  updatePlaceOrderButton();


// =========================================================
// CHECKOUT
// =========================================================

const checkoutOverlay =
  document.getElementById("checkoutOverlay");

const checkoutClose =
  document.getElementById("checkoutClose");

const checkoutForm =
  document.getElementById("checkoutForm");

const checkoutName =
  document.getElementById("checkoutName");

const checkoutAddress =
  document.getElementById("checkoutAddress");

const checkoutLandmark =
  document.getElementById("checkoutLandmark");

const checkoutArea =
  document.getElementById("checkoutArea");
const homeDeliveryArea = document.getElementById("homeDeliveryArea");
const homeDeliveryPicker = document.getElementById("homeDeliveryPicker");
const homeDeliveryLabel = document.getElementById("homeDeliveryLabel");
const homeDeliveryDetail = document.getElementById("homeDeliveryDetail");
const deliveryLocationDialog = document.getElementById("deliveryLocationDialog");
const homeSavedAddressList = document.getElementById("homeSavedAddressList");
const deliveryLocationMessage = document.getElementById("deliveryLocationMessage");
const useCurrentLocationButton = document.getElementById("useCurrentLocationButton");
const checkoutSavedAddress = document.getElementById("checkoutSavedAddress");
const checkoutAddressLabel = document.getElementById("checkoutAddressLabel");
const savedAddressPickerWrap = document.getElementById("savedAddressPickerWrap");
const deliveryDetailsFields = document.getElementById("deliveryDetailsFields");
const pickupInfo = document.getElementById("pickupInfo");
const checkoutTitle = document.getElementById("checkoutTitle");
const checkoutPaymentTitle = document.getElementById("checkoutPaymentTitle");
const checkoutPaymentNote = document.getElementById("checkoutPaymentNote");

const checkoutOrderSummary =
  document.getElementById("checkoutOrderSummary");

const checkoutSubmit =
  document.getElementById("checkoutSubmit");

const checkoutMessage =
  document.getElementById("checkoutMessage");
let checkoutReturnFocus = null;

// =========================================================
// ORDER SUCCESS
// =========================================================

const orderSuccessOverlay =
  document.getElementById("orderSuccessOverlay");

const orderSuccessClose =
  document.getElementById("orderSuccessClose");

const orderSuccessId =
  document.getElementById("orderSuccessId");
const orderSuccessNote = document.getElementById("orderSuccessNote");


function openOrderSuccess(orderId, orderType = "delivery", addressSaved = false, addressLabel = "", displayOrderNumber = "", isTestOrder = false) {

  if (!orderSuccessOverlay) return;

  if (orderSuccessId) {
    const prefix = orderType === "pickup" ? "PK" : "DL";
    orderSuccessId.textContent = displayOrderNumber || `${prefix}-${String(orderId).slice(-4).toUpperCase()}`;
  }
  if (orderSuccessNote) {
    orderSuccessNote.textContent = isTestOrder
      ? "TEST ORDER ONLY — it is saved separately and will not be prepared, sent to staff, charged, or earn Craving Points."
      : orderType === "pickup"
      ? "Pickup at Shop 10, Pearl Oasis Building, Pathanwadi, Malad East. Pay at the store and track readiness from Your Orders."
      : `${addressSaved ? `Your ${addressLabel || "delivery"} address is saved to your account. ` : ""}Track your order anytime from the Orders screen.`;
  }
  const successTitle = document.getElementById("orderSuccessTitle");
  if (successTitle) successTitle.textContent = isTestOrder ? "TEST ORDER PLACED" : "ORDER PLACED!";

  orderSuccessOverlay.classList.add("open");

  orderSuccessOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "order-success-open"
  );
}


function closeOrderSuccess() {

  if (!orderSuccessOverlay) return;

  if (orderSuccessOverlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  orderSuccessOverlay.classList.remove("open");

  orderSuccessOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "order-success-open"
  );
}


if (orderSuccessClose) {

  orderSuccessClose.addEventListener(
    "click",
    () => {
      closeOrderSuccess();
      setAppScreen("orders");
    }
  );
}


if (orderSuccessOverlay) {

  orderSuccessOverlay.addEventListener(
    "click",
    event => {

      if (
        event.target === orderSuccessOverlay
      ) {

        closeOrderSuccess();

      }

    }
  );
}


function getCheckoutTotal() {

  const subtotal = getPaidSubtotal();

  const delivery =
    isPickupSelected() || subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  return subtotal + delivery;
}

function isPickupSelected() {
  return document.querySelector('input[name="fulfillmentType"]:checked')?.value === "pickup";
}

function updateCheckoutFulfillmentUI() {
  const pickup = isPickupSelected();
  const rewardWasCleared = pickup && getSelectedMilestoneReward()?.kind === "free-delivery";
  if (deliveryDetailsFields) deliveryDetailsFields.hidden = pickup;
  if (pickupInfo) pickupInfo.hidden = !pickup;
  if (checkoutAddress) checkoutAddress.required = !pickup;
  if (checkoutArea) checkoutArea.required = !pickup;
  if (checkoutAddressLabel) checkoutAddressLabel.required = !pickup;
  if (checkoutTitle) checkoutTitle.textContent = pickup ? "PICKUP ORDER" : "DELIVERY DETAILS";
  if (checkoutPaymentTitle) checkoutPaymentTitle.textContent = pickup ? "PAY ON PICKUP" : "PAY ON DELIVERY";
  if (checkoutPaymentNote) checkoutPaymentNote.textContent = pickup ? "Cash / UPI when you collect at the store" : "Cash / UPI on delivery";
  if (rewardWasCleared) {
    selectedMilestoneRewardId = null;
    render();
  }
  renderCheckoutSummary();
}


function renderCheckoutSummary() {

  if (!checkoutOrderSummary) return;

  const subtotal = getPaidSubtotal();
  const eligibleSubtotal = getOfferEligibleSubtotal();
  const selectedReward = getSelectedMilestoneReward();
  const estimatedPoints = estimatePointsForCurrentOrder(selectedReward, eligibleSubtotal);

  const delivery =
    isPickupSelected() || selectedReward?.kind === "free-delivery" || subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  const promotionDiscount = (selectedReward?.kind === "discount" ? selectedReward.amount : 0) + gameRewardDiscount(selectedReward, eligibleSubtotal);
    const pointsDiscount = selectedPointsToRedeem / REWARDS_CONFIG.pointsPerRedemptionRupees * 10;
  const total = Math.max(0, subtotal - promotionDiscount - pointsDiscount + delivery);


  const itemsHtml = cart
    .map(item => {

      if (item.isFreeOffer) {

        return `
          <div class="checkout-summary-item">
            <span>
              🎁 ${esc(item.name)}
            </span>

            <strong>₹0 · FREE</strong>
          </div>
        `;
      }

      return `
        <div class="checkout-summary-item">

          <span>
            ${esc(item.name)}
            × ${item.qty}
          </span>

          <strong>
            ${money(item.price * item.qty)}
          </strong>

        </div>
      `;
    })
    .join("") + (selectedReward?.kind === "free-item" ? `<div class="checkout-summary-item"><span>🎁 ${esc(selectedReward.item)} · Royal reward</span><strong>₹0 · FREE</strong></div>` : "") + (selectedWelcomeOffer ? `<div class="checkout-summary-item"><span>🎁 ${esc(REWARDS_CONFIG.welcomeItem)} · First-order gift</span><strong>₹0 · FREE</strong></div>` : "");


  checkoutOrderSummary.innerHTML = `

    ${itemsHtml}

    <div class="checkout-summary-item">
      <span>ITEM TOTAL</span>
      <strong>${money(subtotal)}</strong>
    </div>

    <div class="checkout-summary-item">
      <span>${isPickupSelected() ? "PICKUP" : "DELIVERY"}</span>

      <strong class="${delivery === 0 ? "free" : ""}">
        ${isPickupSelected() ? "NO CHARGE" : delivery === 0 ? "FREE" : money(delivery)}
      </strong>
    </div>

    ${promotionDiscount > 0 ? `<div class="checkout-summary-item"><span>${selectedReward?.kind === "percent-discount" ? `ROYAL REWARD · ${Number(selectedReward.percent)}% OFF REGULAR ITEMS` : "OFFER SAVINGS"}</span><strong>−${money(promotionDiscount)}</strong></div>` : ""}
    ${selectedReward?.kind === "free-delivery" ? `<div class="checkout-summary-item"><span>ROYAL REWARDS · DELIVERY</span><strong>−${money(DELIVERY_CHARGE)}</strong></div>` : ""}
    ${pointsDiscount > 0 ? `<div class="checkout-summary-item"><span>CRAVING POINTS REDEEMED (${selectedPointsToRedeem})</span><strong>−${money(pointsDiscount)}</strong></div>` : ""}
    ${selectedReward?.kind === "bonus-points" ? `<div class="checkout-summary-item"><span>CRAVING POINTS BONUS</span><strong>+${selectedReward.points}</strong></div>` : ""}
    ${selectedReward?.kind === "double-points" ? `<div class="checkout-summary-item"><span>DOUBLE CRAVING POINTS REWARD</span><strong>Up to +${selectedReward.maxBonusPoints}</strong></div>` : ""}
    <div class="checkout-summary-item checkout-points-estimate"><span>CRAVING POINTS YOU’LL EARN</span><strong>+${estimatedPoints} pts</strong></div>
    <p class="checkout-points-note">Added to your balance once your order is ${isPickupSelected() ? "completed" : "delivered"}. Regular items earn 1 Craving Point per ₹10; combos earn 1 per ₹20.</p>

    <div class="checkout-summary-total">

      <span>TOTAL</span>

      <strong>
        ${money(total)}
      </strong>

    </div>
  `;
}


async function openCheckout() {
  let accountWarning = "";

  if (!ONLINE_CHECKOUT_ENABLED) {

    alert(
      "ONLINE CHECKOUT IS CURRENTLY UNAVAILABLE.\n\n" +
      "Please try again later or continue browsing the menu."
    );

    return;
  }
  if (!cart.length) {

    alert(
      "YOUR CART IS EMPTY. Please add something to your order."
    );

    return;
  }


  if (!isCustomerSignedIn()) {

    openCustomerLogin();

    return;
  }

  // Keep checkout, cart, points, and the first-order gift in sync by waiting
  // for the active Firebase account data before building the checkout bill.
  if (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded) {
    if (checkoutAccountCheckPending) return;
    checkoutAccountCheckPending = true;
    if (placeOrderButton) {
      placeOrderButton.disabled = true;
      placeOrderButton.textContent = "CHECKING YOUR ACCOUNT…";
    }
    if (placeOrderNote) placeOrderNote.textContent = "Checking your Craving Points and first-order gift…";
    try {
      await refreshAccountScreens(currentCustomerUser());
    } finally {
      checkoutAccountCheckPending = false;
      updatePlaceOrderButton();
    }
    if (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded || customerAccountLoadFailed) {
      accountWarning = `Your login is active, but account details couldn’t load (${customerAccountLoadDiagnostic || "account-read-failed"}). You can enter your address; the order will wait until account verification succeeds.`;
      if (placeOrderNote) placeOrderNote.textContent = accountWarning;
      if (cartOverlay?.classList.contains("active")) renderCart();
    }
    if (cartOverlay?.classList.contains("active")) renderCart();
  }

  prefillCheckoutFromDefaultAddress();
  updateCheckoutFulfillmentUI();

  if (!checkoutOverlay.classList.contains("open")) {
    checkoutReturnFocus = document.activeElement;
  }


  renderCheckoutSummary();

  checkoutMessage.textContent = accountWarning;

  checkoutOverlay.classList.add("open");

  checkoutOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "checkout-open"
  );


  setTimeout(() => {

    checkoutName.focus();

  }, 100);
}


function closeCheckout() {

  if (document.activeElement && checkoutOverlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  checkoutOverlay.classList.remove("open");

  checkoutOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "checkout-open"
  );

  const returnFocus = checkoutReturnFocus;
  checkoutReturnFocus = null;
  if (returnFocus?.isConnected && !returnFocus.disabled) {
    returnFocus.focus({ preventScroll: true });
  }
}


function validateCheckoutForm() {

  const name =
    checkoutName.value.trim();

  const pickup = isPickupSelected();

  const address =
    checkoutAddress.value.trim();

  const area =
    checkoutArea.value;


  if (name.length < 2) {

    checkoutMessage.textContent =
      "Please enter your name.";

    checkoutName.focus();

    return false;
  }


  if (!pickup && address.length < 8) {

    checkoutMessage.textContent =
      "Please enter your complete delivery address.";

    checkoutAddress.focus();

    return false;
  }


  if (!pickup && !area) {

    checkoutMessage.textContent =
      "Please select your area.";

    checkoutArea.focus();

    return false;
  }

  if (!pickup && !checkoutAddressLabel.value) {
    checkoutMessage.textContent = "Choose whether this address is Home, Work, or Other.";
    checkoutAddressLabel.focus();
    return false;
  }


  return true;
}


async function continueToOrder() {
  checkoutMessage.textContent = "";
  if (!orderAvailabilityReady || !orderAvailability.acceptingOnlineOrders) {
    checkoutMessage.textContent = !orderAvailability.staffEnabled
      ? "We’re getting ready to serve you! Online ordering will open when our team is ready. Please check back soon—we’d love to make your favourites!"
      : orderAvailability.paused
      ? "We’re preparing a rush of fresh orders right now. Please check back in a little while—we’d love to serve you soon!"
      : "We’re closed for now, but we’ll be back soon with your favourites. Please check back a little later!";
    return;
  }
  if (!validateCheckoutForm()) return;

  const user = currentCustomerUser();
  const pickup = isPickupSelected();
  if (!user) {
    checkoutMessage.textContent = "Your login session has expired. Please log in again.";
    return;
  }
  if (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded || customerAccountLoadFailed) {
    checkoutSubmit.disabled = true;
    checkoutSubmit.textContent = "CHECKING ACCOUNT…";
    try {
      await refreshAccountScreens(user);
    } finally {
      checkoutSubmit.disabled = false;
      checkoutSubmit.textContent = "PLACE ORDER";
    }
    if (!loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded || customerAccountLoadFailed) {
      checkoutMessage.textContent = `Account details still couldn’t load (${customerAccountLoadDiagnostic || "account-read-failed"}). Your login remains active. Please retry the account check before placing this order.`;
      return;
    }
    renderCheckoutSummary();
  }
  if (!window.FirebaseFunctionsAPI?.httpsCallable || !window.firebaseFunctions) {
    checkoutMessage.textContent = "The secure order service is not ready. Please try again later.";
    return;
  }

  checkoutSubmit.disabled = true;
  checkoutSubmit.textContent = "CREATING ORDER…";
  try {
    if (!activeOrderRequestId) {
      activeOrderRequestId = crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    const createOrder = window.FirebaseFunctionsAPI.httpsCallable(window.firebaseFunctions, "createOrder");
    const response = await createOrder({
      requestId: activeOrderRequestId,
      customerName: checkoutName.value.trim(),
      orderType: pickup ? "pickup" : "delivery",
      address: pickup ? "" : checkoutAddress.value.trim(),
      addressId: pickup ? "" : (checkoutSavedAddress?.value || (crypto.randomUUID ? crypto.randomUUID() : `addr_${Date.now()}_${Math.random().toString(36).slice(2)}`)),
      addressLabel: pickup ? "" : checkoutAddressLabel.value,
      landmark: pickup ? "" : checkoutLandmark.value.trim(),
      area: pickup ? "" : checkoutArea.value,
      paymentMethod: pickup ? "Pay on Pickup" : "Pay on Delivery",
      loyaltyRewardId: selectedMilestoneRewardId || "",
      redeemPoints: selectedPointsToRedeem,
      applyFirstOrderReward: selectedWelcomeOffer,
      items: cart.map(item => ({
        name: item.name,
        qty: item.qty,
        isFreeOffer: !!item.isFreeOffer,
        freeOfferId: item.freeOfferId || ""
      }))
    });
    const order = response.data;
    if (!order?.orderId || !Array.isArray(order.items)) throw new Error("The order service returned an invalid confirmation.");
    if (order.welcomeUsed === true && user.uid) {
      try {
        localStorage.setItem("cravingHeavenLastCustomerUid_v1", user.uid);
        localStorage.setItem(`cravingHeavenWelcomeOrderPlaced_${user.uid}`, "1");
      } catch (_) { /* The server remains the source of truth for offer eligibility. */ }
    }

    cart = order.items.map(item => ({
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      isFreeOffer: !!item.isFreeOffer,
      isCombo: !!item.isCombo
    }));
    activeOrderRequestId = null;
    cart = [];
    selectedFreeOfferId = null;
    selectedMilestoneRewardId = null;
    selectedPointsToRedeem = 0;
    selectedWelcomeOffer = false;
    closeCheckout();
    closeCart();
    render();
    openOrderSuccess(order.orderId, pickup ? "pickup" : "delivery", order.addressSaved === true, checkoutAddressLabel?.value || "", order.orderNumber || "", order.isTestOrder === true);
    refreshAccountScreens(currentCustomerUser());
  } catch (error) {
    console.error("Order creation failed:", error);
    const code = error?.code || "";
    checkoutMessage.textContent = code === "functions/failed-precondition" && /rush|high order volume|closed right now/i.test(error?.message || "")
      ? error.message
      : code.includes("not-found") || code.includes("unavailable")
      ? "The secure order service is not available yet. Please try again later."
      : error?.message || "Unable to create your order. Please try again.";
  } finally {
    checkoutSubmit.disabled = false;
    checkoutSubmit.textContent = "PLACE ORDER";
  }
}


// ================= CHECKOUT EVENTS =================

if (checkoutClose) {

  checkoutClose.addEventListener(
    "click",
    closeCheckout
  );
}


if (checkoutOverlay) {

  checkoutOverlay.addEventListener(
    "click",
    event => {

      if (
        event.target === checkoutOverlay
      ) {

        closeCheckout();

      }

    }
  );
}


if (checkoutForm) {

  checkoutForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      continueToOrder();

    }
  );
}

document.querySelectorAll('input[name="fulfillmentType"]').forEach(input => {
  input.addEventListener("change", updateCheckoutFulfillmentUI);
});


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      checkoutOverlay &&
      checkoutOverlay.classList.contains("open")
    ) {

      closeCheckout();

    }

  }
);



  // =========================================================
  // END CUSTOMER PHONE LOGIN / FIREBASE OTP
  // =========================================================
  
const FREE_OFFERS = Object.freeze({});

let selectedFreeOfferId = null;
let selectedMilestoneRewardId = null;
let selectedPointsToRedeem = 0;
let selectedWelcomeOffer = false;
let customerHasOrderedOnline = false;
let lastCustomerAuthUid = "";
function firstOrderWelcomeEligible() {
  const account = currentLoyaltyAccount || {};
  return isCustomerSignedIn() && loyaltyAccountLoaded && customerOnlineOrderHistoryLoaded
    && !customerHasOrderedOnline && account.welcomeCompleted !== true && !account.welcomeReservationId
    && orderAvailability.isTestCustomer !== true;
}

  const nav = document.getElementById("categoryNav");
  const sectionsRoot = document.getElementById("menuSections");
  const comboMenuRoot = document.getElementById("comboMenuGrid");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartItemsEl = document.getElementById("cartItems");
  const cartSummaryEl = document.getElementById("cartSummary");
  const cartCountEl = document.getElementById("cartCount");
  const clearCartButton = document.getElementById("clearCart");
  const customerBottomNav = document.querySelector(".customer-bottom-nav");
  const categoryNavigation = document.getElementById("categoryNav");
  const ordersContent = document.getElementById("ordersContent");
  const profileContent = document.getElementById("profileContent");
  const savedAddresses = document.getElementById("savedAddresses");
  const addressForm = document.getElementById("addressForm");
  const addressArea = document.getElementById("addressArea");
  const addressMessage = document.getElementById("addressMessage");
  let currentCustomerProfile = { addresses: [] };
let pendingGpsCoordinates = null;
  let currentLoyaltyAccount = { points: 0, completedOrders: 0, availableRewards: [] };
  let loyaltyAccountLoaded = false;
  let customerAccountLoadFailed = false;
  let customerAccountLoadDiagnostic = "";
  let accountRefreshToken = 0;
  let checkoutAccountCheckPending = false;
  

  const CART_STORAGE_KEY = "cravingHeavenCartV1";
  const validCartPrices = new Map();
  for (const section of Object.values(MENU_DATA)) {
    for (const item of section.items) {
      if (item.options) {
        for (const option of item.options) validCartPrices.set(option.name, Number(option.price));
      } else {
        validCartPrices.set(item.name, Number(item.price));
      }
    }
  }
  for (const combo of COMBO_MENU_DATA) validCartPrices.set(combo.name, Number(combo.price));

  function loadCart() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.flatMap(item => {
        const name = typeof item?.name === "string" ? item.name : "";
        const price = validCartPrices.get(name);
        const qty = Number(item?.qty);
        if (price === undefined || Number(item?.price) !== price || !Number.isSafeInteger(qty) || qty < 1 || qty > 99) return [];
        return [{ name, price, qty, isCombo: COMBO_MENU_DATA.some(combo => combo.name === name) }];
      });
    } catch {
      return [];
    }
  }

  let cart = loadCart();
  let activeCategory = "";
  let activeOrderRequestId = null;

  const esc = (value) => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));

  const money = value => `₹${Number(value).toLocaleString("en-IN")}`;

  function cartItem(name, price) {
    return cart.find(item => item.name === name && item.price === price);
  }
  function isSundayInMumbai() { 
  const sundayDay = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long"
  }).format(new Date());

  return sundayDay === "Sunday";
}

  function setActiveCategory(id, scrollIntoView = false) {
    activeCategory = id;

    nav.querySelectorAll("a").forEach(link => {
      const isActive = link.dataset.category === id;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (scrollIntoView) {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function renderNav() {
    nav.innerHTML = Object.entries(MENU_DATA).map(([id, section]) => {
      const shortTitle = section.title
        .replace(/^CRAVING\s+/i, "")
        .replace(/^LOADED\s+/i, "")
        .replace(/^CHICKEN\s+/i, "")
        .replace(/^HOT\s+/i, "");

      return `<a href="#${esc(id)}" data-category="${esc(id)}">${esc(shortTitle)}</a>`;
    }).join("");
  }

  function renderMenu() {
    const categoryIcons = {
      burgers: "🍔", shawarma: "🌯", wraps: "🌯", bowls: "🥣", strips: "🍗",
      wings: "🍗", popcorn: "🍿", "signature-fries": "🍟", "french-fries": "🍟", extras: "🥣"
    };
    sectionsRoot.innerHTML = Object.entries(MENU_DATA).map(([id, section]) => {
      const cards = section.items.map(item => {
        const inCart = item.options ? null : cartItem(item.name, Number(item.price));
        const image = item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" onload="this.closest('.food-image').classList.remove('image-loading')" onerror="this.closest('.food-image').classList.remove('image-loading');this.closest('.food-image').classList.add('image-missing')">` : "";
        const description = String(item.description || "").trim();
        const showDescription = description && description.replace(/[.!?]+$/, "").toLocaleLowerCase() !== String(item.name).trim().toLocaleLowerCase();

        let controls;
        if (item.options) {
          controls = `
            <div class="options" role="group" aria-label="${esc(item.name)} options">
              ${item.options.map(option => {
                const optionPrice = Number(option.price);
                const optionInCart = cartItem(option.name, optionPrice);

                return optionInCart
                  ? `<div class="option-control">
                       <span class="option-selected-label">${esc(option.label)} — ${money(optionPrice)}</span>
                       <div class="option-qty-control">
                         <button type="button" data-action="minus" data-name="${esc(option.name)}" data-price="${optionPrice}" aria-label="Decrease ${esc(option.label)}">−</button>
                         <span class="option-qty">${optionInCart.qty}</span>
                         <button type="button" data-action="plus" data-name="${esc(option.name)}" data-price="${optionPrice}" aria-label="Increase ${esc(option.label)}">+</button>
                       </div>
                     </div>`
                  : `<button type="button" class="option" data-add="1" data-name="${esc(option.name)}" data-price="${optionPrice}" aria-label="Add ${esc(option.name)} for ${money(optionPrice)}"><span class="option-label">${esc(option.label)}</span><strong>${money(optionPrice)}</strong><span class="option-add-hint" aria-hidden="true">ADD +</span></button>`;
              }).join("")}
            </div>`;
        } else {
          controls = `
            <div class="product-bottom">
              <strong class="price">${money(item.price)}</strong>
              ${inCart
                ? `<div class="qty-control">
                     <button type="button" data-action="minus" data-name="${esc(item.name)}" data-price="${Number(item.price)}" aria-label="Decrease ${esc(item.name)}">−</button>
                     <span>${inCart.qty}</span>
                     <button type="button" data-action="plus" data-name="${esc(item.name)}" data-price="${Number(item.price)}" aria-label="Increase ${esc(item.name)}">+</button>
                   </div>`
                : `<button type="button" class="add-btn" data-add="1" data-name="${esc(item.name)}" data-price="${Number(item.price)}">ADD +</button>`}
            </div>`;
        }

        return `
          <article class="menu-card">
            <div class="food-image${item.image ? " image-loading" : " image-missing"}" data-category="${esc(id)}">
              ${image}
              <span class="image-fallback" aria-hidden="true"><span class="image-fallback-icon">${categoryIcons[id] || "✦"}</span></span>
            </div>
            <div class="card-content">
              <h3>${esc(item.name)}</h3>
              ${showDescription ? `<p>${esc(description)}</p>` : ""}
              ${controls}
            </div>
          </article>`;
      }).join("");

      return `
        <section class="menu-section" id="${esc(id)}">
          <div class="section-heading">
            <h2>${esc(section.title)}</h2>
            <span class="menu-category-count">${section.items.length} ${section.items.length === 1 ? "item" : "items"}</span>
          </div>
          <div class="menu-grid">${cards}</div>
        </section>`;
    }).join("");

    document.querySelectorAll(".food-image img").forEach(img => {
      const fallback = img.nextElementSibling;
      const update = () => {
        if (img.naturalWidth > 0) fallback.style.display = "none";
      };
      img.addEventListener("load", update, { once: true });
      update();
    });
    filterCustomerMenu(document.getElementById("customerMenuSearch")?.value || "");
  }

  function filterCustomerMenu(value) {
    const query = String(value || "").trim().toLocaleLowerCase();
    const sections = [...document.querySelectorAll("#menuSections .menu-section")];
    let visibleCount = 0;
    for (const section of sections) {
      let sectionCount = 0;
      const categoryLabel = section.querySelector(".section-heading h2")?.textContent.toLocaleLowerCase() || "";
      section.querySelectorAll(".menu-card").forEach(card => {
        const matches = !query || card.textContent.toLocaleLowerCase().includes(query) || categoryLabel.includes(query);
        card.hidden = !matches;
        if (matches) sectionCount += 1;
      });
      section.hidden = sectionCount === 0;
      visibleCount += sectionCount;
      const categoryLink = nav.querySelector(`[data-category="${section.id}"]`);
      if (categoryLink) categoryLink.hidden = query.length > 0 && sectionCount === 0;
    }
    const status = document.getElementById("customerMenuSearchStatus");
    if (status) status.textContent = query ? `${visibleCount} ${visibleCount === 1 ? "dish" : "dishes"} found` : "";
  }

  const customerMenuSearch = document.getElementById("customerMenuSearch");
  const clearCustomerMenuSearch = document.getElementById("clearCustomerMenuSearch");
  customerMenuSearch?.addEventListener("input", () => {
    filterCustomerMenu(customerMenuSearch.value);
    if (clearCustomerMenuSearch) clearCustomerMenuSearch.hidden = !customerMenuSearch.value;
  });
  clearCustomerMenuSearch?.addEventListener("click", () => {
    customerMenuSearch.value = "";
    clearCustomerMenuSearch.hidden = true;
    filterCustomerMenu("");
    customerMenuSearch.focus();
  });

  function renderComboMenu() {
    if (!comboMenuRoot) return;
    comboMenuRoot.innerHTML = COMBO_MENU_DATA.map(combo => {
      const comboPrice = Number(combo.price);
      const inCart = cartItem(combo.name, comboPrice);
      return `
      <article class="combo-menu-card">
        <div class="combo-menu-image${combo.image ? "" : " image-missing"}" data-fallback="${esc(combo.name)}">${combo.image ? `<img src="${esc(combo.image)}" alt="${esc(combo.name)}" loading="lazy" onerror="this.closest('.combo-menu-image').classList.add('image-missing')">` : ""}<span>SAVE ${money(combo.value - combo.price)}</span></div>
        <div class="combo-menu-content">
          <h3>${esc(combo.name)}</h3>
          <ul>${combo.items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
          <div class="combo-menu-footer">
            <div class="combo-menu-prices">
              <div><span>MENU VALUE</span><del>${money(combo.value)}</del></div>
              <div><span>YOU SAVE</span><strong>${money(combo.value - combo.price)}</strong></div>
              <div class="combo-price-total"><span>COMBO PRICE</span><b>${money(comboPrice)}</b></div>
            </div>
            ${inCart
              ? `<div class="combo-cart-control"><span>IN YOUR CART</span><div class="qty-control"><button type="button" data-action="minus" data-name="${esc(combo.name)}" data-price="${comboPrice}" aria-label="Remove one ${esc(combo.name)}">−</button><span>${inCart.qty}</span><button type="button" data-action="plus" data-name="${esc(combo.name)}" data-price="${comboPrice}" aria-label="Add one ${esc(combo.name)}">+</button></div></div>`
              : `<button type="button" class="add-btn combo-add-btn" data-add="1" data-name="${esc(combo.name)}" data-price="${comboPrice}" aria-label="Add ${esc(combo.name)} to cart">ADD COMBO TO CART</button>`}
          </div>
        </div>
      </article>`;
    }).join("");
  }
 function getMumbaiDay() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long"
  }).format(new Date());
}

function getPaidSubtotal() {
  return cart.reduce((sum, item) => {
    if (item.isFreeOffer) return sum;
    return sum + item.price * item.qty;
  }, 0);
}

function estimatePointsForCurrentOrder(selectedReward = getSelectedMilestoneReward(), eligibleSubtotal = getOfferEligibleSubtotal()) {
  const { regularSubtotal, comboSubtotal } = cart.reduce((totals, item) => {
    if (item.isFreeOffer) return totals;
    const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
    const isCombo = item.isCombo || COMBO_MENU_DATA.some(combo => combo.name === item.name);
    if (isCombo) totals.comboSubtotal += lineTotal;
    else if (!REWARD_EXCLUDED_NAMES.has(item.name)) totals.regularSubtotal += lineTotal;
    return totals;
  }, { regularSubtotal: 0, comboSubtotal: 0 });

  const promotionDiscount = (selectedReward?.kind === "discount" ? selectedReward.amount : 0) + gameRewardDiscount(selectedReward, eligibleSubtotal);
  const pointsDiscount = selectedPointsToRedeem / REWARDS_CONFIG.pointsPerRedemptionRupees * 10;
  const regularPoints = Math.floor(Math.max(0, regularSubtotal - promotionDiscount - pointsDiscount) / REWARDS_CONFIG.pointRateRegularRupees);
  const comboPoints = Math.floor(comboSubtotal / REWARDS_CONFIG.pointRateComboRupees);
  const basePoints = regularPoints + comboPoints;

  if (selectedReward?.kind === "bonus-points") return basePoints + Number(selectedReward.points || 0);
  if (selectedReward?.kind === "double-points") return basePoints + Math.min(basePoints, Number(selectedReward.maxBonusPoints || 0));
  return basePoints;
}

function getOfferEligibleSubtotal() {
  return cart.reduce((sum, item) => {
    if (item.isFreeOffer || item.isCombo || COMBO_MENU_DATA.some(combo => combo.name === item.name)) return sum;
    if (REWARD_EXCLUDED_NAMES.has(item.name)) return sum;
    return sum + item.price * item.qty;
  }, 0);
}

function getBurgerCount() {
  return cart.reduce((count, item) => {
    if (item.isFreeOffer || item.isCombo || COMBO_MENU_DATA.some(combo => combo.name === item.name)) return count;

    if (item.name.trim().toLowerCase() === "classic crunchy burger") {
      return count + item.qty;
    }

    return count;
  }, 0);
}

function isOfferDay(offer) {
  const today = getMumbaiDay();
  return offer.days.includes(today);
}

function isOfferQualified(offer, eligibleSubtotal, burgerCount) {
  if (!isOfferDay(offer)) return false;

  if (offer.type === "subtotal") {
    return eligibleSubtotal >= offer.threshold;
  }

  if (offer.type === "burger-count") {
    return burgerCount >= offer.requiredQty;
  }

  return false;
}

function removeSelectedFreeOffer() {
  cart = cart.filter(item => !item.isFreeOffer);
  selectedFreeOfferId = null;
}

function getSelectedMilestoneReward() {
  const reward = currentLoyaltyAccount.availableRewards?.find(item => (item.ticketId || item.id) === selectedMilestoneRewardId);
  if (!reward) return null;
  if (reward.expiresAt) {
    const expiry = reward.expiresAt?.toDate ? reward.expiresAt.toDate() : new Date(reward.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) return null;
  }
  return REWARDS_CONFIG.rewardById[reward.id] || (["craving-dash", "craving-runner"].includes(reward.source) && ["free-item", "percent-discount"].includes(reward.kind) ? reward : null);
}

function gameRewardDiscount(reward = getSelectedMilestoneReward(), eligibleSubtotal = getOfferEligibleSubtotal()) {
  if (reward?.kind !== "percent-discount" || eligibleSubtotal < Number(reward.minimum || 0)) return 0;
  const amount = Math.floor(eligibleSubtotal * Number(reward.percent || 0) / 100);
  const cap = Number(reward.maxDiscount || 0);
  return Math.max(0, Math.min(amount, cap > 0 ? cap : eligibleSubtotal));
}

function hasComboInCart() {
  return cart.some(item => !item.isFreeOffer && (item.isCombo || COMBO_MENU_DATA.some(combo => combo.name === item.name)));
}

function selectFreeOffer(offerId) {
  if (orderAvailability.isTestCustomer) return;
  const offer = FREE_OFFERS[offerId];

  if (!offer) return;

  const subtotal = getOfferEligibleSubtotal();
  const burgerCount = getBurgerCount();

  if (!isOfferQualified(offer, subtotal, burgerCount)) {
    return;
  }

  // Remove any previously selected free offer.
  removeSelectedFreeOffer();
  selectedMilestoneRewardId = null;
  selectedPointsToRedeem = 0;
  selectedWelcomeOffer = false;

  // Add the newly selected free offer.
  cart.push({
    name: offer.freeItem,
    price: offer.freePrice,
    qty: 1,
    isFreeOffer: true,
    freeOfferId: offer.id
  });

  selectedFreeOfferId = offer.id;

  render();
}

function selectMilestoneReward(rewardId) {
  if (orderAvailability.isTestCustomer) return;
  const ticket = currentLoyaltyAccount.availableRewards?.find(item => (item.ticketId || item.id) === rewardId);
  const definition = ticket ? (REWARDS_CONFIG.rewardById[ticket.id] || (["craving-dash", "craving-runner"].includes(ticket.source) && ["free-item", "percent-discount"].includes(ticket.kind) ? ticket : null)) : null;
  if (!definition || !ticket) return;
  const eligibleSubtotal = getOfferEligibleSubtotal();
  const rewardSpend = definition.kind === "free-delivery" ? getPaidSubtotal() : eligibleSubtotal;
  if (rewardSpend < Number(definition.minimum || 0)) return;
  if (definition.kind === "percent-discount" && gameRewardDiscount(definition, eligibleSubtotal) <= 0) return;
  if (definition.kind === "free-delivery" && getPaidSubtotal() >= FREE_DELIVERY_THRESHOLD) return;
  removeSelectedFreeOffer();
  selectedPointsToRedeem = 0;
  selectedWelcomeOffer = false;
  selectedMilestoneRewardId = rewardId;
  render();
}

function selectPointsRedemption(points) {
  if (orderAvailability.isTestCustomer) return;
  const balance = Math.max(0, Number(currentLoyaltyAccount.points || 0));
  const eligibleSubtotal = getOfferEligibleSubtotal();
  const maxByEligibleFood = Math.floor(eligibleSubtotal / 10) * 100;
  const next = Math.max(0, Math.min(REWARDS_CONFIG.maxRedeemPointsPerOrder, balance, maxByEligibleFood, Math.floor(Number(points) / 100) * 100));
  selectedPointsToRedeem = next;
  if (next) {
    removeSelectedFreeOffer();
    selectedMilestoneRewardId = null;
    selectedWelcomeOffer = false;
  }
  render();
}
function renderCart() {
  const subtotal = getPaidSubtotal();
  const offerEligibleSubtotal = getOfferEligibleSubtotal();
  const burgerCount = getBurgerCount();
  let selectedReward = getSelectedMilestoneReward();
  const comboPresent = hasComboInCart();
  const isTestOrder = orderAvailability.isTestCustomer === true;
  const placeOrderNote = document.getElementById("placeOrderNote");

  // Test orders are deliberately isolated from offers, rewards and loyalty.
  // Clear any selection carried into test mode so the cart matches server rules.
  if (isTestOrder) {
    removeSelectedFreeOffer();
    selectedMilestoneRewardId = null;
    selectedPointsToRedeem = 0;
    selectedWelcomeOffer = false;
    selectedReward = null;
  }

  if (placeOrderNote) {
      placeOrderNote.textContent = isCustomerSignedIn()
      ? "Continue to checkout to add or choose your delivery details."
      : !customerAuthStateResolved ? "Checking your sign-in…" : "Log in with your mobile number to continue with your order.";
  }

  if (selectedMilestoneRewardId && !selectedReward) {
    selectedMilestoneRewardId = null;
    selectedReward = null;
  }
  if (selectedReward) {
    const rewardSpend = selectedReward.kind === "free-delivery" ? subtotal : offerEligibleSubtotal;
    const rewardIsNoLongerEligible = rewardSpend < Number(selectedReward.minimum || 0)
      || (selectedReward.kind === "free-delivery" && (subtotal >= FREE_DELIVERY_THRESHOLD || isPickupSelected()))
      || (selectedReward.kind === "percent-discount" && gameRewardDiscount(selectedReward, offerEligibleSubtotal) <= 0);
    if (rewardIsNoLongerEligible) {
      selectedMilestoneRewardId = null;
      selectedReward = null;
    }
  }
  const maxRedeemablePoints = Math.min(REWARDS_CONFIG.maxRedeemPointsPerOrder, Math.max(0, Number(currentLoyaltyAccount.points || 0)), Math.floor(offerEligibleSubtotal / 10) * 100);
  if (selectedPointsToRedeem > maxRedeemablePoints) selectedPointsToRedeem = maxRedeemablePoints;
  const welcomeHasCompetingBenefit = Boolean(selectedFreeOfferId || selectedMilestoneRewardId || selectedPointsToRedeem);
  const welcomeEligible = firstOrderWelcomeEligible() && offerEligibleSubtotal > 0;
  if (!welcomeEligible) selectedWelcomeOffer = false;
  else if (welcomeHasCompetingBenefit) selectedWelcomeOffer = false;
  else selectedWelcomeOffer = true;

  if (selectedFreeOfferId) {
    const selectedOffer = FREE_OFFERS[selectedFreeOfferId];
    if (!selectedOffer || !isOfferQualified(selectedOffer, offerEligibleSubtotal, burgerCount)) {
      removeSelectedFreeOffer();
    }
  }

  // Calculate points after offer selection is normalized so the cart estimate
  // includes the discount that checkout and the server use.
  const estimatedPoints = estimatePointsForCurrentOrder(selectedReward, offerEligibleSubtotal);

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0) + (selectedReward?.kind === "free-item" || selectedWelcomeOffer ? 1 : 0);

  const delivery = selectedReward?.kind === "free-delivery" || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const promotionDiscount = (selectedReward?.kind === "discount" ? selectedReward.amount : 0) + gameRewardDiscount(selectedReward, offerEligibleSubtotal);
  const pointsDiscount = selectedPointsToRedeem / REWARDS_CONFIG.pointsPerRedemptionRupees * 10;
  const total = Math.max(0, subtotal - promotionDiscount - pointsDiscount + delivery);

  cartCountEl.textContent = totalQty;
  document.getElementById("cartButton").hidden = totalQty === 0;
  clearCartButton.hidden = cart.length === 0;

  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart-wrap">
        <div class="empty-cart-icon">🛒</div>
        <p class="empty-cart">YOUR CART IS EMPTY</p>
        <span>Add something delicious to get started.</span>
      </div>`;

    cartSummaryEl.innerHTML = "";
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, index) => {
    const lineTotal = item.price * item.qty;
    const comboDetails = COMBO_MENU_DATA.find(combo => combo.name === item.name);

    if (item.isFreeOffer) {
      return `
        <div class="cart-item sunday-freebie">
          <div class="cart-item-info">
            <div class="cart-name">
              🎁 ${esc(item.name)}
            </div>

            <div class="cart-meta">
              <strong style="color: #16a34a;">
                FREE — ₹0
              </strong>
            </div>
          </div>

          <div class="cart-free-label">
            FREE
          </div>
        </div>`;
    }

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-name">${esc(item.name)}</div>

          ${comboDetails ? `<p class="cart-combo-discount-note" role="note">Already discounted — extra offers and point redemption don’t apply to this combo.</p><div class="cart-combo-includes"><strong>INCLUDES</strong><ul>${comboDetails.items.map(comboItem => `<li>${esc(comboItem)}</li>`).join("")}</ul></div>` : ""}

          <div class="cart-meta">
            ${money(item.price)} × ${item.qty} =
            <strong>${money(lineTotal)}</strong>
          </div>
        </div>

        <div class="cart-controls">
          <button
            type="button"
            data-action="minus"
            data-cart-index="${index}"
            aria-label="Decrease item"
          >−</button>

          <span>${item.qty}</span>

          <button
            type="button"
            data-action="plus"
            data-cart-index="${index}"
            aria-label="Increase item"
          >+</button>
        </div>
      </div>`;
  }).join("") + (selectedReward?.kind === "free-item" ? `<div class="cart-item sunday-freebie"><div class="cart-item-info"><div class="cart-name">🎁 ${esc(selectedReward.item)}</div><div class="cart-meta"><span>₹0</span><strong style="color:#16804a">FREE · REWARD ADDED</strong></div></div><div class="cart-free-label">FREE</div></div>` : "") + (selectedWelcomeOffer ? `<div class="cart-item sunday-freebie"><div class="cart-item-info"><div class="cart-name">🎁 ${esc(REWARDS_CONFIG.welcomeItem)}</div><div class="cart-meta"><span>₹0</span><strong style="color:#16804a">FREE · FIRST-ORDER GIFT</strong></div></div><div class="cart-free-label">FREE</div></div>` : "");

  // ====================== FREE OFFER SELECTOR ======================

  const offerCards = Object.values(FREE_OFFERS)
    .filter(offer => isOfferDay(offer))
    .map(offer => {

      const qualified = isOfferQualified(
        offer,
        offerEligibleSubtotal,
        burgerCount
      );

      const selected = selectedFreeOfferId === offer.id;

      let statusText = "";
      let buttonText = "";

      if (qualified) {
        statusText = `🎁 GET ${offer.freeItem} FREE`;

        buttonText = selected
          ? "✓ SELECTED"
          : "ADD TO CART";
      } else {

        if (offer.type === "subtotal") {
          const remaining = Math.max(
            0,
            offer.threshold - offerEligibleSubtotal
          );

          statusText =
            `🔒 Add <strong>${money(remaining)}</strong> more to GET ${offer.freeItem} FREE`;
        }

        if (offer.type === "burger-count") {
          const remaining = Math.max(
            0,
            offer.requiredQty - burgerCount
          );

          statusText =
            remaining === 1
              ? `🔒 Add <strong>1 more CRUNCHY CHICKEN BURGER</strong> to GET ${offer.freeItem} FREE`
              : `🔒 Add <strong>${remaining} CRUNCHY CHICKEN BURGERS</strong> to GET ${offer.freeItem} FREE`;
        }

        buttonText = "LOCKED";
      }

      return `
        <div class="free-offer-card ${qualified ? "offer-qualified" : "offer-locked"} ${selected ? "offer-selected" : ""}">

          <div class="free-offer-top">
            <div>
              <span class="free-offer-kicker">
                ${qualified ? "🎁 OFFER AVAILABLE" : "🔒 OFFER LOCKED"}
              </span>

              <h3>${esc(offer.name)}</h3>

              <p>${esc(offer.requirement)}</p>
            </div>

            ${selected
              ? `<span class="free-offer-check">✓</span>`
              : ""}
          </div>

          <div class="free-offer-reward">
${esc(offer.freeItem)}
          </div>

          <div class="free-offer-status">
            ${statusText}
          </div>

          ${qualified
            ? `<button
                type="button"
                class="free-offer-button"
                data-select-free-offer="${esc(offer.id)}"
              >
                ${buttonText}
              </button>`
            : `<button
                type="button"
                class="free-offer-button free-offer-button-locked"
                disabled
              >
                ${buttonText}
              </button>`
          }

        </div>`;
    })
    .join("");

  const freeOfferSelector = !isTestOrder && offerCards ? `
    <div class="free-offers-box">
      <div class="free-offers-heading">
        <span>🎁 SPECIAL OFFERS</span>
        <strong>ONE BENEFIT PER ORDER</strong>
        <p>Choose one offer, reward, or points redemption per order. Combo eligibility depends on the reward.</p>
      </div>

      ${offerCards}
    </div>
  ` : "";

  const availableRewardCards = (currentLoyaltyAccount.availableRewards || []).filter(reward => {
    if (!reward.expiresAt) return true;
    const expiry = reward.expiresAt?.toDate ? reward.expiresAt.toDate() : new Date(reward.expiresAt);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
  }).map(reward => {
    const definition = REWARDS_CONFIG.rewardById[reward.id] || (["craving-dash", "craving-runner"].includes(reward.source) && ["free-item", "percent-discount"].includes(reward.kind) ? reward : null);
    if (!definition) return "";
    const rewardTicketId = reward.ticketId || reward.id;
    const chosen = selectedMilestoneRewardId === rewardTicketId;
    const rewardSpend = definition.kind === "free-delivery" ? subtotal : offerEligibleSubtotal;
    const remaining = Math.max(0, Number(definition.minimum || 0) - rewardSpend);
    const eligible = remaining === 0 && !(definition.kind === "free-delivery" && (subtotal >= FREE_DELIVERY_THRESHOLD || isPickupSelected())) && !(definition.kind === "percent-discount" && gameRewardDiscount(definition, offerEligibleSubtotal) <= 0);
    const rewardDescription = definition.kind === "free-item" ? `${definition.item} free${["craving-dash", "craving-runner"].includes(reward.source) ? " · expires 48 hours after earning" : ""}` : definition.kind === "percent-discount" ? `${Number(definition.percent)}% off eligible regular menu items${Number(definition.maxDiscount) ? ` · up to ${money(definition.maxDiscount)}` : ""}${["craving-dash", "craving-runner"].includes(reward.source) ? " · expires after 48 hours" : ""}` : definition.kind === "free-delivery" ? "Free delivery" : definition.kind === "discount" ? `${money(definition.amount)} off` : definition.kind === "bonus-points" ? `${definition.points} Craving Points on delivery` : `Double Craving Points, up to ${definition.maxBonusPoints} extra`;
    const statusNote = definition.kind === "free-delivery" && isPickupSelected() ? "Free-delivery rewards can only be used for delivery." : remaining > 0 ? `Add ${money(remaining)} to your food subtotal to use this reward${definition.kind === "free-delivery" ? "; combos and regular items count" : " in regular menu items"}.` : definition.kind === "percent-discount" && gameRewardDiscount(definition, offerEligibleSubtotal) <= 0 ? "Add regular menu items to use this discount; combos, extras, and delivery are excluded." : definition.kind === "percent-discount" ? "Discount applies to regular menu items only. Combos, extras, and delivery are excluded." : definition.kind === "free-delivery" && subtotal >= FREE_DELIVERY_THRESHOLD ? "Your order already qualifies for free delivery. Save this reward for another order." : "";
    const expiryLabel = reward.expiresAt ? ` · use by ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(reward.expiresAt?.toDate ? reward.expiresAt.toDate() : new Date(reward.expiresAt))}` : "";
    return `<article class="cart-reward-choice ${chosen ? "is-selected" : ""}"><div><strong>${esc(definition.title)}</strong><small>${esc(rewardDescription)} · ${esc(definition.detail || "")}${esc(expiryLabel)}</small>${statusNote ? `<small class="reward-remaining">${esc(statusNote)}</small>` : ""}</div><button type="button" data-select-loyalty-reward="${esc(rewardTicketId)}" ${!eligible ? "disabled" : ""}>${chosen ? "SELECTED" : eligible ? "USE REWARD" : "LOCKED"}</button></article>`;
  }).filter(Boolean).join("");
  const rewardWallet = !isTestOrder && availableRewardCards ? `<div class="cart-benefit-box"><strong>YOUR ROYAL REWARDS</strong>${availableRewardCards}</div>` : "";

  const welcomeOfferAlreadyUsed = currentLoyaltyAccount.welcomeCompleted === true || Boolean(currentLoyaltyAccount.welcomeReservationId) || customerHasOrderedOnline || hasLocalWelcomeOrderMarker();
  const showFirstOrderWelcomeCard = !isTestOrder && !welcomeOfferAlreadyUsed;
  const welcomeOfferNote = !customerAuthStateResolved
    ? "Checking your sign-in…"
    : !isCustomerSignedIn()
    ? "Sign in to check eligibility. Add a regular menu item to your first online order and the burger will be free."
    : customerAccountLoadFailed
      ? `Your login is active, but account details couldn’t load. Tap RETRY; if it continues, share this check code: ${customerAccountLoadDiagnostic || "account-read-failed"}.`
    : !loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded
      ? "We’re checking your account so we can confirm this first-order gift."
      : !welcomeEligible
        ? "Add any regular menu item to claim the gift. Combos and extras alone don’t qualify."
        : welcomeHasCompetingBenefit
          ? "Only one offer or reward can be used per order. Choose the free burger instead to add it."
          : `Your free ${REWARDS_CONFIG.welcomeItem} is included below at ₹0.`;
  const firstOrderWelcomeCard = showFirstOrderWelcomeCard ? `<div class="cart-first-order-reward"><div class="cart-first-order-icon" aria-hidden="true">🎁</div><div class="cart-first-order-copy"><span>FIRST ONLINE ORDER GIFT</span><strong>${esc(REWARDS_CONFIG.welcomeItem)} · FREE</strong><p>${esc(welcomeOfferNote)}</p></div>${!customerAuthStateResolved ? `<span class="cart-first-order-added">CHECKING</span>` : !isCustomerSignedIn() ? `<button type="button" data-account-login>SIGN IN</button>` : customerAccountLoadFailed ? `<button type="button" data-reload-account>RETRY</button>` : welcomeEligible && welcomeHasCompetingBenefit ? `<button type="button" data-select-welcome>USE GIFT</button>` : welcomeEligible && selectedWelcomeOffer ? `<span class="cart-first-order-added">ADDED</span>` : !loyaltyAccountLoaded || !customerOnlineOrderHistoryLoaded ? `<span class="cart-first-order-added">CHECKING</span>` : ""}</div>` : "";

  const welcomeCard = "";
  const pointsBalance = Math.max(0, Number(currentLoyaltyAccount.points || 0));
  const cartPointsBalance = `<div class="cart-points-balance"><span>YOUR CRAVING POINTS</span><strong>${!customerAuthStateResolved ? "Checking sign-in…" : !isCustomerSignedIn() ? "Sign in to view" : loyaltyAccountLoaded ? `${pointsBalance.toLocaleString("en-IN")} pts` : "Temporarily unavailable"}</strong></div>`;
  const testOrderNotice = isTestOrder ? `<p class="test-order-notice">TEST MODE · No payment is due. This order won’t be prepared or sent to staff; offers, rewards and points can’t be used or earned.</p>` : "";
  const pointsAvailable = loyaltyAccountLoaded && !isTestOrder ? Math.floor(Math.min(REWARDS_CONFIG.maxRedeemPointsPerOrder, pointsBalance, offerEligibleSubtotal * 10) / 100) * 100 : 0;
  const pointsControls = isTestOrder ? "" : pointsAvailable > 0
    ? `<div class="cart-points-choice"><div><strong>Use Craving Points</strong><small>${pointsBalance.toLocaleString("en-IN")} Craving Points · up to ${money(pointsAvailable / 10)} off</small><small>${selectedMilestoneRewardId || selectedFreeOfferId || selectedWelcomeOffer ? "Using Craving Points replaces the selected offer or reward." : comboPresent ? "Points apply to eligible regular menu items only; combo and extra items stay full price." : "Choose Craving Points instead of another offer or reward."}</small></div><div class="points-stepper"><button type="button" data-points-step="-100" ${selectedPointsToRedeem <= 0 ? "disabled" : ""}>−</button><span>${selectedPointsToRedeem.toLocaleString("en-IN")}</span><button type="button" data-points-step="100" ${selectedPointsToRedeem >= pointsAvailable ? "disabled" : ""}>+</button></div></div>`
    : `<div class="cart-points-note">${comboPresent ? "Points can reduce regular menu items in a mixed order; add at least ₹10 of eligible regular food. Combo and extra items stay full price." : pointsBalance < 100 ? "Earn at least 100 Craving Points to redeem ₹10. Points are added after delivery or pickup completion." : "Add eligible regular menu food to use points. Points are added after delivery or pickup completion."}</div>`;

  // ====================== DELIVERY PROGRESS ======================

  const nextAvailableReward = (currentLoyaltyAccount.availableRewards || []).find(reward => {
    if (!reward.expiresAt) return true;
    const expiry = reward.expiresAt?.toDate ? reward.expiresAt.toDate() : new Date(reward.expiresAt);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
  });
  const nextRewardDefinition = nextAvailableReward
    ? REWARDS_CONFIG.rewardById[nextAvailableReward.id] || nextAvailableReward
    : null;
  const freeDeliveryRewardReady = !isTestOrder
    && !isPickupSelected()
    && subtotal < FREE_DELIVERY_THRESHOLD
    && nextRewardDefinition?.kind === "free-delivery"
    && subtotal >= Number(nextRewardDefinition.minimum || 0);

  const deliveryProgress = delivery === 0
    ? `<div class="free-progress free-progress-complete">${selectedReward?.kind === "free-delivery" ? `🎁 <strong>FREE DELIVERY REWARD APPLIED · SAVE ${money(DELIVERY_CHARGE)}</strong>` : "🎉 <strong>FREE DELIVERY!</strong>"}</div>`
    : freeDeliveryRewardReady
    ? `<div class="free-progress free-progress-complete">🎁 <strong>YOUR FREE-DELIVERY REWARD IS READY · SELECT IT ABOVE</strong></div>`
    : subtotal < FREE_DELIVERY_THRESHOLD
    ? `<div class="free-progress">
        🎉 Add
        <strong>${money(FREE_DELIVERY_THRESHOLD - subtotal)}</strong>
        more for
        <strong>FREE DELIVERY!</strong>
      </div>`
    : `<div class="free-progress free-progress-complete">
        🎉 <strong>FREE DELIVERY!</strong>
      </div>`;

  cartSummaryEl.innerHTML = `
    ${freeOfferSelector}
    ${rewardWallet}
    ${firstOrderWelcomeCard}
    ${welcomeCard}
    ${testOrderNotice}
    ${cartPointsBalance}
    ${pointsControls}

    ${deliveryProgress}

    <div class="sum-row">
      <span>ITEM TOTAL</span>
      <strong>${money(subtotal)}</strong>
    </div>

    <div class="sum-row">
      <span>DELIVERY</span>
      <strong class="${delivery === 0 ? "free" : ""}">
        ${delivery === 0 ? "FREE" : money(delivery)}
      </strong>
    </div>

    ${promotionDiscount > 0 ? `<div class="sum-row sum-discount"><span>${selectedReward?.kind === "percent-discount" ? `ROYAL REWARD · ${Number(selectedReward.percent)}% OFF REGULAR ITEMS` : "OFFER SAVINGS"}</span><strong>−${money(promotionDiscount)}</strong></div>` : ""}
    ${selectedReward?.kind === "free-delivery" ? `<div class="sum-row sum-discount"><span>REWARD DELIVERY SAVING</span><strong>${money(DELIVERY_CHARGE)}</strong></div>` : ""}
    ${pointsDiscount > 0 ? `<div class="sum-row sum-discount"><span>CRAVING POINTS REDEEMED</span><strong>−${money(pointsDiscount)}</strong></div>` : ""}
    ${selectedReward?.kind === "bonus-points" ? `<div class="sum-row sum-discount"><span>CRAVING POINTS BONUS</span><strong>+${selectedReward.points}</strong></div>` : ""}
    ${selectedReward?.kind === "double-points" ? `<div class="sum-row sum-discount"><span>DOUBLE CRAVING POINTS REWARD</span><strong>UP TO +${selectedReward.maxBonusPoints}</strong></div>` : ""}
    ${isTestOrder ? "" : `<div class="sum-row cart-points-estimate"><span>CRAVING POINTS YOU’LL EARN</span><strong>+${estimatedPoints} pts</strong></div><p class="cart-points-estimate-note">Added after delivery or pickup completion. Regular items earn 1 Craving Point per ₹10; combos earn 1 per ₹20.</p>`}

    <div class="sum-divider"></div>

    <div class="sum-row sum-total">
      <span>TOTAL</span>
      <strong>${money(total)}</strong>
    </div>`;
}

 
  function renderHomeComboCard() {
    const root = document.getElementById("homeComboCard");
    const combo = COMBO_MENU_DATA[0];
    if (!root || !combo) return;
    const price = Number(combo.price);
    const value = Number(combo.value);
    const inCart = cartItem(combo.name, price);
    root.innerHTML = `<article class="home-dashboard-card home-card-combos">
      <div class="home-combo-photo${combo.image ? "" : " image-missing"}" data-fallback="${esc(combo.name)}">${combo.image ? `<img src="${esc(combo.image)}" alt="${esc(combo.name)}" loading="lazy" onerror="this.closest('.home-combo-photo').classList.add('image-missing')">` : ""}<span>FEATURED COMBO</span></div>
      <div class="home-combo-details">
        <span class="home-card-kicker">COMBOS</span>
        <h2>${esc(combo.name)}</h2>
        <div class="home-combo-price"><strong>${money(price)}</strong><del>${money(value)}</del><span>SAVE ${money(value - price)}</span></div>
        <ul class="home-combo-items">${combo.items.map(comboItem => `<li>${esc(comboItem)}</li>`).join("")}</ul>
        <div class="home-combo-actions">${inCart
          ? `<div class="qty-control home-combo-qty"><button type="button" data-action="minus" data-name="${esc(combo.name)}" data-price="${price}" aria-label="Remove one ${esc(combo.name)}">−</button><span>${inCart.qty}</span><button type="button" data-action="plus" data-name="${esc(combo.name)}" data-price="${price}" aria-label="Add one ${esc(combo.name)}">+</button></div>`
          : `<button type="button" class="home-combo-add" data-add="1" data-name="${esc(combo.name)}" data-price="${price}">ADD TO CART</button>`}<button type="button" class="home-combo-view" data-screen="offers">ALL COMBOS</button></div>
      </div>
    </article>`;
  }

  function render() {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.filter(item => !item.isFreeOffer)));
    } catch (error) {
      console.warn("Could not save the cart on this device:", error);
    }
    renderMenu();
    renderComboMenu();
    renderHomeComboCard();
    renderCart();
    if (activeCategory) setActiveCategory(activeCategory);
  }

  function changeItem(name, price, delta) {
    let item = cartItem(name, price);

    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        cart = cart.filter(entry => !(entry.name === name && entry.price === price));
      }
    } else if (delta > 0) {
      const isCombo = COMBO_MENU_DATA.some(combo => combo.name === name);
      cart.push({ name, price, qty: 1, isCombo });
    }

    render();
  }

  function openCart() {
    cartOverlay.classList.add("active");
    cartOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
  }

function closeCart() {
  // Move focus outside the hidden cart before hiding it
  if (document.activeElement && cartOverlay.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  cartOverlay.classList.remove("active");
  cartOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}


  nav.addEventListener("click", event => {
    const link = event.target.closest("a[data-category]");
    if (!link) return;

    event.preventDefault();
    setActiveCategory(link.dataset.category, true);
  });


document.addEventListener("click", async event => {

  const editAddressButton = event.target.closest("[data-edit-address]");
  if (editAddressButton) {
    editAddress(editAddressButton.dataset.editAddress);
    return;
  }

  const deleteAddressButton = event.target.closest("[data-delete-address]");
  if (deleteAddressButton) {
    const addressId = deleteAddressButton.dataset.deleteAddress;
    const addresses = (currentCustomerProfile.addresses || []).filter(item => item.id !== addressId);
    if (addresses.length && !addresses.some(item => item.isDefault)) addresses[0].isDefault = true;
    saveCustomerProfile({ ...currentCustomerProfile, addresses }).catch(error => {
      console.error("Could not remove delivery address:", error);
      if (addressMessage) addressMessage.textContent = "Could not remove this address. Please try again.";
    });
    return;
  }

  const defaultAddressButton = event.target.closest("[data-default-address]");
  if (defaultAddressButton) {
    const chosenId = defaultAddressButton.dataset.defaultAddress;
    const addresses = (currentCustomerProfile.addresses || []).map(item => ({ ...item, isDefault: item.id === chosenId }));
    saveCustomerProfile({ ...currentCustomerProfile, addresses }).then(prefillCheckoutFromDefaultAddress).catch(error => {
      console.error("Could not update default address:", error);
    });
    return;
  }

  const screenButton = event.target.closest("[data-screen]");
  if (screenButton) {
    event.preventDefault();
    if (screenButton.id === "headerPointsButton" && !customerAuthStateResolved) {
      await waitForCustomerAuthResolution();
    }
    if (screenButton.id === "headerPointsButton" && !isCustomerSignedIn()) {
      openCustomerLogin();
      return;
    }
    setAppScreen(screenButton.dataset.screen);
    return;
  }

  if (event.target.closest("[data-open-cart]")) {
    openCart();
    return;
  }

  if (event.target.closest("[data-account-login]")) {
    if (!customerAuthStateResolved) await waitForCustomerAuthResolution();
    if (isCustomerSignedIn()) return;
    openCustomerLogin();
    return;
  }

  if (event.target.closest("[data-account-logout]")) {
    window.FirebaseAuthAPI?.signOut(window.firebaseAuth).catch(error => {
      console.error("Could not log out:", error);
    });
    return;
  }

  if (event.target.closest("[data-reload-orders]")) {
    refreshAccountScreens(currentCustomerUser());
    return;
  }

  if (event.target.closest("[data-reload-account]")) {
    refreshAccountScreens(currentCustomerUser());
    return;
  }

  const freeOfferButton =
    event.target.closest("[data-select-free-offer]");

  if (freeOfferButton) {
    event.preventDefault();

    selectFreeOffer(
      freeOfferButton.dataset.selectFreeOffer
    );

    return;
  }

  const milestoneButton = event.target.closest("[data-select-loyalty-reward]");
  if (milestoneButton) {
    event.preventDefault();
    selectMilestoneReward(milestoneButton.dataset.selectLoyaltyReward);
    return;
  }

  const pointsStep = event.target.closest("[data-points-step]");
  if (pointsStep) {
    event.preventDefault();
    selectPointsRedemption(selectedPointsToRedeem + Number(pointsStep.dataset.pointsStep));
    return;
  }

  if (event.target.closest("[data-select-welcome]")) {
    if (firstOrderWelcomeEligible() && getOfferEligibleSubtotal() > 0) {
      removeSelectedFreeOffer();
      selectedMilestoneRewardId = null;
      selectedPointsToRedeem = 0;
      selectedWelcomeOffer = true;
      render();
    }
    return;
  }

  const useRewardButton = event.target.closest("[data-use-reward]");
  if (useRewardButton) {
    const ticketId = useRewardButton.dataset.useReward;
    const ticket = currentLoyaltyAccount.availableRewards?.find(item => (item.ticketId || item.id) === ticketId);
    const definition = ticket ? REWARDS_CONFIG.rewardById[ticket.id] : null;
    if (definition && ticket) {
      removeSelectedFreeOffer();
      selectedPointsToRedeem = 0;
      selectedWelcomeOffer = false;
      selectedMilestoneRewardId = ticketId;
      if (cart.length) openCart();
      else setAppScreen("menu");
    }
    return;
  }

  const addButton =
    event.target.closest("[data-add]");

  if (addButton) {
    event.preventDefault();

    changeItem(
      addButton.dataset.name,
      Number(addButton.dataset.price),
      1
    );

    return;
  }

  const quantityButton =
    event.target.closest("[data-action]");

  if (!quantityButton) return;

  const action =
    quantityButton.dataset.action;

  const delta =
    action === "plus" ? 1 : -1;

  if (
    quantityButton.dataset.cartIndex !==
    undefined
  ) {
    const index =
      Number(quantityButton.dataset.cartIndex);

    if (!cart[index]) return;

    cart[index].qty += delta;

    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }

    render();

    return;
  }

  changeItem(
    quantityButton.dataset.name,
    Number(quantityButton.dataset.price),
    delta
  );
});



  document.getElementById("cartButton").addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", event => {
    if (event.target === cartOverlay) closeCart();
  });

  clearCartButton.addEventListener("click", () => {
    if (!cart.length) return;
    if (window.confirm("Are you sure you want to clear your cart?")) {
      cart = [];
      render();
    }
  });

  // Online ordering is temporarily disabled.
  // Keep the cart available while online ordering is disabled.


  if (checkoutArea && addressArea) {
    [...checkoutArea.options].filter(option => option.value).forEach(option => {
      addressArea.add(new Option(option.textContent, option.value));
    });
  }
  if (checkoutArea && homeDeliveryArea) {
    refreshHomeDeliverySelector();
    deliveryLocationDialog?.querySelector("[data-close-delivery-location]")?.addEventListener("click", () => deliveryLocationDialog.close());
    deliveryLocationDialog?.addEventListener("click", event => {
      if (event.target === deliveryLocationDialog) deliveryLocationDialog.close();
    });
    document.getElementById("homeAddAddressButton")?.addEventListener("click", () => {
      if (!isCustomerSignedIn()) {
        if (deliveryLocationMessage) deliveryLocationMessage.textContent = "Sign in with your mobile number to save addresses to your account.";
        openCustomerLogin();
        return;
      }
      addressForm.reset();
      document.getElementById("addressId").value = "";
      document.getElementById("addressDefault").checked = !(currentCustomerProfile.addresses || []).length;
      document.getElementById("addressContactName").value = currentCustomerProfile.name || "";
      const currentSelection = homeDeliveryArea.value || "";
      const selectedArea = currentSelection.startsWith("area:") ? currentSelection.slice(5) : checkoutArea.value;
      if (selectedArea) addressArea.value = selectedArea;
      if (addressMessage) addressMessage.textContent = "";
      if (deliveryLocationMessage) deliveryLocationMessage.textContent = pendingGpsCoordinates ? "GPS pin ready. Add your building or flat and confirm the delivery area." : "";
      setAddressFormVisible(true);
    });
    homeSavedAddressList?.addEventListener("click", event => {
      const button = event.target.closest("[data-home-address]");
      if (!button) return;
      homeDeliveryArea.value = `address:${button.dataset.homeAddress}`;
      homeDeliveryArea.dispatchEvent(new Event("change", { bubbles: true }));
      deliveryLocationDialog?.close();
    });
    useCurrentLocationButton?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (deliveryLocationMessage) deliveryLocationMessage.textContent = "This browser can’t share its location. Choose your area or enter an address manually.";
        return;
      }
      useCurrentLocationButton.disabled = true;
      if (deliveryLocationMessage) deliveryLocationMessage.textContent = "Finding your location… Your browser will ask permission first.";
      navigator.geolocation.getCurrentPosition(position => {
        pendingGpsCoordinates = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        };
        useCurrentLocationButton.disabled = false;
        if (deliveryLocationMessage) deliveryLocationMessage.textContent = "GPS pin found. Add your building or flat and confirm the delivery area below. The pin is saved only when you save this address.";
        if (!isCustomerSignedIn()) {
          if (deliveryLocationMessage) deliveryLocationMessage.textContent += " Sign in is needed to save it to your account.";
          openCustomerLogin();
          return;
        }
        addressForm.reset();
        document.getElementById("addressId").value = "";
        document.getElementById("addressDefault").checked = !(currentCustomerProfile.addresses || []).length;
        document.getElementById("addressContactName").value = currentCustomerProfile.name || "";
        const currentSelection = homeDeliveryArea.value || "";
        const selectedArea = currentSelection.startsWith("area:") ? currentSelection.slice(5) : checkoutArea.value;
        if (selectedArea) addressArea.value = selectedArea;
        if (addressMessage) addressMessage.textContent = "";
        setAddressFormVisible(true);
      }, error => {
        useCurrentLocationButton.disabled = false;
        const message = error.code === 1
          ? "Location permission is off. Allow it in your browser, or choose an area and enter your address manually."
          : error.code === 3
            ? "Location took too long to find. Try again or enter your address manually."
            : "We couldn’t find your location. Choose an area and enter your address manually.";
        if (deliveryLocationMessage) deliveryLocationMessage.textContent = message;
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
    homeDeliveryArea.addEventListener("change", () => {
      const value = homeDeliveryArea.value;
      try {
        if (value) localStorage.setItem("chHomeDeliveryArea", value);
        else localStorage.removeItem("chHomeDeliveryArea");
      } catch {}
      if (value.startsWith("address:")) {
        const addressId = value.slice(8);
        if (checkoutSavedAddress) {
          checkoutSavedAddress.value = addressId;
          checkoutSavedAddress.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } else if (value.startsWith("area:")) {
        if (checkoutSavedAddress) checkoutSavedAddress.value = "";
        if (checkoutName) checkoutName.value = currentCustomerProfile.name || "";
        if (checkoutAddress) checkoutAddress.value = "";
        if (checkoutLandmark) checkoutLandmark.value = "";
        if (checkoutArea) checkoutArea.value = value.slice(5);
      }
      refreshHomeDeliverySelector(value);
    });
  }
  homeDeliveryPicker?.addEventListener("click", () => {
    if (!deliveryLocationDialog) return;
    refreshHomeDeliverySelector();
    if (!deliveryLocationDialog.open) deliveryLocationDialog.showModal();
    homeDeliveryPicker.setAttribute("aria-expanded", String(deliveryLocationDialog.open));
  });
  deliveryLocationDialog?.addEventListener("close", () => {
    homeDeliveryPicker?.setAttribute("aria-expanded", "false");
    pendingGpsCoordinates = null;
  });
  deliveryLocationDialog?.addEventListener("cancel", () => homeDeliveryPicker?.setAttribute("aria-expanded", "false"));
  checkoutSavedAddress?.addEventListener("change", () => {
    const chosen = (currentCustomerProfile.addresses || []).find(item => item.id === checkoutSavedAddress.value);
    if (!chosen) {
      checkoutAddressLabel.value = "";
      checkoutName.value = currentCustomerProfile.name || "";
      checkoutAddress.value = "";
      checkoutLandmark.value = "";
      checkoutArea.value = "";
      return;
    }
    if (chosen.label && ![...checkoutAddressLabel.options].some(option => option.value === chosen.label)) checkoutAddressLabel.add(new Option(chosen.label, chosen.label));
    checkoutAddressLabel.value = chosen.label || "";
    checkoutName.value = chosen.name || "";
    checkoutAddress.value = chosen.address || "";
    checkoutLandmark.value = chosen.landmark || "";
    checkoutArea.value = chosen.area || "";
    refreshHomeDeliverySelector(`address:${chosen.id}`);
  });
  document.getElementById("addAddressButton")?.addEventListener("click", () => {
    if (!isCustomerSignedIn()) {
      openCustomerLogin();
      return;
    }
    addressForm.reset();
    document.getElementById("addressId").value = "";
    document.getElementById("addressDefault").checked = !(currentCustomerProfile.addresses || []).length;
    document.getElementById("addressContactName").value = currentCustomerProfile.name || "";
    if (addressMessage) addressMessage.textContent = "";
    setAddressFormVisible(true);
  });
  document.getElementById("cancelAddressButton")?.addEventListener("click", () => setAddressFormVisible(false));
  addressForm?.addEventListener("submit", submitAddressForm);

  renderNav();
  render();
  menuInitialized = true;
  const isAdminGameTest = new URLSearchParams(location.search).get("gameTest") === "1";
  setAppScreen(isAdminGameTest ? "game" : "home");

  const firstVisitFlyer = document.getElementById("firstVisitFlyer");
  firstVisitFlyer?.addEventListener("click", event => {
    if (event.target === firstVisitFlyer) firstVisitFlyer.close();
    const closeButton = event.target.closest("[data-close-first-visit]");
    if (closeButton) firstVisitFlyer.close();
    if (event.target.closest("[data-first-visit-menu]")) {
      firstVisitFlyer.close();
      setAppScreen("menu");
    }
  });
  if (firstVisitFlyer) window.setTimeout(maybeShowFirstOrderFlyer, 450);

  const sections = [...document.querySelectorAll(".menu-section")];
  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) setActiveCategory(visible.target.id);
  }, {
    rootMargin: "-34% 0px -55% 0px",
    threshold: [0, 0.2, 0.5]
  });

  sections.forEach(section => observer.observe(section));

  const firstCategory = Object.keys(MENU_DATA)[0];
  if (firstCategory) setActiveCategory(firstCategory);

  
  // =========================================================
// CRAVING HEAVEN — PUSH OFFER NOTIFICATIONS
// =========================================================

const pushOfferBox =
  document.getElementById("pushOfferBox");

const enableOfferNotifications =
  document.getElementById("enableOfferNotifications");


// ---------------------------------------------------------
// HIDE NOTIFICATION BOX
// ---------------------------------------------------------

function hidePushOfferBox() {

  if (!pushOfferBox) return;

  pushOfferBox.style.display = "none";

}


// ---------------------------------------------------------
// SAVE FCM TOKEN
// ---------------------------------------------------------

async function saveFCMToken(token) {
  if (!token) {
    throw new Error(
      "Firebase did not return a notification token."
    );
  }

  const tokenRef =
    window.FirebaseFirestoreAPI.doc(
      window.firebaseDB,
      "notificationTokens",
      token
    );

  await window.FirebaseFirestoreAPI.setDoc(
    tokenRef,
    {
      token: token,
      createdAt:
        window.FirebaseFirestoreAPI.serverTimestamp(),
      userAgent:
        navigator.userAgent,
      platform:
        navigator.platform,
      source:
        "website"
    },
    {
      merge: true
    }
  );

  console.log(
    "FCM token saved without creating duplicate entry."
  );
}

function showNotificationBlockedState() {

  if (enableOfferNotifications) {

    enableOfferNotifications.disabled = false;

    enableOfferNotifications.classList.add(
      "blocked"
    );

    enableOfferNotifications.textContent =
      "⚙️ HOW TO ENABLE";
  }


  const offerText =
    pushOfferBox?.querySelector(
      ".push-offer-content p"
    );

  if (offerText) {

    offerText.textContent =
      "Notifications are blocked. Enable them in your browser settings to receive our offers.";
  }
}


function resetNotificationOfferButton() {

  if (!enableOfferNotifications) return;

  enableOfferNotifications.disabled = false;

  enableOfferNotifications.classList.remove(
    "blocked"
  );

  enableOfferNotifications.textContent =
    "🔥 GET OFFERS";
}


// ---------------------------------------------------------
// ACTIVATE NOTIFICATIONS
// ---------------------------------------------------------
async function enableCustomerOfferNotifications() {

  if (
    !window.firebaseMessaging ||
    !window.FirebaseMessagingAPI
  ) {
    console.error(
      "Firebase Messaging is not ready."
    );
    return false;
  }

  if (!("Notification" in window)) {
    console.log(
      "Notifications are not supported."
    );
    return false;
  }


  // =====================================================
  // CHECK CURRENT PERMISSION
  // =====================================================

  let permission =
    Notification.permission;


  // =====================================================
  // BLOCKED
  // =====================================================

  if (permission === "denied") {

    console.log(
      "Notifications are blocked by the browser."
    );

    showNotificationBlockedState();

    return false;
  }


  // =====================================================
  // NOT DECIDED YET
  // =====================================================

  if (permission === "default") {

    if (enableOfferNotifications) {

      enableOfferNotifications.disabled = true;

      enableOfferNotifications.textContent =
        "ENABLING...";
    }


    permission =
      await Notification.requestPermission();


    // Customer clicked BLOCK
    if (permission === "denied") {

      console.log(
        "Notification permission: denied"
      );

      showNotificationBlockedState();

      return false;
    }


    // Customer closed/did not allow
    if (permission !== "granted") {

      resetNotificationOfferButton();

      console.log(
        "Notification permission:",
        permission
      );

      return false;
    }
  }


  // =====================================================
  // GRANTED
  // =====================================================

  if (permission === "granted") {

    try {

      if (enableOfferNotifications) {

        enableOfferNotifications.disabled = true;

        enableOfferNotifications.textContent =
          "ENABLING...";
      }


      const serviceWorkerRegistration =
        await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );


      const token =
        await window.FirebaseMessagingAPI.getToken(
          window.firebaseMessaging,
          {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration
          }
        );


      console.log(
        "CRAVING HEAVEN FCM Token:",
        token
      );


      await saveFCMToken(token);


      console.log(
        "CRAVING HEAVEN notifications enabled."
      );


      if (enableOfferNotifications) {

        enableOfferNotifications.classList.remove(
          "blocked"
        );
      }


      hidePushOfferBox();

      return true;

    } catch (error) {

      console.error(
        "Push notification error:",
        error
      );

      resetNotificationOfferButton();

      return false;
    }
  }


  return false;
}

// ---------------------------------------------------------
// AUTOMATICALLY SHOW NOTIFICATION OFFER BOX
// ---------------------------------------------------------

setTimeout(() => {

  if (!pushOfferBox) return;

  // If notifications are already enabled,
  // silently refresh/save the FCM token.
  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    enableCustomerOfferNotifications();
    return;
  }

  // Show the offer box for customers who
  // have not enabled notifications yet.
  pushOfferBox.style.display = "flex";

}, 1200);



// ---------------------------------------------------------
// FALLBACK BUTTON
// ---------------------------------------------------------

if (enableOfferNotifications) {

  enableOfferNotifications.addEventListener(
    "click",
    async () => {

      if (
        "Notification" in window &&
        Notification.permission === "denied"
      ) {

        showNotificationBlockedState();

        alert(
          "Notifications are blocked for CRAVING HEAVEN.\n\n" +
          "Click the 🔒 icon near the website address → " +
          "Site settings → Notifications → Allow.\n\n" +
          "Then reload the website."
        );

        return;
      }


      await enableCustomerOfferNotifications();

    }
  );
}
  
  
  // ====================== STORE HOURS ======================

// ====================== STORE HOURS ======================
// ====================== STORE HOURS ======================

function updateOpeningHours() {
  const statusEl = document.getElementById("openingHoursStatus");
  const dotEl = document.getElementById("openingHoursDot");

  const cartStatusEl = document.getElementById("cartOpeningHoursStatus");
  const cartDotEl = document.getElementById("cartOpeningHoursDot");
  const mainNotice = document.getElementById("onlineOrderNotice");
  const cartNotice = document.getElementById("cartOrderAvailabilityNotice");
  const isOpen = orderAvailability.acceptingOnlineOrders;
  const label = isOpen ? "OPEN" : "CLOSED";
  for (const [status, dot] of [[statusEl, dotEl], [cartStatusEl, cartDotEl]]) {
    if (!status || !dot) continue;
    status.textContent = label;
    status.classList.toggle("is-open", isOpen);
    status.classList.toggle("is-closed", !isOpen);
    dot.classList.toggle("is-open", isOpen);
    dot.classList.toggle("is-closed", !isOpen);
  }
  const notice = orderAvailabilityReady
    ? orderAvailability.testModeEnabled
      ? orderAvailability.isTestCustomer
        ? "TEST MODE: orders from your number are saved separately and will not be prepared or sent to staff."
        : "Online ordering is temporarily unavailable. Please check back soon."
      : orderAvailability.paused
      ? "We’re preparing a rush of fresh orders right now. Please check back in a little while—we’d love to serve you soon!"
      : orderAvailability.adminMode === "closed"
      ? "We’re closed for now, but we’ll be back soon with your favourites. Please check back a little later!"
      : !orderAvailability.staffEnabled
      ? "We’re getting ready to serve you! Online ordering will open when our team is ready. Please check back soon—we’d love to make your favourites!"
      : isOpen ? "" : "We’re closed for now, but we’ll be back soon with your favourites. Please check back a little later!"
    : "Unable to confirm online order status. Please refresh and try again.";
  for (const element of [mainNotice, cartNotice]) {
    if (!element) continue;
    element.textContent = notice;
    element.hidden = !notice;
  }
}

async function refreshOrderingAvailability() {
  const api = window.FirebaseFunctionsAPI?.httpsCallable;
  if (!api || !window.firebaseFunctions) {
    orderAvailabilityReady = false;
    updateOpeningHours();
    updatePlaceOrderButton();
    return;
  }
  try {
    const response = await api(window.firebaseFunctions, "getOrderingStatus")({});
    const data = response.data || {};
    orderAvailability = {
      isOpen: data.isOpen === true,
      paused: data.paused === true,
      staffEnabled: data.staffEnabled === true,
      acceptingOnlineOrders: data.acceptingOnlineOrders === true,
      adminMode: data.adminMode || "",
      testModeEnabled: data.testModeEnabled === true,
      isTestCustomer: data.isTestCustomer === true
    };
    orderAvailabilityReady = true;
  } catch (error) {
    console.warn("Could not refresh online ordering status:", error);
    orderAvailabilityReady = false;
  }
  updateOpeningHours();
  updatePlaceOrderButton();
}


// Run immediately
refreshOrderingAvailability();
setInterval(refreshOrderingAvailability, 20000);


});
