'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Left: Logo */}
          <div className="flex items-center space-x-6">
            <Link 
              href={session?.user?.userType === 'employer' 
                ? '/employer/dashboard' 
                : '/freelancer/job-listings'} 
              className="text-lg font-semibold text-[#1860F1] hover:text-[#BBEF5D]"
            >
              GigHub
            </Link>
          </div>

          {/* Right: Menu */}
          <div className="flex items-center gap-4">

            {session ? (
              <>
                {/* Employer Links */}
                {session.user?.userType === 'employer' && (
                  <>
                    <Link href="/employer/dashboard" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      Dashboard
                    </Link>
                  </>
                )}

                {/* Freelancer Links */}
                {session.user?.userType === 'freelancer' && (
                  <>
                    <Link href="/freelancer/dashboard" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      Dashboard
                    </Link>
                    <Link href="/freelancer/job-listings" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      Job Listings
                    </Link>
                  </>
                )}

                {/* Sign Out */}
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
