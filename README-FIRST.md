# BALAJI B K — Faculty Portal (Firebase + Cloudinary)

This package is prepared for GitHub Pages with:
- Firebase Authentication for the private administrator login.
- Firebase Firestore for published content and site records.
- Cloudinary for profile photos, site images, gallery images, and PDF/document uploads.

## GitHub upload
1. Extract this ZIP on your computer.
2. Open the extracted folder.
3. Upload the CONTENTS of this folder to the ROOT of `BALAJIBK011/balajibk011.github.io`.
4. Replace the old website files when GitHub asks.
5. Commit the changes.
6. Wait for GitHub Pages to deploy.

Do not upload this ZIP as a single file and expect GitHub Pages to unpack it.

## Admin
Open:
`/admin/`

The administrator email is configured as `balajibk011@gmail.com` and Firebase Email/Password authentication is required.

## Cloudinary
Configured values:
- Cloud name: `al0uzxbq`
- Unsigned upload preset: `balaji_faculty_upload`
- Asset folder: `balaji-faculty`

No Cloudinary API secret or Firebase service-account credential is included.

## Important Cloudinary PDF setting
For PDFs to open for visitors on a Cloudinary Free account, enable:
Cloudinary Console → Product Environment Settings → Security → **Allow delivery of PDF and ZIP files**.

## Firebase
Firestore rules are included in `firestore.rules`. Firebase Storage is not used by the website upload code.
