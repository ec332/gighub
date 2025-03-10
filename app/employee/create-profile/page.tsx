'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProfileForm from '@/app/components/ProfileForm';

export default function CreateEmployeeProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.userType !== 'employee') {
      router.push('/employer/dashboard');
    }
  }, [session, status, router]);

  const handleSubmit = async (data: any) => {
    // Here you would typically make an API call to save the profile
    console.log('Employee Profile Data:', data);
    // For demo purposes, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Employee Profile</h1>
          <p className="mt-2 text-gray-600">
            Complete your profile to start finding job opportunities.
          </p>
        </div>
        <ProfileForm userType="employee" onSubmit={handleSubmit} />
      </div>
    </div>
  );
} 