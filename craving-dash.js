(() => {
  const root = document.getElementById("cravingDashContent");
  if (!root) return;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = amount => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  const emojiFor = name => /burger/i.test(name) ? "🍔" : /fries/i.test(name) ? "🍟" : /wrap/i.test(name) ? "🌯" : "🍗";
  const dateText = value => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
  const promoDialog = document.getElementById("gamePromoDialog");
  let gameState = null, activeRound = null, roundTimer = null, nextObject = 0, submitting = false, actionPending = false, adminTestMode = false, adminTestStageId = "", gameAvailabilityKnown = false, gameEnabled = false;
  const callable = (name, data = {}) => {
    const fn = window.FirebaseFunctionsAPI?.httpsCallable;
    if (!fn || !window.firebaseFunctions) throw new Error("The game service is still connecting. Please try again in a moment.");
    return fn(window.firebaseFunctions, name)(data).then(result => result.data);
  };
  function signIn() {
    if (typeof window.requestCustomerLogin === "function") window.requestCustomerLogin();
    else root.innerHTML = `<article class="game-panel"><h2>Sign in to play</h2><p>Use your mobile number to save your stage and receive rewards.</p><button class="game-primary" type="button" data-screen="profile">GO TO PROFILE</button></article>`;
  }
  function rewardText(reward) {
    if (reward?.kind === "points") return `${Number(reward.points).toLocaleString("en-IN")} Craving Points · never expire`;
    if (reward?.kind === "free-item") return `${reward.item} free · expires 48 hours after you earn it${Number(reward.minimum) ? ` · ₹${Number(reward.minimum)} eligible regular-food minimum` : ""}`;
    if (reward?.kind === "percent-discount") return `${Number(reward.percent)}% off eligible regular menu items${Number(reward.maxDiscount) ? ` · up to ₹${Number(reward.maxDiscount)}` : ""}${Number(reward.minimum) ? ` · ₹${Number(reward.minimum)} minimum` : ""} · expires after 48 hours`;
    return "Reward will be announced soon";
  }
  function render() {
    if (!gameState?.enabled) {
      root.innerHTML = `<article class="game-panel game-unavailable"><span class="game-hero-icon">🍔</span><h2>Craving Dash is getting ready</h2><p>We’re preparing the next round of tasty challenges. Come back soon!</p><button class="game-secondary" type="button" data-screen="home">BACK HOME</button></article>`;
      return;
    }
    const rewards = gameState.availableRewards || [];
    const stage = gameState.currentStage;
    root.innerHTML = `<article class="game-panel game-overview"><div class="game-overview-head"><div><span class="game-tag">CRAVING HEAVEN ARCADE</span><h2>One quick round. Real rewards.</h2></div><span class="game-points">✦ ${Number(gameState.points || 0).toLocaleString("en-IN")} pts</span></div>
      <p>Swipe the serving tray right to collect foods on your ticket. Skip anything else. Play stages in order and claim each prize once.</p>
      <div class="game-progress"><div><strong>${gameState.completedStages || 0}</strong><span>STAGES CLEARED</span></div><div><strong>${gameState.totalStages || 0}</strong><span>IN THIS CAMPAIGN</span></div><div><strong>${rewards.length}</strong><span>READY TO USE</span></div></div></article>
      ${rewards.length ? `<section class="game-voucher-wallet"><h3>Your game reward${rewards.length > 1 ? "s" : ""}</h3>${rewards.map(item => `<article><span class="voucher-icon">🎁</span><div><strong>${escapeHtml(item.kind === "percent-discount" ? `${item.percent}% off your bill` : `${item.item} · FREE`)}</strong><p>${item.kind === "percent-discount" ? `${Number(item.minimum) ? `Use on ₹${Number(item.minimum)} eligible regular-menu spend. ` : ""}${Number(item.maxDiscount) ? `Discount capped at ₹${Number(item.maxDiscount)}. ` : ""}Combos, extras and delivery are excluded.` : `${Number(item.minimum) ? `Use on ₹${Number(item.minimum)} eligible regular-food spend. ` : ""}Combos and extras don’t count toward the minimum.`}</p><small>EXPIRES ${escapeHtml(dateText(item.expiresAt))}</small></div></article>`).join("")}</section>` : ""}
      ${stage ? `<article class="game-panel game-stage-card"><div class="game-stage-head"><span>STAGE ${stage.order} OF ${gameState.totalStages}</span><span class="game-stage-score">TARGET ${stage.targetScore}</span></div><h2>${escapeHtml(stage.title)}</h2><p>${escapeHtml(stage.instructions)}</p><div class="game-prize-preview"><span>STAGE PRIZE</span><strong>${escapeHtml(rewardText(stage.reward))}</strong></div><button type="button" class="game-primary" data-game-start>START THIS STAGE <span>→</span></button></article>` : `<article class="game-panel game-complete"><span class="game-hero-icon">🏆</span><h2>Campaign cleared!</h2><p>You’ve completed every available stage. Check back when the next Craving Dash campaign begins.</p></article>`}
      ${(gameState.nextStages || []).length ? `<section class="game-next-stages"><h3>Your next stages</h3>${gameState.nextStages.map(item => `<article class="game-locked-stage"><span>🔒</span><div><strong>Stage ${item.order} · ${escapeHtml(item.title)}</strong><small>${escapeHtml(rewardText(item.reward))}</small></div><b>LOCKED</b></article>`).join("")}</section>` : ""}`;
  }
  async function refreshState() {
    if (!gameAvailabilityKnown) { root.innerHTML = `<div class="game-loading">Checking whether Craving Dash is available…</div>`; return; }
    if (!gameEnabled) {
      gameState = { enabled: false };
      root.innerHTML = `<article class="game-panel game-unavailable"><span class="game-hero-icon">🍔</span><span class="game-tag">COMING SOON</span><h2>Craving Dash is getting ready</h2><p>We’re preparing the next round of tasty challenges. Come back soon!</p><button class="game-secondary" type="button" data-screen="home">BACK HOME</button></article>`;
      return;
    }
    if (!window.firebaseAuth?.currentUser) {
      gameState = null;
      root.innerHTML = `<article class="game-panel game-sign-in"><span class="game-hero-icon">🍟</span><h2>Save your game and your prizes</h2><p>Sign in with your mobile number to play Craving Dash, keep your stage progress, and receive rewards in your account.</p><button type="button" class="game-primary" data-game-login>SIGN IN TO PLAY <span>→</span></button></article>`;
      return;
    }
    root.innerHTML = `<div class="game-loading">Loading your stage and rewards…</div>`;
    try { gameState = await callable("getCravingDashState"); render(); }
    catch (error) {
      if (error?.code === "functions/unauthenticated" || /unauthenticated/i.test(String(error?.message || ""))) {
        gameState = null;
        root.innerHTML = `<article class="game-panel game-sign-in"><span class="game-hero-icon">🍟</span><h2>Sign in to save your prizes</h2><p>Sign in with your mobile number to play Craving Dash and receive rewards in your account.</p><button type="button" class="game-primary" data-game-login>SIGN IN TO PLAY <span>→</span></button></article>`;
        return;
      }
      root.innerHTML = `<article class="game-panel"><h2>We couldn’t load your game</h2><p>${escapeHtml(error.message || "Check your connection and try again.")}</p><button class="game-secondary" type="button" data-game-refresh>TRY AGAIN</button></article>`;
    }
  }
  function renderRound() {
    const object = activeRound.objects[nextObject];
    if (!object) return submitRound();
    const currentTicket = activeRound.remainingTicket || activeRound.ticket;
    root.innerHTML = `<section class="game-panel game-round" aria-live="polite"><div class="game-round-top"><div><span class="game-tag">${activeRound.adminTest ? "ADMIN TEST · " : ""}${escapeHtml(activeRound.stage.title)}</span><h2>Fill the ticket</h2></div><div class="game-timer"><strong id="gameTimer">30</strong><small>SECONDS</small></div></div>
      <div class="game-ticket"><span>YOUR TICKET</span><strong>${currentTicket.slice(0, 4).map(name => `<i>${emojiFor(name)} ${escapeHtml(name)}</i>`).join("")}</strong><small>Serve ticket foods only. Wrong foods reduce your score; swipe left to skip.</small></div>
      <div class="game-deck-count">FOOD ${nextObject + 1} OF ${activeRound.objects.length} · SCORE ${Number(activeRound.score || 0)} / ${activeRound.stage.targetScore}</div><div class="game-food-card" id="gameFoodCard" role="group" aria-label="${escapeHtml(object.name)}"><span class="food-emoji" aria-hidden="true">${emojiFor(object.name)}</span><strong>${escapeHtml(object.name)}</strong><small>Swipe → SERVE · Swipe ← SKIP</small></div>
      <div class="game-round-actions"><button class="game-secondary" type="button" data-game-skip>SKIP</button><button class="game-primary" type="button" data-game-serve>SERVE TO TRAY <span>→</span></button></div>
      <div class="game-round-meter"><span style="width:${Math.round(nextObject / activeRound.objects.length * 100)}%"></span></div>${activeRound.adminTest ? `<p class="game-test-note">Admin test mode · no real points, rewards, or progress will be changed.</p><button type="button" class="game-secondary" data-game-admin-exit>EXIT TEST</button>` : ""}</section>`;
    const card = root.querySelector("#gameFoodCard");
    let startX = null;
    card.addEventListener("pointerdown", event => { startX = event.clientX; card.setPointerCapture(event.pointerId); });
    card.addEventListener("pointerup", event => {
      if (startX === null) return;
      const delta = event.clientX - startX; startX = null;
      if (delta > 42) collect(true); else if (delta < -42) collect(false);
    });
    const remainingSeconds = Math.max(0, 60 - Math.floor((Date.now() - activeRound.startedAt) / 1000));
    root.querySelector("#gameTimer").textContent = String(remainingSeconds);
  }
  async function collect(serve) {
    if (!activeRound || submitting || actionPending) return;
    actionPending = true;
    const buttons = root.querySelectorAll(".game-round-actions button");
    buttons.forEach(button => { button.disabled = true; });
    const current = activeRound.objects[nextObject];
    root.querySelector("[data-game-serve]").textContent = "SENDING TO TRAY…";
    try {
      const requestId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g, "");
      const result = await callable("recordCravingDashAction", { challengeId: activeRound.challengeId, objectId: current.id, actionIndex: nextObject, action: serve ? "serve" : "skip", actionRequestId: requestId, adminTest: activeRound.adminTest === true });
      activeRound.score = result.score;
      if (serve) { const ticketIndex = activeRound.remainingTicket.indexOf(current.name); if (ticketIndex >= 0) activeRound.remainingTicket.splice(ticketIndex, 1); }
      nextObject = result.nextActionIndex;
      actionPending = false;
      if (nextObject >= activeRound.objects.length) submitRound(); else renderRound();
    } catch (error) {
      actionPending = false;
      root.insertAdjacentHTML("afterbegin", `<p class="game-error" role="alert">${escapeHtml(error.message || "Couldn’t save that swipe. Please try again.")}</p>`);
      buttons.forEach(button => { button.disabled = false; });
      root.querySelector("[data-game-serve]").textContent = "SERVE TO TRAY →";
    }
  }
  async function beginRound() {
    if (!window.firebaseAuth?.currentUser) return signIn();
    root.querySelector("[data-game-start]").disabled = true;
    try {
      const response = adminTestMode ? await callable("adminStartCravingDashTest", { stageId: adminTestStageId }) : await callable("startCravingDashStage");
      if (adminTestMode && !response.adminTest) throw new Error("Admin test mode could not be verified. Return to the Admin Desk and start again.");
      activeRound = { ...response, score: 0, remainingTicket: [...response.ticket], startedAt: Date.now() }; nextObject = 0; submitting = false;
      renderRound();
      let seconds = 60;
      roundTimer = window.setInterval(() => {
        seconds -= 1;
        const timer = root.querySelector("#gameTimer"); if (timer) timer.textContent = String(seconds);
        if (seconds <= 0) { clearInterval(roundTimer); roundTimer = null; activeRound = null; root.innerHTML = `<article class="game-panel game-result"><span class="game-hero-icon">⏱️</span><h2>Time’s up</h2><p>${adminTestMode ? "Test round ended. No customer rewards or progress were changed." : "Your stage progress is safe. Come back and try again."}</p><button class="game-secondary" type="button" ${adminTestMode ? "data-game-admin-exit" : "data-game-refresh"}>${adminTestMode ? "RETURN TO ADMIN" : "BACK TO STAGES"}</button></article>`; }
      }, 1000);
    } catch (error) {
      root.insertAdjacentHTML("afterbegin", `<p class="game-error" role="alert">${escapeHtml(error.message || "Couldn’t start this stage. Try again.")}</p>`);
      const button = root.querySelector("[data-game-start]"); if (button) button.disabled = false;
    }
  }
  async function submitRound() {
    if (!activeRound || submitting) return;
    submitting = true; clearInterval(roundTimer); roundTimer = null;
    root.innerHTML = `<div class="game-loading">Checking your round…</div>`;
    try {
      const result = await callable("submitCravingDashStage", { challengeId: activeRound.challengeId, adminTest: activeRound.adminTest === true });
      activeRound = null;
      if (result.success) {
        const reward = result.adminTest ? result.rewardPreview : result.reward;
        const prize = reward?.kind === "free-item" ? `${reward.item} free · valid 48 hours after earning` : reward?.kind === "percent-discount" ? `${reward.percent}% off eligible regular menu items${Number(reward.maxDiscount) ? ` · max ₹${reward.maxDiscount}` : ""} · valid 48 hours after earning` : `${Number(result.adminTest ? reward?.points : result.pointsAwarded).toLocaleString("en-IN")} Craving Points${result.adminTest ? " (preview only)" : " added to your account"}.`;
        root.innerHTML = `<article class="game-panel game-result game-won"><span class="game-hero-icon">🎉</span><span class="game-tag">${result.adminTest ? "ADMIN TEST RESULT · NO REWARD ISSUED" : "STAGE CLEARED"}</span><h2>${result.adminTest ? "Stage test complete" : "Nice serving!"}</h2><p>You scored ${result.score} · target ${result.targetScore}.${result.adminTest ? " No customer points, vouchers, or progress were changed." : ""}</p><div class="game-prize-preview"><span>${result.adminTest ? "REWARD PREVIEW" : "YOUR PRIZE"}</span><strong>${escapeHtml(prize)}</strong>${reward?.kind === "percent-discount" ? `<small>Only eligible regular menu items count. Combos, extras, and delivery are excluded.</small>` : reward?.kind === "free-item" ? `<small>${Number(reward.minimum) ? `Use on ₹${Number(reward.minimum)} eligible regular-food spend. ` : ""}Combos and extras do not count toward the minimum. One benefit per order.</small>` : "<small>Craving Points never expire.</small>"}</div><button type="button" class="game-primary" ${result.adminTest ? "data-game-admin-exit" : "data-game-refresh"}>${result.adminTest ? "RETURN TO ADMIN" : "SEE NEXT STAGE →"}</button></article>`;
      } else {
        root.innerHTML = `<article class="game-panel game-result"><span class="game-hero-icon">🍟</span><span class="game-tag">${result.adminTest ? "ADMIN TEST RESULT" : "GOOD TRY"}</span><h2>${result.adminTest ? "Stage needs tuning" : "One more round?"}</h2><p>You scored ${result.score} of ${result.targetScore}.${result.adminTest ? " No rewards or customer progress were changed." : " Your prize stays ready to win on your next try."}</p><button type="button" class="game-primary" ${result.adminTest ? "data-game-retry" : "data-game-retry"}>${result.adminTest ? "TEST AGAIN ↻" : "TRY AGAIN ↻"}</button><button type="button" class="game-secondary" ${result.adminTest ? "data-game-admin-exit" : "data-game-refresh"}>${result.adminTest ? "RETURN TO ADMIN" : "BACK TO STAGES"}</button></article>`;
      }
    } catch (error) {
      activeRound = null;
      root.innerHTML = `<article class="game-panel"><h2>Round check failed</h2><p>${escapeHtml(error.message || "Please try the stage again.")}</p><button class="game-secondary" type="button" ${adminTestMode ? "data-game-admin-exit" : "data-game-refresh"}>${adminTestMode ? "RETURN TO ADMIN" : "BACK TO STAGES"}</button></article>`;
    }
  }
  function maybeShowPromo() {
    if (!promoDialog || !gameState?.enabled) return;
    const key = `cravingDashPromo_${gameState.campaignId || "campaign"}`;
    try { if (Number(localStorage.getItem(key) || 0) > Date.now()) return; } catch (_) { /* Continue for this session. */ }
    const show = () => {
      try { localStorage.setItem(key, String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch (_) { /* Session still works without storage. */ }
      if (!promoDialog.open) promoDialog.showModal();
    };
    const welcome = document.getElementById("firstVisitFlyer");
    if (welcome?.open) welcome.addEventListener("close", show, { once: true }); else window.setTimeout(show, 1800);
  }
  document.addEventListener("click", event => {
    if (event.target.closest("[data-game-admin-exit]")) {
      sessionStorage.removeItem("cravingDashAdminTest");
      if (window.parent !== window) window.parent.postMessage({ type: "craving-dash-admin-test-close" }, location.origin);
      else location.href = `${location.origin}/admin.html`;
      return;
    }
    if (event.target.closest("[data-game-login]")) { signIn(); return; }
    if (event.target.closest("[data-game-start]")) { beginRound(); return; }
    if (event.target.closest("[data-game-serve]")) { collect(true); return; }
    if (event.target.closest("[data-game-skip]")) { collect(false); return; }
    if (event.target.closest("[data-game-refresh]")) { refreshState(); return; }
    if (event.target.closest("[data-game-retry]")) { beginRound(); return; }
    if (event.target.closest(".game-promo-close") || event.target === promoDialog || event.target.closest("#gamePromoDialog [data-screen]")) promoDialog.close();
  });
  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(location.search);
    if (params.get("gameTest") === "1") {
      try {
        const saved = JSON.parse(sessionStorage.getItem("cravingDashAdminTest") || "null");
        if (!saved?.adminTest || !saved.challengeId || !Array.isArray(saved.objects)) throw new Error("The admin test session is missing. Start a stage test again from Admin.");
        adminTestMode = true; adminTestStageId = String(saved.stage?.id || "");
        activeRound = { ...saved, adminTest: true, score: 0, remainingTicket: [...saved.ticket], startedAt: Date.now() }; nextObject = 0; submitting = false;
        document.querySelector('[data-screen="game"]')?.click();
        renderRound();
        let seconds = 60;
        roundTimer = window.setInterval(() => { seconds -= 1; const timer = root.querySelector("#gameTimer"); if (timer) timer.textContent = String(seconds); if (seconds <= 0) { clearInterval(roundTimer); roundTimer = null; activeRound = null; root.innerHTML = `<article class="game-panel game-result"><h2>Test round ended</h2><p>No rewards or customer progress were changed.</p><button type="button" class="game-secondary" data-game-admin-exit>RETURN TO ADMIN</button></article>`; } }, 1000);
      } catch (error) { root.innerHTML = `<article class="game-panel"><h2>Couldn’t open the admin test</h2><p>${escapeHtml(error.message)}</p><button class="game-secondary" type="button" data-game-admin-exit>RETURN TO ADMIN</button></article>`; }
      return;
    }
    if (window.FirebaseAuthAPI?.onAuthStateChanged && window.firebaseAuth) {
      window.FirebaseAuthAPI.onAuthStateChanged(window.firebaseAuth, async user => {
        if (!adminTestMode && document.getElementById("screen-game")?.classList.contains("is-active")) await refreshState();
        if (user) maybeShowPromo();
      });
    }
    try {
      const publicConfig = await callable("getPublicBusinessConfig");
      gameAvailabilityKnown = true;
      gameEnabled = publicConfig.cravingDash?.enabled === true;
      if (!gameEnabled) { await refreshState(); return; }
      if (window.firebaseAuth?.currentUser) { if (document.getElementById("screen-game")?.classList.contains("is-active")) await refreshState(); maybeShowPromo(); }
      else {
        gameState = { enabled: true, campaignId: publicConfig.cravingDash.campaignId };
        if (document.getElementById("screen-game")?.classList.contains("is-active")) await refreshState();
        maybeShowPromo();
      }
    } catch (_) {
      gameAvailabilityKnown = true;
      gameEnabled = false;
      root.innerHTML = `<article class="game-panel game-unavailable"><span class="game-hero-icon">🍔</span><h2>Craving Dash isn’t available right now</h2><p>We couldn’t check the game status. Please refresh and try again soon.</p><button class="game-secondary" type="button" data-screen="home">BACK HOME</button></article>`;
    }
  });
  window.addEventListener("craving-heaven:show-game", () => { if (!adminTestMode) refreshState(); });
})();
