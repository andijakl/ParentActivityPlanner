// src/app/(auth)/signin/page.tsx
import { SignInForm } from '@/components/auth/SignInForm';
import AuthProviderComponent from '@/components/auth/AuthProviderComponent'; // Import the client component

export default function SignInPage() {
  return (
     <AuthProviderComponent> {/* Wrap the specific page content */}
        <SignInForm />
     </AuthProviderComponent>
  );
}
