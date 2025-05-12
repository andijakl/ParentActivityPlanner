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

### Prerequisites

- Firebase CLI: Install via `npm install -g firebase-tools`
- Login to Firebase: `firebase login`

### Configuration

1.  **Initialize Firebase Hosting:**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project" and choose your Firebase project.
    *   Set your public directory to `out`. **Important**: Next.js static export outputs to the `out` directory by default.
    *   Configure as a single-page app (SPA): **Yes** (This helps with client-side routing).
    *   Set up automatic builds and deploys with GitHub: **No** (You can set this up later if needed).
    *   File `out/index.html` already exists. Overwrite? **No**.

2.  **Update `next.config.ts` for Static Export (if not already configured):**
    Ensure your `next.config.ts` includes `output: 'export'` for static builds compatible with Firebase Hosting's basic tier:

    ```ts
    import type {NextConfig} from 'next';

    const nextConfig: NextConfig = {
      output: 'export', // Add this line for static export
      // ... other config options
      images: {
        unoptimized: true, // Required for static export if using next/image
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'picsum.photos',
            port: '',
            pathname: '/**',
          },
          // Add other domains if needed, e.g., Google profile pictures
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
    *Note: If using dynamic features like Server Components or Server Actions extensively, you might need Firebase Functions (Cloud Functions for Firebase) integration, which involves a different setup (`firebase init functions` and adjusting the `firebase.json` rewrite rules).*

### Build the Application

```bash
npm run build
# or
yarn build
# or
pnpm build
```

This command will generate the static site in the `out` directory.

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

After deployment, the Firebase CLI will provide the URL for your live application.

### Continuous Deployment (CI/CD) - Example with GitHub Actions

1.  **Create a GitHub Actions workflow file:**
    *   Create `.github/workflows/firebase-deploy.yml` in your project.

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

          # Create .env.local from GitHub Secrets
          - name: Create .env.local
            run: |
              echo "NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_APP_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}" >> .env.local
              echo "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}" >> .env.local

          - name: Build project
            run: npm run build # or yarn build / pnpm build

          - name: Deploy to Firebase Hosting
            uses: FirebaseExtended/action-hosting-deploy@v0
            with:
              repoToken: '${{ secrets.GITHUB_TOKEN }}'
              firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_ACTIVITY_HUB }}' # Service account JSON
              channelId: live
              projectId: your-firebase-project-id # Replace with your Firebase project ID
    ```

3.  **Add Secrets to GitHub Repository:**
    *   Go to your GitHub repository -> Settings -> Secrets and variables -> Actions.
    *   Add secrets for all your `NEXT_PUBLIC_FIREBASE_` variables from your `.env.local` file.
    *   Add a secret named `FIREBASE_SERVICE_ACCOUNT_ACTIVITY_HUB`:
        *   Go to your Firebase Project Settings -> Service accounts.
        *   Generate a new private key (JSON file).
        *   Copy the entire contents of the downloaded JSON file and paste it as the value for the `FIREBASE_SERVICE_ACCOUNT_ACTIVITY_HUB` secret.
    *   Replace `your-firebase-project-id` in the workflow file with your actual Firebase project ID.

Now, every time you push/merge to the `main` branch, GitHub Actions will automatically build and deploy your application to Firebase Hosting.
```