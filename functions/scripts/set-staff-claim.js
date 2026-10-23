const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const [action, phone] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action) || !/^\+?[1-9]\d{9,14}$/.test(phone || "")) {
  console.error("Usage: node scripts/set-staff-claim.js <grant|revoke> <phone-with-country-code>");
  process.exit(2);
}

initializeApp({ projectId: "craving-heaven-e2e94", credential: applicationDefault() });
async function main() {
  const auth = getAuth();
  const user = await auth.getUserByPhoneNumber(phone.startsWith("+") ? phone : `+${phone}`);
  const claims = { ...(user.customClaims || {}) };
  if (action === "grant") claims.staff = true;
  else delete claims.staff;
  await auth.setCustomUserClaims(user.uid, claims);
  if (action === "revoke") await auth.revokeRefreshTokens(user.uid);
  console.log(`Staff access ${action === "grant" ? "enabled" : "removed"} for ${user.phoneNumber} (${user.uid}).`);
  console.log(action === "grant"
    ? "Ask the staff member to sign in again so the updated access token is loaded."
    : "Refresh tokens were revoked. Staff functions also check the current claim, so existing staff sessions lose access immediately.");
}
main().catch(error => {
  console.error(`Could not update staff access: ${error.message}`);
  process.exitCode = 1;
});
