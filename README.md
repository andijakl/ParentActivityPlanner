# Parent Activity Hub

Parent Activity Hub is a web application designed to help parents coordinate activities with other parents and their children. It allows users to create profiles, plan activities, connect with friends using invite codes, and join each other's events.

Built with Next.js, TypeScript, Tailwind CSS, ShadCN UI, and Firebase.

## Features

- **User Authentication**: Sign up/in with Email/Password or Google Account via Firebase Authentication.
- **User Profiles**: Manage parent contact information and children's nicknames.
- **Activity Planning**: Create activities with details like title, date, time, and optional location.
- **Calendar/Activity View**: See your planned activities and those of your friends. View activity details. Edit and delete activities you created.
- **Friend System**: Connect with other parents using simple, shareable invite links.
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
        *   Add `localhost` (this is crucial for local development).
        *   **Important:** If deploying, add your Firebase Hosting domain(s) here (e.g., `your-project-id.web.app`, `your-project-id.firebaseapp.com`, and any custom domains).
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
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional
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

    // Users: Authenticated users can read any profile. Only the owner can update their own profile.
    // Anyone authenticated can create a user profile (typically on sign-up).
    match /users/{userId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }

    // Friends subcollection: Can manage own friends list
    match /users/{userId}/friends/{friendId} {
       allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }

    // Activities: Logged-in users can read/create. Only creator can update/delete.
    // Participants can be updated by any logged-in user (for joining/leaving).
    match /activities/{activityId} {
      allow read, create: if request.auth != null;
      // Allow update only if it's the creator OR if only the participants/participantUids field is changing
      allow update: if request.auth != null && (
                      resource.data.creatorId == request.auth.uid ||
                      (request.resource.data.diff(resource.data).affectedKeys().hasAny(['participants', 'participantUids']) &&
                       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['participants', 'participantUids']))
                    );
      // Allow delete only by the creator
      allow delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
    }

    // Invitations: Logged-in users can read/create/delete their own invites.
    // Anyone logged in can read an invite (to accept it).
    match /invitations/{inviteCode} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.inviterId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.inviterId == request.auth.uid;
    }
  }
}
```

Upload these rules via the Firebase Console ("Firestore Database" > "Rules" tab) or using the Firebase CLI.

## Deployment

This project uses Next.js App Router configured for **static export** (`output: 'export'`) and is ideal for deployment to **Firebase Hosting**.

### Firebase Hosting Deployment

1.  **Ensure `output: 'export'` is in `next.config.ts`:**
    ```ts
    // next.config.ts
    import type { NextConfig } from 'next';

    const nextConfig: NextConfig = {
      output: 'export', // Enable static export
      images: {
        unoptimized: true, // Required for static export
      },
      // ... other config ...
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
    *   Configure as a single-page app: **Yes**. This is crucial for handling client-side routing.
    *   Set up automatic builds and deploys with GitHub: No (unless you want to configure CI/CD - see below).

4.  **Verify `firebase.json`:**
    Ensure your `firebase.json` (created/updated by `firebase init hosting`) looks similar to this:
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
    }
    ```
    The `"rewrites"` rule is essential for a Single Page Application (SPA) like this Next.js app. It ensures that all navigation requests are handled by `index.html`, allowing the Next.js client-side router to manage the routes correctly.

5.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```
    After deployment, access your app at the provided Firebase Hosting URL (e.g., `your-project-id.web.app`). Remember to add this URL to your Firebase Authentication authorized domains.

### Other Static Hosting Options

You can also deploy the contents of the `out/` directory to other static hosting providers like Vercel (select "Other" framework type), Netlify, GitHub Pages, etc. Ensure they are configured to handle Single Page Applications (SPAs) correctly, usually by setting up a rewrite rule similar to the Firebase one (redirecting all paths to `index.html`).


### For a complete re-build, use:

```
# 1. Clean Next.js build cache
rm -rf .next out

# 2. Clean package manager cache (choose the command for your package manager)
npm cache clean --force

# 3. Reinstall dependencies (choose the commands for your package manager)
rm -rf node_modules
rm package-lock.json 
npm install

# 4. Rebuild the Next.js application
npm run build 

# 5. and 6. Clean Firebase Hosting cache and deploy both hosting and functions
firebase deploy --only hosting
```

### Continuous Deployment (CI/CD) - Example with GitHub Actions for Firebase Hosting

1.  **Push your code** to a GitHub repository.
2.  **Set up GitHub Actions:** Create a `.github/workflows/firebase-deploy.yml` file:
    ```yaml
    name: Deploy to Firebase Hosting on Push

    on:
      push:
        branches:
          - main # Or your deployment branch

    jobs:
      build_and_deploy:
        runs-on: ubuntu-latest
        env: # Define NEXT_PUBLIC_ variables needed at BUILD time
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
        steps:
          - name: Checkout Repository
            uses: actions/checkout@v4 # Updated version

          - name: Set up Node.js
            uses: actions/setup-node@v4 # Updated version
            with:
              node-version: '18' # Match your development Node.js version
              cache: 'npm' # Or yarn/pnpm

          - name: Install Dependencies
            run: npm install # Or yarn install / pnpm install

          - name: Build Next.js Static Site
            run: npm run build # Generates the 'out' directory

          - name: Deploy to Firebase Hosting
            uses: FirebaseExtended/action-hosting-deploy@v1 # Use v1 for stability
            with:
              repoToken: '${{ secrets.GITHUB_TOKEN }}'
              firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PARENT_ACTIVITY_HUB }}' # Your service account JSON key
              projectId: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }} # Use the secret for Project ID
              channelId: live # Deploy to the live channel
    ```
3.  **Add Secrets to GitHub:**
    *   Go to your GitHub repository settings > Secrets and variables > Actions.
    *   Click "New repository secret" for each secret:
        *   `FIREBASE_SERVICE_ACCOUNT_PARENT_ACTIVITY_HUB`: Generate a service account key in Firebase Project Settings > Service accounts. Go to the "Keys" tab for the service account, click "Add key" > "Create new key", choose JSON, and create. Copy the entire JSON content as the secret value. **Treat this key securely!**
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase API Key.
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain.
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase Project ID.
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket.
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID.
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase App ID.
        *   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`: Your Firebase Measurement ID (optional).
4.  **Push the workflow file.** Deployments will now trigger automatically on pushes to the specified branch (`main` in the example).
```