# Parent Activity Hub

Parent Activity Hub is a web application designed to help parents coordinate activities with other parents and their children. It allows users to create profiles, plan activities, connect with friends using invite codes, and join each other's events.

Built with Next.js, TypeScript, Tailwind CSS, ShadCN UI, and Firebase.

## Features

- **User Authentication**: Sign up/in with Email/Password or Google Account via Firebase Authentication.
- **User Profiles**: Manage parent contact information and children's nicknames.
- **Activity Planning**: Create activities with details like title, date, time, and optional location.
- **Calendar/Activity View**: See your planned activities and those of your friends.
- **Friend System**: Connect with other parents using simple, shareable invite codes.
- **Join Activities**: Participate in activities created by friends.
- **Participant Lists**: View who is attending an activity.
- **Responsive Design**: Mobile-first UI for easy use on any device.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, or pnpm
- Firebase Account and Project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd parent-activity-hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Firebase Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2.  **Enable Authentication**:
    *   In the Firebase project console, navigate to "Authentication".
    *   Click "Get started".
    *   Enable the "Email/Password" and "Google" sign-in methods.
    *   **Authorize Domains**:
        *   Still in the Authentication section, go to the "Settings" tab.
        *   Under "Authorized domains", click "Add domain".
        *   Add `localhost` (this is crucial for local development). If your app runs on a specific port like `localhost:9002` and you still face issues, ensure `localhost` is sufficient. Firebase usually treats `localhost` broadly for development.
        *   If deploying to a custom domain later, add that domain here as well.
3.  **Enable Firestore Database**:
    *   Navigate to "Firestore Database".
    *   Click "Create database".
    *   Start in **production mode** (you'll configure security rules later).
    *   Choose a Firestore location.
4.  **Get Firebase Configuration**:
    *   In your Firebase project settings (click the gear icon), find your web app configuration.
    *   Copy the `firebaseConfig` object.
5.  **Configure Environment Variables**:
    *   Create a file named `.env.local` in the root of the project.
    *   Add your Firebase configuration keys to this file:
        ```plaintext
        NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
        NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
        ```
    *   **Important**: `.env.local` should be added to your `.gitignore` file to avoid committing sensitive keys.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:9002](http://localhost:9002) (or the specified port) in your browser to see the application.

## Firestore Security Rules

Basic security rules are needed to protect user data. Create a `firestore.rules` file in the project root (or use the Firebase console) with rules like the example below. **These are basic examples and should be thoroughly reviewed and adapted for production security needs.**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: Can read own data, can create profile if not existing, can update own profile
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null; // Allow creation if logged in
    }

    // Activities: Logged-in users can read/create. Only creator can update/delete.
    // Participants can be updated by any logged-in user (for joining).
    match /activities/{activityId} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
      // Allow updating participants array by any authenticated user (for joining/leaving)
      allow update: if request.auth != null && request.resource.data.participants != resource.data.participants;
    }

    // Friendships: Users can manage their own friend lists
    match /users/{userId}/friends/{friendId} {
       allow read, create, delete: if request.auth != null && request.auth.uid == userId;
    }

    // Invitations: Logged-in users can read/create/delete their own invites.
    // Need careful rules for reading based on code.
    match /invitations/{inviteCode} {
      allow read, create: if request.auth != null;
      allow delete: if request.auth != null && resource.data.inviterId == request.auth.uid;
      // Consider rules allowing read access for the specific invitee if needed during acceptance
    }
  }
}
```

Upload these rules via the Firebase Console ("Firestore Database" > "Rules" tab) or using the Firebase CLI.

## Deployment

This project uses Next.js App Router and can be deployed as a static site using `output: 'export'`.

**Recommended Deployment: Firebase Hosting**

Firebase Hosting is well-suited for static Next.js exports.

1.  **Ensure `output: 'export'` is in `next.config.ts`:**
    ```ts
    // next.config.ts
    import type { NextConfig } from 'next';

    const nextConfig: NextConfig = {
      output: 'export', // Enable static export
      // ... other config like images ...
    };

    export default nextConfig;
    ```

2.  **Build the static site:**
    ```bash
    npm run build
    # or
    # yarn build
    # or
    # pnpm build
    ```
    This will generate the static files in the `out/` directory.

3.  **Initialize Firebase Hosting (if not already done):**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project".
    *   Set the public directory to `out`.
    *   Configure as a single-page app: **Yes**. This is important for handling client-side routing.
    *   Set up automatic builds and deploys with GitHub: No (unless you want to configure CI/CD).

4.  **Modify `firebase.json`:**
    Ensure your `firebase.json` looks similar to this:
    ```json
    {
      "hosting": {
        "public": "out", // Point to the Next.js export directory
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "rewrites": [
          {
            "source": "**",
            "destination": "/index.html" // Serve index.html for all routes (SPA behavior)
          }
        ]
      }
      // Remove the "functions" section if you are not using SSR Cloud Functions
    }
    ```
    The rewrite rule ensures that all paths are served by `index.html`, allowing Next.js client-side router to handle them.

5.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```

**Other Static Hosting Options:**

You can also deploy the contents of the `out/` directory to other static hosting providers like Vercel (select "Other" framework type), Netlify, GitHub Pages, etc. Ensure they are configured to handle Single Page Applications (SPAs) correctly (usually by redirecting all paths to `index.html`).

**Continuous Deployment (CI/CD) - Example with GitHub Actions for Firebase Hosting:**

1.  **Push your code** to a GitHub repository.
2.  **Set up GitHub Actions:** Create a `.github/workflows/firebase-deploy.yml` file:
    ```yaml
    name: Deploy to Firebase Hosting

    on:
      push:
        branches:
          - main # Or your deployment branch

    jobs:
      build_and_deploy:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Use Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '18' # Match your development Node.js version
              cache: 'npm' # Or yarn/pnpm
          - name: Install Dependencies
            run: npm install # Or yarn install / pnpm install
          - name: Build Next.js App
            run: npm run build # Or yarn build / pnpm build
            env: # Set build-time environment variables if needed
              NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
              NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
              # ... add all other NEXT_PUBLIC_ variables ...
          - name: Deploy to Firebase Hosting
            uses: FirebaseExtended/action-hosting-deploy@v0
            with:
              repoToken: '${{ secrets.GITHUB_TOKEN }}'
              firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PARENT_ACTIVITY_HUB }}' # Your service account JSON key
              channelId: live
              projectId: your-firebase-project-id # Your Firebase Project ID
    ```
3.  **Add Secrets to GitHub:**
    *   Go to your GitHub repository settings > Secrets and variables > Actions.
    *   Add secrets for `FIREBASE_SERVICE_ACCOUNT_PARENT_ACTIVITY_HUB` (generate a service account key in Firebase Project Settings > Service accounts) and all your `NEXT_PUBLIC_FIREBASE_*` variables.
4.  **Push the workflow file.** Deployments will trigger automatically on pushes to the specified branch.
```
