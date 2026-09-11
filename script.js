document.addEventListener("DOMContentLoaded", () => {
const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_CHARGE = 30;
const ONLINE_CHECKOUT_ENABLED = false;
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

  const otpLoginMessage =
    document.getElementById("otpLoginMessage");

  const placeOrderButton =
    document.getElementById("placeCall");

  let confirmationResult = null;
  let recaptchaVerifier = null;
  let customerLoggedIn = false;


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


  function closeCustomerLogin() {
    if (!customerLoginOverlay) return;

    customerLoginOverlay.classList.remove("open");
    customerLoginOverlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("customer-login-open");
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

    if (recaptchaVerifier) {
      return recaptchaVerifier;
    }

recaptchaVerifier =
  new window.FirebaseAuthAPI.RecaptchaVerifier(
    window.firebaseAuth,
    "recaptcha-container",
    {
      size: "invisible"
    }
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
      await confirmationResult.confirm(otp);

      customerLoggedIn = true;

      otpLoginMessage.textContent =
        "Mobile number verified successfully.";

      updatePlaceOrderButton();

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

    const recaptchaContainer =
      document.getElementById("recaptcha-container");

    if (recaptchaContainer) {
      recaptchaContainer.innerHTML = "";
    }
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
      "place-call-disabled"
    );

    placeOrderButton.disabled = true;

    placeOrderButton.setAttribute(
      "aria-disabled",
      "true"
    );

    return;
  }

  // ONLINE CHECKOUT ENABLED
  placeOrderButton.classList.remove(
    "place-call-disabled"
  );

  placeOrderButton.disabled = false;

  placeOrderButton.removeAttribute(
    "aria-disabled"
  );

  if (customerLoggedIn) {
    placeOrderButton.textContent =
      "CONTINUE TO CHECKOUT";
  } else {
    placeOrderButton.textContent =
      "LOGIN TO PLACE ORDER";
  }
}


function handlePlaceOrderClick() {

  if (!cart.length) {

    alert(
      "YOUR CART IS EMPTY. Please add something to your order."
    );

    return;
  }

  if (!customerLoggedIn) {

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
      return;
    }

    window.FirebaseAuthAPI.onAuthStateChanged(
      window.firebaseAuth,
      user => {
        customerLoggedIn = !!user;

        updatePlaceOrderButton();

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

const checkoutOrderSummary =
  document.getElementById("checkoutOrderSummary");

const checkoutSubmit =
  document.getElementById("checkoutSubmit");

const checkoutMessage =
  document.getElementById("checkoutMessage");

// =========================================================
// ORDER SUCCESS
// =========================================================

const orderSuccessOverlay =
  document.getElementById("orderSuccessOverlay");

const orderSuccessClose =
  document.getElementById("orderSuccessClose");

const orderSuccessId =
  document.getElementById("orderSuccessId");


function openOrderSuccess(orderId) {

  if (!orderSuccessOverlay) return;

  if (orderSuccessId) {
    orderSuccessId.textContent =
      `#${orderId}`;
  }

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
    closeOrderSuccess
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
    subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  return subtotal + delivery;
}


function renderCheckoutSummary() {

  if (!checkoutOrderSummary) return;

  const subtotal = getPaidSubtotal();

  const delivery =
    subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  const total =
    subtotal + delivery;


  const itemsHtml = cart
    .map(item => {

      if (item.isFreeOffer) {

        return `
          <div class="checkout-summary-item">
            <span>
              🎁 ${esc(item.name)}
            </span>

            <strong>FREE</strong>
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
    .join("");


  checkoutOrderSummary.innerHTML = `

    ${itemsHtml}

    <div class="checkout-summary-item">
      <span>ITEM TOTAL</span>
      <strong>${money(subtotal)}</strong>
    </div>

    <div class="checkout-summary-item">
      <span>DELIVERY</span>

      <strong class="${delivery === 0 ? "free" : ""}">
        ${delivery === 0 ? "FREE" : money(delivery)}
      </strong>
    </div>

    <div class="checkout-summary-total">

      <span>TOTAL</span>

      <strong>
        ${money(total)}
      </strong>

    </div>
  `;
}


function openCheckout() {

  if (!ONLINE_CHECKOUT_ENABLED) {

    alert(
      "ONLINE CHECKOUT IS CURRENTLY UNAVAILABLE.\n\n" +
      "Please call CRAVING HEAVEN to place your order."
    );

    return;
  }
  if (!cart.length) {

    alert(
      "YOUR CART IS EMPTY. Please add something to your order."
    );

    return;
  }


  if (!customerLoggedIn) {

    openCustomerLogin();

    return;
  }


  renderCheckoutSummary();

  checkoutMessage.textContent = "";

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

  checkoutOverlay.classList.remove("open");

  checkoutOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "checkout-open"
  );
}


function validateCheckoutForm() {

  const name =
    checkoutName.value.trim();

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


  if (address.length < 8) {

    checkoutMessage.textContent =
      "Please enter your complete delivery address.";

    checkoutAddress.focus();

    return false;
  }


  if (!area) {

    checkoutMessage.textContent =
      "Please select your area.";

    checkoutArea.focus();

    return false;
  }


  return true;
}


function buildOrderMessage(orderId = "") {

  const user =
    window.firebaseAuth?.currentUser;

  const mobile =
    user?.phoneNumber ||
    "Verified mobile";


  const subtotal =
    getPaidSubtotal();

  const delivery =
    subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  const total =
    subtotal + delivery;


  const itemsText =
    cart
      .map(item => {

        if (item.isFreeOffer) {

          return `🎁 ${item.name} × ${item.qty} — FREE`;
        }

        return `• ${item.name} × ${item.qty} — ${money(item.price * item.qty)}`;

      })
      .join("\n");


  return `🍗 *CRAVING HEAVEN — NEW ORDER*

🆔 Order ID: ${orderId || "Pending"}

👤 Customer: ${checkoutName.value.trim()}

📱 Mobile: ${mobile}

📍 Area: ${checkoutArea.value}

🏠 Address:
${checkoutAddress.value.trim()}

${checkoutLandmark.value.trim()
    ? `📌 Landmark: ${checkoutLandmark.value.trim()}\n`
    : ""}

🍔 *ORDER ITEMS*

${itemsText}

💰 Item Total: ${money(subtotal)}

🚚 Delivery: ${
    delivery === 0
      ? "FREE"
      : money(delivery)
  }

💵 *TOTAL: ${money(total)}*

💳 Payment: Pay on Delivery

━━━━━━━━━━━━━━━━━━
CRAVING HEAVEN
Pathanwadi, Malad East
━━━━━━━━━━━━━━━━━━`;
}


async function continueToOrder() {
	
	
	  if (!ONLINE_CHECKOUT_ENABLED) {

    checkoutMessage.textContent =
      "Online checkout is currently unavailable.";

    return;
  }

  checkoutMessage.textContent = "";

  if (!validateCheckoutForm()) {
    return;
  }


  checkoutSubmit.disabled = true;

  checkoutSubmit.textContent =
    "CREATING ORDER...";


  const user =
    window.firebaseAuth?.currentUser;


  if (!user) {

    checkoutMessage.textContent =
      "Your login session has expired. Please login again.";

    checkoutSubmit.disabled = false;

    checkoutSubmit.textContent =
      "PLACE ORDER";

    return;
  }


  const subtotal =
    getPaidSubtotal();

  const delivery =
    subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  const total =
    subtotal + delivery;


  try {

    const orderData = {

      customerName:
        checkoutName.value.trim(),

      mobile:
        user.phoneNumber || "",

      address:
        checkoutAddress.value.trim(),

      landmark:
        checkoutLandmark.value.trim(),

      area:
        checkoutArea.value,

      paymentMethod:
        "Pay on Delivery",

      items:
        cart.map(item => ({
          name: item.name,
          price: item.price,
          qty: item.qty,
          isFreeOffer:
            !!item.isFreeOffer
        })),

      subtotal,
      deliveryCharge: delivery,
      total,

      status: "new",

      source: "website",

      createdAt:
        window.FirebaseFirestoreAPI.serverTimestamp()
    };


    const orderRef =
      await window.FirebaseFirestoreAPI.addDoc(
        window.FirebaseFirestoreAPI.collection(
          window.firebaseDB,
          "orders"
        ),
        orderData
      );


    const orderId =
      orderRef.id;


    const message =
      buildOrderMessage(orderId);


    const whatsappUrl =
      `https://wa.me/917700929693?text=${
        encodeURIComponent(message)
      }`;


// Open WhatsApp with the order details.
window.open(
  whatsappUrl,
  "_blank"
);

// Update checkout button.
checkoutSubmit.textContent =
  "ORDER SENT ✓";

// Close checkout first.
closeCheckout();

// Clear the cart after successful order.
cart = [];
selectedFreeOfferId = null;
render();

// Show order confirmation.
openOrderSuccess(orderId);

// Reset checkout button for the next order.
setTimeout(() => {

  checkoutSubmit.disabled = false;

  checkoutSubmit.textContent =
    "PLACE ORDER";

}, 500);


  } catch (error) {

    console.error(
      "Order creation failed:",
      error
    );


    checkoutMessage.textContent =
      "Unable to create your order. Please try again or call us.";


    checkoutSubmit.disabled = false;

    checkoutSubmit.textContent =
      "PLACE ORDER";
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
  
const FREE_OFFERS = {
  burger3: {
    id: "burger3",
    name: "BUY 3, GET 1 FREE",
    requirement: "3 CRUNCHY CHICKEN BURGERS",
    freeItem: "CH CRUNCHY KING BURGER",
    freePrice: 0,
    days: ["Monday", "Tuesday", "Wednesday"],
    type: "burger-count",
    requiredQty: 3
  },

  weekend: {
    id: "weekend",
    name: "WEEKEND FEAST DEAL",
    requirement: "ORDER ₹499 OR MORE",
    freeItem: "PERI PERI SEASONING FRIES - HALF",
    freePrice: 0,
    days: ["Saturday", "Sunday"],
    type: "subtotal",
    threshold: 499
  },

  family: {
    id: "family",
    name: "FAMILY FEAST BONUS",
    requirement: "ORDER ₹699 OR MORE",
    freeItem: "CLASSIC REGULAR STRIPS - 3 PCS",
    freePrice: 0,
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    type: "subtotal",
    threshold: 699
  },

  sunday: {
    id: "sunday",
    name: "SUNDAY CHICKEN FEAST",
    requirement: "ORDER ₹399 OR MORE",
    freeItem: "CRUNCHY CHICKEN POPCORN - MEDIUM",
    freePrice: 0,
    days: ["Sunday"],
    type: "subtotal",
    threshold: 399
  }
};

let selectedFreeOfferId = null;

  const nav = document.getElementById("categoryNav");
  const sectionsRoot = document.getElementById("menuSections");
  const comboSlider = document.getElementById("comboSlider");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartItemsEl = document.getElementById("cartItems");
  const cartSummaryEl = document.getElementById("cartSummary");
  const cartCountEl = document.getElementById("cartCount");
  const clearCartButton = document.getElementById("clearCart");
  const placeCall = document.getElementById("placeCall");
  const slidePrev = document.getElementById("slidePrev");
  const slideNext = document.getElementById("slideNext");
  

  let cart = [];
  let activeCategory = "";

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
    sectionsRoot.innerHTML = Object.entries(MENU_DATA).map(([id, section]) => {
      const cards = section.items.map(item => {
        const inCart = item.options ? null : cartItem(item.name, Number(item.price));
        const image = `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.closest('.food-image').classList.add('image-missing')">`;

        let controls;
        if (item.options) {
          controls = `
            <div class="options" role="group" aria-label="${esc(item.name)} options">
              ${item.options.map(option => {
                const optionPrice = Number(option.price);
                const optionInCart = cartItem(option.name, optionPrice);

                return optionInCart
                  ? `<div class="option-control">
                       <button type="button" data-action="minus" data-name="${esc(option.name)}" data-price="${optionPrice}" aria-label="Decrease ${esc(option.label)}">−</button>
                       <span>${optionInCart.qty}</span>
                       <button type="button" data-action="plus" data-name="${esc(option.name)}" data-price="${optionPrice}" aria-label="Increase ${esc(option.label)}">+</button>
                     </div>`
                  : `<button type="button" class="option" data-add="1" data-name="${esc(option.name)}" data-price="${optionPrice}">${esc(option.label)}</button>`;
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
            <div class="food-image">
              ${image}
              <span class="image-fallback">FOOD IMAGE</span>
            </div>
            <div class="card-content">
              <h3>${esc(item.name)}</h3>
              <p>${esc(item.description)}</p>
              ${controls}
            </div>
          </article>`;
      }).join("");

      return `
        <section class="menu-section" id="${esc(id)}">
          <div class="section-heading">
            <span class="section-kicker">CRAVING HEAVEN</span>
            <h2>${esc(section.title)}</h2>
            <p>${esc(section.subtitle)}</p>
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
  }

  function renderCombos() {
    comboSlider.innerHTML = COMBO_SLIDES.map(item => {
      const price = Number(item.price);
      const inCart = cartItem(item.name, price);

      return `
        <article class="combo-slide">
          <div class="combo-image">
            <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.closest('.combo-image').classList.add('image-missing')">
            
            <span class="combo-badge">VALUE PICK</span>
          </div>
          <div class="combo-info">
            <h3>${esc(item.name)}</h3>
            <p>${esc(item.description)}</p>
            <div class="combo-row">
<strong class="combo-price">${price === 0 ? "DEAL" : money(price)}</strong>
           ${inCart
  ? `<div class="qty-control">
       <button type="button" data-action="minus" data-name="${esc(item.name)}" data-price="${price}" aria-label="Decrease ${esc(item.name)}">−</button>
       <span>${inCart.qty}</span>
       <button type="button" data-action="plus" data-name="${esc(item.name)}" data-price="${price}" aria-label="Increase ${esc(item.name)}">+</button>
     </div>`
  : ""}
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

function getBurgerCount() {
  return cart.reduce((count, item) => {
    if (item.isFreeOffer) return count;

    if (item.name === "CLASSIC CRUNCHY BURGER") {
      return count + item.qty;
    }

    return count;
  }, 0);
}

function isOfferDay(offer) {
  const today = getMumbaiDay();
  return offer.days.includes(today);
}

function isOfferQualified(offer, subtotal, burgerCount) {
  if (!isOfferDay(offer)) return false;

  if (offer.type === "subtotal") {
    return subtotal >= offer.threshold;
  }

  if (offer.type === "burger-count") {
    return burgerCount >= offer.requiredQty;
  }

  return false;
}

function removeSelectedFreeOffer() {
  cart = cart.filter(item => !item.isFreeOffer);
}

function selectFreeOffer(offerId) {
  const offer = FREE_OFFERS[offerId];

  if (!offer) return;

  const subtotal = getPaidSubtotal();
  const burgerCount = getBurgerCount();

  if (!isOfferQualified(offer, subtotal, burgerCount)) {
    return;
  }

  // Remove any previously selected free offer.
  removeSelectedFreeOffer();

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
function renderCart() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const subtotal = getPaidSubtotal();
  const burgerCount = getBurgerCount();
  const today = getMumbaiDay();

  const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const total = subtotal + delivery;

  cartCountEl.textContent = totalQty;
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
  }).join("");

  // ====================== FREE OFFER SELECTOR ======================

  const offerCards = Object.values(FREE_OFFERS)
    .filter(offer => isOfferDay(offer))
    .map(offer => {

      const qualified = isOfferQualified(
        offer,
        subtotal,
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
            offer.threshold - subtotal
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

  const freeOfferSelector = `
    <div class="free-offers-box">
      <div class="free-offers-heading">
        <span>🎁 SPECIAL OFFERS</span>
        <strong>CHOOSE ANY 1</strong>
        <p>Only one free offer can be selected per order.</p>
      </div>

      ${offerCards}
    </div>
  `;

  // ====================== DELIVERY PROGRESS ======================

  const deliveryProgress = subtotal < FREE_DELIVERY_THRESHOLD
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

    <div class="sum-divider"></div>

    <div class="sum-row sum-total">
      <span>TOTAL</span>
      <strong>${money(total)}</strong>
    </div>`;
}

 
 function render() {
    renderMenu();
    renderCombos();
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
      cart.push({ name, price, qty: 1 });
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


document.addEventListener("click", event => {

  const freeOfferButton =
    event.target.closest("[data-select-free-offer]");

  if (freeOfferButton) {
    event.preventDefault();

    selectFreeOffer(
      freeOfferButton.dataset.selectFreeOffer
    );

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
  // The cart remains available for browsing and the customer can use the separate CALL NOW button.

  slidePrev.addEventListener("click", () => comboSlider.scrollBy({ left: -340, behavior: "smooth" }));
  slideNext.addEventListener("click", () => comboSlider.scrollBy({ left: 340, behavior: "smooth" }));

  renderNav();
  render();

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

  // Show the promotion on every fresh page visit. No localStorage/cookie is used,
  // so closing it only closes it for the current page visit.

  let touchStartX = 0;
  comboSlider.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  comboSlider.addEventListener("touchend", event => {
    const diff = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 45) {
      comboSlider.scrollBy({ left: diff < 0 ? 250 : -250, behavior: "smooth" });
    }
  }, { passive: true });

  
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

  // Get current Mumbai time
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const hour = Number(
    parts.find(part => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find(part => part.type === "minute")?.value || 0
  );

  const currentMinutes = hour * 60 + minute;

  // Store timing
  const openingMinutes = 12 * 60 + 30; // 12:30 PM
  const closingMinutes = 23 * 60 + 45; // 11:45 PM

  const isOpen =
    currentMinutes >= openingMinutes &&
    currentMinutes < closingMinutes;


  // ================= MAIN STATUS =================

  if (statusEl && dotEl) {

    statusEl.textContent = isOpen
      ? "OPEN NOW"
      : "CLOSED NOW";

    statusEl.classList.toggle("is-open", isOpen);
    statusEl.classList.toggle("is-closed", !isOpen);

    dotEl.classList.toggle("is-open", isOpen);
    dotEl.classList.toggle("is-closed", !isOpen);
  }


  // ================= CART STATUS =================

  if (cartStatusEl && cartDotEl) {

    cartStatusEl.textContent = isOpen
      ? "OPEN NOW"
      : "CLOSED NOW";

    cartStatusEl.classList.toggle("is-open", isOpen);
    cartStatusEl.classList.toggle("is-closed", !isOpen);

    cartDotEl.classList.toggle("is-open", isOpen);
    cartDotEl.classList.toggle("is-closed", !isOpen);
  }


  // ================= CALL BUTTONS =================

  const callButtons = document.querySelectorAll(
    ".call-header, .cart-call-now, .footer-call"
  );

  callButtons.forEach(button => {

    if (isOpen) {

      // ENABLE CALL BUTTON
      button.classList.remove("call-disabled");
      button.setAttribute("aria-disabled", "false");
      button.removeAttribute("tabindex");

    } else {

      // DISABLE CALL BUTTON
      button.classList.add("call-disabled");
      button.setAttribute("aria-disabled", "true");
      button.setAttribute("tabindex", "-1");
    }

  });
}


// Run immediately
updateOpeningHours();

// Check every 30 seconds
setInterval(updateOpeningHours, 30000);


// Prevent disabled call buttons from calling
document.addEventListener("click", function(event) {

  const button = event.target.closest(
    ".call-header.call-disabled, .cart-call-now.call-disabled, .footer-call.call-disabled"
  );

  if (button) {
    event.preventDefault();
    event.stopPropagation();
  }

});
  
});
