# Activity Hub

Activity Hub is a web application designed to help parents coordinate activities with other parents and their children. It allows users to create profiles, plan activities, connect with friends using invite codes, and join each other's events.

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
    cd activity-hub
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

This project can be deployed using different methods. The `next.config.ts` is currently set up for Server-Side Rendering (SSR) or a hybrid approach. If you wish to deploy as a static site, you'll need to enable `output: 'export'` in `next.config.ts`.

### Option 1: SSR with Firebase Hosting and Cloud Functions (Recommended for full features)

For SSR, you'll typically deploy your Next.js app to Cloud Functions and use Firebase Hosting to serve it.

1.  **Initialize Firebase Functions:**
    ```bash
    firebase init functions
    ```
    *   Choose TypeScript.
    *   Install dependencies with npm when prompted.

2.  **Initialize Firebase Hosting (if not already done for SSR):**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project".
    *   For your public directory, you can point it to a placeholder or leave it as `public` initially. The main serving will be handled by the function rewrite.
    *   Configure as a single-page app: No (unless you have specific SPA parts not handled by Next.js SSR).
    *   Set up automatic builds with GitHub: Optional.

3.  **Modify `firebase.json` for SSR:**
    Your `firebase.json` should look something like this to rewrite all requests to your Next.js Cloud Function:
    ```json
    {
      "hosting": {
        "public": "public", // Or your chosen static assets folder, if any
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "rewrites": [
          {
            "source": "**",
            "function": "nextServer" // Replace "nextServer" with your function's name
          }
        ]
      },
      "functions": [ // Or functions.source if using a single function entry point
        {
          "source": "functions", // Or your functions directory
          "codebase": "default",
          "runtime": "nodejs18" // Or your preferred runtime
        }
      ]
    }
    ```
    *   You'll need to create a Firebase Function (e.g., `nextServer`) that serves your Next.js app. Framework-aware CLI might handle this (e.g., `firebase deploy --only hosting,functions`). Refer to Firebase documentation for deploying Next.js SSR applications.

4.  **Update `next.config.ts` (ensure `output: 'export'` is NOT set):**
    ```ts
    import type {NextConfig} from 'next';

    const nextConfig: NextConfig = {
      // output: 'export', // Make sure this is commented out or removed for SSR
      images: {
        unoptimized: false, // Can be false for SSR if using next/image optimization
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'picsum.photos',
            port: '',
            pathname: '/**',
          },
          {
            protocol: 'https',
            hostname: 'lh3.googleusercontent.com',
          }
        ],
      },
      typescript: {
        ignoreBuildErrors: true,
      },
      eslint: {
        ignoreDuringBuilds: true,
      },
    };

    export default nextConfig;
    ```

5.  **Build and Deploy:**
    ```bash
    npm run build
    firebase deploy --only hosting,functions
    ```

### Option 2: Static Export to Firebase Hosting (Simpler, but limitations)

If you prefer a fully static site (limitations with dynamic server-side features):

1.  **Update `next.config.ts` for Static Export:**
    ```ts
    import type {NextConfig} from 'next';

    const nextConfig: NextConfig = {
      output: 'export', // Add this line for static export
      images: {
        unoptimized: true, // Required for static export if using next/image
        remotePatterns: [ /* ... as above ... */ ],
      },
      typescript: { ignoreBuildErrors: true },
      eslint: { ignoreDuringBuilds: true },
    };

    export default nextConfig;
    ```

2.  **Initialize Firebase Hosting (for static site):**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project".
    *   Set your public directory to `out`. **Important**: Next.js static export outputs to the `out` directory.
    *   Configure as a single-page app (SPA): **Yes**.
    *   Set up automatic builds with GitHub: Optional.

3.  **Update `firebase.json` for Static Site:**
    ```json
    {
      "hosting": {
        "public": "out", // Points to Next.js static export directory
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "rewrites": [
          {
            "source": "**",
            "destination": "/index.html" // For SPA behavior
          }
        ]
      }
    }
    ```

4.  **Build the Application:**
    ```bash
    npm run build
    ```
    This command will generate the static site in the `out` directory.

5.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```

### Continuous Deployment (CI/CD) - Example with GitHub Actions

This example is for a **static export deployment**. Adjust for SSR if needed.

1.  **Create a GitHub Actions workflow file:** `.github/workflows/firebase-deploy.yml`
2.  **Add the following workflow configuration:**
    ```yaml
    name: Deploy to Firebase Hosting on merge

    on:
      push:
        branches:
          - main # Or your default branch

    jobs:
      build_and_deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout code
            uses: actions/checkout@v4

          - name: Set up Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '18' # Match your development environment

          - name: Install dependencies
            run: npm install # or yarn install / pnpm install

          - name: Create .env.local
            run: |
              echo "NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}" >> .env.local
              # ... add all other NEXT_PUBLIC_FIREBASE_ variables
            env:
              NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
              # ... list all secrets here to make them available to the run step

          - name: Build project (for static export)
            run: npm run build # This should generate the 'out' folder

          - name: Deploy to Firebase Hosting
            uses: FirebaseExtended/action-hosting-deploy@v0
            with:
              repoToken: '${{ secrets.GITHUB_TOKEN }}'
              firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_ACTIVITY_HUB }}' # Service account JSON
              channelId: live
              projectId: your-firebase-project-id # Replace with your Firebase project ID
              # Ensure this deploys the 'out' directory if using static export
    ```
3.  **Add Secrets to GitHub Repository** (as described previously).

Choose the deployment option that best suits your needs. SSR offers more flexibility, while static export is simpler for basic sites.