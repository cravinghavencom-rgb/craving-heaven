import { firebaseAuth as auth, firebaseAuthPersistenceReady, firebaseFunctions, FirebaseAuthAPI, FirebaseFunctionsAPI } from "./firebase-client.js?v=20261030-central-auth-v1";

const $ = id => document.getElementById(id);
const setupMessage = $("setupMessage");
const { createUserWithEmailAndPassword, sendEmailVerification, signInWithPhoneNumber, RecaptchaVerifier, linkWithCredential, EmailAuthProvider, onAuthStateChanged, signOut } = FirebaseAuthAPI;
const { httpsCallable } = FirebaseFunctionsAPI;
let verifier = null;
let confirmation = null;
let teamUser = null;

function setMessage(text, type = "") { setupMessage.textContent = text; setupMessage.className = `message ${type}`.trim(); }
function resetVerifier() {
  verifier?.clear();
  verifier = null;
  const old = $("migrationRecaptcha");
  const fresh = old.cloneNode(false);
  old.replaceWith(fresh);
}

$("newTeamAccountForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("newTeamEmail").value.trim().toLowerCase();
  const password = $("newTeamPassword").value;
  if (password.length < 8) return setMessage("Use a password with at least 8 characters.", "error");
  const button = event.submitter; button.disabled = true;
  try {
    await firebaseAuthPersistenceReady;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
    await signOut(auth);
    setMessage("Account created. Verify the email first, then ask Admin to add this email as Staff. This new account has no team access yet.", "success");
    event.target.reset();
  } catch (error) {
    setMessage(error.code === "auth/email-already-in-use" ? "This email already has an account. Sign in to it, verify the email, then ask Admin to grant access." : (error.message || "Could not create the email account."), "error");
  } finally { button.disabled = false; }
});

$("migrationPhoneForm").addEventListener("submit", async event => {
  event.preventDefault();
  const digits = $("migrationPhone").value.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) return setMessage("Enter a valid 10-digit Indian mobile number.", "error");
  const button = $("migrationSendOtp"); button.disabled = true;
  try {
    await firebaseAuthPersistenceReady;
    verifier ||= new RecaptchaVerifier(auth, "migrationRecaptcha", { size: "invisible" });
    confirmation = await signInWithPhoneNumber(auth, `+91${digits}`, verifier);
    $("migrationOtpForm").hidden = false;
    setMessage(`Verification code sent to +91 ${digits}.`);
  } catch (error) {
    resetVerifier();
    setMessage(error.code === "auth/too-many-requests" ? "Too many attempts. Wait before requesting another code." : (error.message || "Could not send the verification code."), "error");
  } finally { button.disabled = false; }
});

$("migrationOtpForm").addEventListener("submit", async event => {
  event.preventDefault();
  const otp = $("migrationOtp").value.trim();
  if (!confirmation || !/^\d{6}$/.test(otp)) return setMessage("Enter the 6-digit verification code.", "error");
  const button = event.submitter; button.disabled = true;
  try {
    const credential = await confirmation.confirm(otp);
    const token = await credential.user.getIdTokenResult(true);
    if (token.claims.admin !== true && token.claims.staff !== true) {
      await signOut(auth);
      throw new Error("This phone account has no current Admin or Staff access. Ask the administrator to grant access to a verified email account.");
    }
    teamUser = credential.user;
    $("migrationEmailForm").hidden = false;
    $("migrationOtpForm").hidden = true;
    setMessage("Team account verified. Add a unique email and password to link to this same account.", "success");
  } catch (error) { setMessage(error.code === "auth/invalid-verification-code" ? "That code is incorrect. Check it and try again." : (error.message || "Could not verify the account."), "error"); }
  finally { button.disabled = false; }
});

$("migrationEmailForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!teamUser || auth.currentUser?.uid !== teamUser.uid) return setMessage("Verify the existing team phone account first.", "error");
  const email = $("migrationEmail").value.trim().toLowerCase();
  const password = $("migrationPassword").value;
  if (password.length < 8) return setMessage("Use a password with at least 8 characters.", "error");
  const button = event.submitter; button.disabled = true;
  try {
    await linkWithCredential(teamUser, EmailAuthProvider.credential(email, password));
    await sendEmailVerification(teamUser);
    $("migrationEmailForm").hidden = true;
    $("finishMigrationButton").hidden = false;
    setMessage(`Verification sent to ${email}. Open it on this device, then tap “Finish after verifying email”.`, "success");
  } catch (error) {
    const note = error.code === "auth/email-already-in-use" ? "That email is already linked to another Firebase account. Use a new email address." : (error.message || "Could not link this email. Please try again.");
    setMessage(note, "error");
  } finally { button.disabled = false; }
});

$("finishMigrationButton").addEventListener("click", async event => {
  const button = event.currentTarget; button.disabled = true;
  try {
    if (!teamUser || auth.currentUser?.uid !== teamUser.uid) throw new Error("Your verified team session expired. Sign in with the existing team phone and retry.");
    await teamUser.reload();
    teamUser = auth.currentUser;
    if (!teamUser?.emailVerified) throw new Error("Email is not verified yet. Open the verification email link, return here, then tap this button again.");
    const finish = httpsCallable(firebaseFunctions, "finishTeamEmailSetup");
    const response = await finish({});
    await signOut(auth);
    setMessage(response.data?.message || "Email sign-in is ready. Sign in with your email now.", "success");
    setTimeout(() => { location.href = "/admin.html"; }, 1000);
  } catch (error) { setMessage(error.message || "Could not finish team email setup.", "error"); }
  finally { button.disabled = false; }
});

onAuthStateChanged(auth, user => {
  if (user && teamUser && user.uid !== teamUser.uid) { teamUser = null; confirmation = null; }
});
