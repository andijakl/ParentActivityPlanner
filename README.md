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

This project uses dynamic routes (e.g., `/activities/[id]`) and therefore **cannot** be deployed using Next.js static export (`output: 'export'`). You need a hosting provider that supports Next.js Server-Side Rendering (SSR) or Incremental Static Regeneration (ISR).

**Recommended Deployment Options:**

*   **Vercel (Recommended for Next.js):** Vercel is the platform built by the creators of Next.js and offers seamless deployment. Connect your Git repository, and Vercel will handle the build and deployment automatically.
*   **Netlify:** Netlify also provides excellent support for Next.js applications, including SSR and ISR features.
*   **Firebase Hosting + Cloud Functions (SSR):** You can deploy the Next.js application as a Node.js server within a Firebase Cloud Function and use Firebase Hosting to serve the function. This requires more setup than Vercel or Netlify.
*   **Other Node.js Hosting:** Platforms like Google Cloud Run, AWS Lambda, Heroku, or DigitalOcean can host the Next.js Node.js server.

**Example Setup: Firebase Hosting + Cloud Functions (SSR)**

This is a more involved setup compared to Vercel/Netlify.

1.  **Ensure `output: 'export'` is NOT in `next.config.ts`:** The `next.config.ts` should *not* contain the `output: 'export'` line.

2.  **Initialize Firebase Functions:**
    ```bash
    firebase init functions
    ```
    *   Choose TypeScript.
    *   Install dependencies with npm when prompted.
    *   Structure your functions code to serve the Next.js app (refer to Firebase documentation for deploying Next.js apps). You might need a `functions/src/index.ts` that imports and runs your Next.js server.

3.  **Initialize Firebase Hosting (if not already done):**
    ```bash
    firebase init hosting
    ```
    *   Select "Use an existing project".
    *   Point to a public directory (e.g., `public`). Static assets handled by Next.js itself can go here, but the main serving happens via the function.
    *   Configure as a single-page app: No.

4.  **Modify `firebase.json` for SSR Rewrite:**
    Update your `firebase.json` to rewrite all requests to your Cloud Function:
    ```json
    {
      "hosting": {
        "public": "public", // Or your chosen static assets folder
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
      "functions": [
        {
          "source": "functions", // Or your functions directory
          "codebase": "default",
          "runtime": "nodejs18" // Or your preferred runtime
          // Add necessary configurations for memory, region, etc.
        }
      ]
    }
    ```

5.  **Build and Deploy:**
    ```bash
    npm run build
    firebase deploy --only hosting,functions
    ```

**Continuous Deployment (CI/CD) - Example with GitHub Actions for Vercel/Netlify:**

Most modern platforms integrate directly with Git providers.

1.  **Push your code** to a GitHub/GitLab/Bitbucket repository.
2.  **Connect your repository** to Vercel or Netlify via their dashboards.
3.  **Configure build settings** (usually detected automatically for Next.js).
4.  **Set Environment Variables** (like your `NEXT_PUBLIC_FIREBASE_*` keys) in the Vercel/Netlify project settings.
5.  **Deployments will trigger automatically** on pushes to your main branch (or configured branches).

Choose the deployment option that best suits your needs and technical comfort level. Vercel or Netlify are generally the easiest for Next.js applications.
```