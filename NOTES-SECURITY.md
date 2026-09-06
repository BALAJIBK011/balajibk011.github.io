# Security notes

- The public website uses Firebase client configuration in the browser; this is normal for Firebase web apps. Access control is enforced with Authentication and Firestore Security Rules.
- There is no public administrator sign-up. The admin email is checked in the application and in Firestore rules.
- Cloudinary uses an unsigned upload preset because uploads are initiated directly from the browser. Never place a Cloudinary API secret in client-side JavaScript.
- Unsigned presets can be discovered by browser users, so keep the preset restricted to the intended formats and file-size limits in Cloudinary.
- Firebase Storage upload code has been removed from `js/admin.js`.
- Cloudinary files remain stored when a Firestore listing is deleted because secure server-side deletion would require credentials that must not be exposed in the browser.
