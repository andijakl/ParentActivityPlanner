// src/app/(auth)/signup/page.tsx
import { SignUpForm } from '@/components/auth/SignUpForm';
import AuthProviderComponent from '@/components/auth/AuthProviderComponent'; // Ensure this path is correct
import { Suspense } from 'react'; // Needed for useSearchParams in child component

// Helper component to ensure SignUpForm is rendered within Suspense boundary
function SignUpPageContent() {
    return <SignUpForm />;
}


export default function SignUpPage() {
  return (
     <AuthProviderComponent>
        {/* Suspense is required because SignUpForm uses useSearchParams */}
        <Suspense fallback={<div>Loading...</div>}>
           <SignUpPageContent />
        </Suspense>
     </AuthProviderComponent>
  );
}
