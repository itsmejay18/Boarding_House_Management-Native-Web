# Native Boarding House Management System (No NPM)

A pure HTML/CSS/JavaScript boarding house management system using Firebase CDN and GitHub Pages.

## Project Structure

```
project/
├── index.html
├── auth/
│   ├── login.html
│   ├── register.html
│   └── auth.js
├── admin/
│   ├── dashboard.html
│   ├── boarding-houses.html
│   ├── users.html
│   └── admin.js
├── staff/
│   ├── dashboard.html
│   ├── applications.html
│   └── staff.js
├── user/
│   ├── dashboard.html
│   ├── browse.html
│   └── user.js
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── firebase-config.js
│   │   ├── main.js
│   │   └── auth-check.js
│   └── images/
└── README.md
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Email/Password in Authentication.
3. Create Realtime Database and enable Storage.
4. Copy your Firebase config into `assets/js/firebase-config.js`.
5. Seed your first admin user by registering a normal account, then update the role in the database:

```
users/<uid>/role = "admin"
```

## Firebase Security Rules

Paste these into Realtime Database Rules:

```
{
  "rules": {
    "landingContent": {
      ".read": true,
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "boardingHouses": {
      ".read": true,
      ".write": "auth != null && ['admin', 'staff'].includes(root.child('users').child(auth.uid).child('role').val())"
    },
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    "applications": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$applicationId": {
        ".write": "auth != null && (data.child('userId').val() === auth.uid || ['admin', 'staff'].includes(root.child('users').child(auth.uid).child('role').val()))"
      }
    }
  }
}
```

## Core Features

- Role-based dashboards (Admin, Staff, User).
- Landing page editor controlled by Admin.
- Boarding house CRUD with image upload.
- Applications workflow with approval/rejection.
- Favorites, application tracking, and document upload.
- Price change notifications for favorited listings (stored in `notifications`).
- Real-time UI updates.
- Offline fallback for landing content and featured listings.

## Email Notifications

The UI writes notification records to the `notifications` node. For real emails, connect Firebase Extensions or Cloud Functions with a mail provider. This avoids exposing email credentials on the client.

## Deployment (GitHub Pages)

1. Initialize Git and push to GitHub.
2. Go to repository Settings > Pages.
3. Select branch `main` and `/root`.
4. Save and wait for deployment.

## Testing Checklist

- Register/login flows for all roles.
- Create and edit boarding houses.
- Apply for a boarding house and approve/reject.
- Check responsive layout at 320px, 768px, 1024px, and 1200px.
- Validate security rules using Firebase emulator or Rules Playground.

## Notes

- Replace placeholders in `assets/js/firebase-config.js` before deployment.
- Image uploads require Firebase Storage to be enabled.
- GitHub Pages requires relative paths (already used in this project).
