# Staff Desk setup

The staff desk is available at `/staff.html`. It supports Firebase phone OTP login, viewing and updating the latest 100 online and walk-in orders, creating walk-in orders from the server-priced menu, and printing an 80 mm receipt from the browser. Entering a customer's verified website-account phone number looks up their saved name and current Craving Points and rewards. The walk-in order is attached to that account; points and reward milestones are credited when staff mark the order delivered. Combos earn points at the configured half rate. A customer's first online order can include a free Classic Crunchy Burger when it contains at least one paid regular-menu item; combos or extras alone do not qualify.

Online ordering is OFF by default and must be started by staff from the **Online status** tab. A start is valid only for the current Mumbai calendar day and only during store hours; the schedule never turns ordering on by itself. Staff can stop ordering at any time or pause it temporarily during a rush. Walk-in orders are unaffected. The server checks this state when accepting every online order, so hiding or disabling checkout in the browser alone cannot bypass it.

## Enable staff access

Staff access is denied by default. The Functions check the Firebase Authentication custom claim `staff: true`; the staff page cannot grant access to itself. Firestore rules continue to prevent direct order reads and writes from the browser.

1. Have each staff member sign in once on the deployed site using the mobile number they will use for the staff desk. This creates their Firebase Authentication account.
2. On an administrator computer with the Firebase CLI and Google Cloud CLI installed, authenticate with a Google account that has permission to manage users in the `craving-heaven-e2e94` Firebase project:

   ```powershell
   gcloud auth application-default login
   ```

3. From the project folder, grant staff access to that account:

   ```powershell
   node functions/scripts/set-staff-claim.js grant +91XXXXXXXXXX
   ```

4. Ask the staff member to sign in again at `/staff.html`. To remove their access later, run the same command with `revoke` instead of `grant`.

The claim tool preserves other existing custom claims. Keep administrator credentials private; do not put service account keys in the website folder or commit them to Git.

## Deploy

After review, deploy the Cloud Functions and Firebase Hosting site:

```powershell
firebase deploy --only functions,hosting
```

Phone Authentication must be enabled and the website domain must be authorized in Firebase Authentication. Localhost uses the configured local emulators; staff claims for local emulator accounts need to be set in the emulator environment separately.

## Receipt printing

Use a printer configured in the device's normal print dialog. The receipt is laid out for an 80 mm thermal printer, and also works with a regular printer by choosing its available paper size. Walk-in orders let staff select Cash or UPI and mark payment Paid or Pending; these fields are recorded for the receipt and order record.
