document.addEventListener("DOMContentLoaded", () => {
const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_CHARGE = 30;

// ====================== FREE OFFERS ======================

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
  const shareOfferOverlay = document.getElementById("shareOfferOverlay");
  const shareOfferClose = document.getElementById("shareOfferClose");
  const shareOfferButton = document.getElementById("shareOfferButton");
  const shareOfferImage = document.getElementById("shareOfferImage");

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
<strong class="combo-price">${item === COMBO_SLIDES[0] ? "FREE" : price === 0 ? "DEAL" : money(price)}</strong>
              ${inCart
  ? `<div class="qty-control">
       <button type="button" data-action="minus" data-name="${esc(item.name)}" data-price="${price}" aria-label="Decrease ${esc(item.name)}">−</button>
       <span>${inCart.qty}</span>
       <button type="button" data-action="plus" data-name="${esc(item.name)}" data-price="${price}" aria-label="Increase ${esc(item.name)}">+</button>
     </div>`
  : item === COMBO_SLIDES[0]
  ? `<button type="button" class="add-mini share-slider-button" data-share-offer="1">↗ SHARE NOW</button>`
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
  const shareButton = event.target.closest("[data-share-offer]");
  
  if (shareButton) {
    event.preventDefault();
    shareOffer();
    return;
  }
  
    const freeOfferButton = event.target.closest("[data-select-free-offer]");

  if (freeOfferButton) {
    event.preventDefault();

    selectFreeOffer(
      freeOfferButton.dataset.selectFreeOffer
    );

    return;
  }
  

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    event.preventDefault();
    changeItem(addButton.dataset.name, Number(addButton.dataset.price), 1);
    return;
  }

  const quantityButton = event.target.closest("[data-action]");
    if (!quantityButton) return;

    const action = quantityButton.dataset.action;
    const delta = action === "plus" ? 1 : -1;

    if (quantityButton.dataset.cartIndex !== undefined) {
      const index = Number(quantityButton.dataset.cartIndex);
      if (!cart[index]) return;
      cart[index].qty += delta;
      if (cart[index].qty <= 0) cart.splice(index, 1);
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
  openShareOffer();

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

  // ====================== SHARE OFFER ======================
  const SHARE_OFFER_MESSAGE = `🔥🍔 SHARE & GET A FREE CRUNCHY CHICKEN BURGER! 🍔🔥

Hey! 👋 We’ve got a special offer for you from CRAVING HEAVEN ❤️

🎁 SHARE OUR ONLINE MENU WITH 20 FRIENDS

➡️ verify your shares
➡️ 🎉 GET 1 CRUNCHY CHICKEN BURGER ABSOLUTELY FREE! 🍔

📍 Visit: cravingheaven.com

Terms & Conditions Apply:
• Share with 20 Friends
• verify share
• One-time offer only`;

  function closeShareOffer() {
    shareOfferOverlay.classList.remove("active");
    shareOfferOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("share-offer-open");
  }

 async function shareOffer() {
  const websiteUrl = "https://cravingheaven.com/";

  const message = `🔥🍔 SHARE & GET A FREE CRUNCHY CHICKEN BURGER! 🍔🔥

Hey! 👋 We’ve got a special offer for you from CRAVING HEAVEN ❤️

🌐 Check Our Online Menu:
${websiteUrl}

🎁 SHARE OUR ONLINE MENU WITH 20 FAMILY & FRIENDS

➡️ verify your shares
➡️ 🎉 GET 1 CRUNCHY CHICKEN BURGER ABSOLUTELY FREE! 🍔



Terms & Conditions Apply:
• Share with 20 friends
• Verify Share
• One-time offer only`;

  try {
    // Get the flyer image from your website
    const imageUrl = new URL(
      shareOfferImage.getAttribute("src"),
      document.baseURI
    ).href;

    const response = await fetch(imageUrl, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error("Could not load offer image.");
    }

    const blob = await response.blob();

    // Create an actual image file for sharing
    const file = new File(
      [blob],
      "craving-heaven-free-burger-offer.png",
      {
        type: blob.type || "image/png"
      }
    );

    // Check whether this phone/browser supports sharing files
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: "CRAVING HEAVEN - FREE CRUNCHY CHICKEN BURGER",
        text: message,
        files: [file]
      });

      return;
    }

    // If image sharing is not supported
    alert(
      "Image sharing is not supported on this browser. Please open the website on your mobile phone and try again."
    );

  } catch (error) {

    // Customer simply closed the share window
    if (error && error.name === "AbortError") {
      return;
    }

    console.error("Share error:", error);

    alert(
      "Unable to share the offer right now. Please try again."
    );
  }
}

  function openShareOffer() {
    shareOfferOverlay.classList.add("active");
    shareOfferOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("share-offer-open");
    requestAnimationFrame(() => shareOfferClose.focus());
  }

  shareOfferClose.addEventListener("click", closeShareOffer);
  shareOfferButton.addEventListener("click", shareOffer);
  shareOfferOverlay.addEventListener("click", event => {
    if (event.target === shareOfferOverlay) closeShareOffer();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && cartOverlay.classList.contains("active")) {
      closeCart();
    }
  });
  
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
