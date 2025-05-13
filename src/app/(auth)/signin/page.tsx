// src/app/(auth)/signin/page.tsx
import { SignInForm } from '@/components/auth/SignInForm';
import AuthProviderComponent from '@/components/auth/AuthProviderComponent'; // Ensure this path is correct
import { Suspense } from 'react'; // Needed for useSearchParams in child component

// Helper component to ensure SignInForm is rendered within Suspense boundary
function SignInPageContent() {
    return <SignInForm />;
}

export default function SignInPage() {
  return (
     <AuthProviderComponent> {/* Wrap the specific page content */}
        {/* Suspense is required because SignInForm uses useSearchParams */}
        <Suspense fallback={<div>Loading...</div>}>
            <SignInPageContent />
        </Suspense>
     </AuthProviderComponent>
  );
}
