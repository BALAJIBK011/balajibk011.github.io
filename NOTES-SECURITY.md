# Security design notes

- Admin authentication uses Firebase Email/Password.
- The site contains no public sign-up flow.
- The app checks the logged-in email against the configured administrator email and requires email verification.
- Firestore rules enforce the same administrator email restriction on the backend. A malicious browser cannot bypass these rules by modifying the JavaScript.
- Storage rules enforce administrator-only writes/deletes and file-size/type limits on gallery/site media.
- Published documents are represented by Firestore metadata plus a Firebase Storage file. The public site reads metadata and opens the stored download URL.
- The admin UI validates PDF/image file types and size before upload, but backend rules are also required; client validation alone is not a security boundary.
- Keep all uploaded academic material public only if you are authorized to publish it. Do not upload student personal data, marks, attendance, passwords, private correspondence, or other sensitive information.
- Consider Firebase App Check after initial deployment to reduce abuse from unauthorized clients.
