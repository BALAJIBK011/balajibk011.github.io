# BALAJI B K Faculty Portal — V2 architecture

This version keeps the public site on GitHub Pages and uses Firebase Authentication, Firestore and Cloud Storage for the private Administration Portal and published content.

## Important
Do **not** put passwords, service-account JSON files, Firebase Admin SDK credentials, or other secrets in the repository.

The browser Firebase configuration in `js/firebase-config.js` is normal for a Firebase web app. Security comes from Firebase Authentication plus the Firestore and Storage rules.

## One-time setup

1. Create a Firebase project at https://console.firebase.google.com/.
2. Add a **Web app** in Project settings and copy the Firebase web configuration into `js/firebase-config.js`.
3. In Firebase Authentication, enable **Email/Password** sign-in. Do not create a public sign-up page.
4. Create the administrator account with email `balajibk011@gmail.com`, set a strong unique password, and verify the email address. Firebase supports password policies, so enable a strong password policy in Authentication settings.
5. Create a **Cloud Firestore Standard** database. Start in production/locked rules if offered, then deploy/paste the included `firestore.rules`.
6. Create **Cloud Storage** and deploy/paste the included `storage.rules`.
7. Add the GitHub Pages URL to Firebase Authentication > Settings > Authorized domains.
8. Open `https://YOURUSERNAME.github.io/admin/` and sign in. There is intentionally no public registration button.
9. In Admin > Theory & Practical, create the exact 5 theory subjects and 5 practical/lab subjects you want. Upload forms will then use those controlled choices.
10. In Admin > Profile & Images, upload your profile photo, home background, university and department photographs.

## Public workflow

Students see only published items. New notifications/resources are marked `NEW` for the first 48 hours based on the publication timestamp. The document stays available after the 48-hour period.

## Upload routing

- Theory: Admin > Upload Material > Destination = Theory > choose exact subject.
- Practical/Lab: Admin > Upload Material > Destination = Practical/Lab > choose exact lab.
- Question Papers: Admin > Question Papers > choose academic year > Theory/Practical > subject.
- Notifications: Admin > Notifications.
- General documents: Admin > Resources.
- Research: Admin > Research.
- Achievements: Admin > Achievements.
- Photos: Admin > Gallery or Admin > Profile & Images.

The selected metadata is stored with the document so the public site knows where to display it; you do not manually edit HTML links.

## Recommended security hardening

After the first successful deployment, enable Firebase App Check for the web app (prefer reCAPTCHA Enterprise for a new integration), keep email verification required, review Authentication sign-in methods, and periodically review Firebase audit/security settings. Never loosen Firestore or Storage rules to `allow read, write: if true`.

## Publishing on GitHub Pages

The repository is designed to work as a static GitHub Pages site. GitHub Pages serves the HTML/CSS/JavaScript; Firebase supplies the authentication, database and storage services used by the portal.

## Firebase Rules deployment without a local CLI

For a simple setup, open Firebase Console > Firestore Database > Rules and replace the rules with the contents of `firestore.rules`; then open Storage > Rules and replace them with `storage.rules`.
