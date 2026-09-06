# Security Notes

- Firebase Authentication protects the private admin portal.
- Only `balajibk011@gmail.com` is accepted by the admin code.
- Email verification is required before admin access is granted.
- Firestore rules allow public reads but restrict writes to the verified administrator.
- Cloudinary uses an unsigned upload preset for browser uploads. Cloud name and upload preset are client-side configuration, not secrets.
- Never put a Cloudinary API secret or Firebase service-account private key in this repository.
- Firebase Storage is not used by this website.
