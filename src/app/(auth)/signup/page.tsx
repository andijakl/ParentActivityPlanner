// src/app/(auth)/signup/page.tsx
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Suspense } from 'react'; // Needed for useSearchParams in child component

// Helper component to ensure SignUpForm is rendered within Suspense boundary
function SignUpPageContent() {
    return <SignUpForm />;
}


export default function SignUpPage() {
  return (
     // AuthProviderComponent is now in (auth)/layout.tsx
     <Suspense fallback={<div>Loading...</div>}>
        <SignInPageContent />
     </Suspense>
  );
}
