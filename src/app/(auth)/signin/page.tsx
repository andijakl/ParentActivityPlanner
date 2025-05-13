// src/app/(auth)/signin/page.tsx
import { SignInForm } from '@/components/auth/SignInForm';
import { Suspense } from 'react'; // Needed for useSearchParams in child component

// Helper component to ensure SignInForm is rendered within Suspense boundary
function SignInPageContent() {
    return <SignInForm />;
}

export default function SignInPage() {
  return (
     // AuthProviderComponent is now in (auth)/layout.tsx
     <Suspense fallback={<div>Loading...</div>}>
         <SignInPageContent />
     </Suspense>
  );
}
