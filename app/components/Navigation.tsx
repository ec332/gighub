'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="bg-[#1860f1] shadow-lg font-sans">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Name on the left */}
          <Link href="/">
            <span className="font-extrabold text-base text-white tracking-wide">GigHub</span>
          </Link>

          {/* Navigation Links on the right */}
          <div className="flex items-center gap-6">
            {session ? (
              <>
                <Link
                  href={session.user?.userType === 'employer' ? '/employer/dashboard' : '/freelancer/dashboard'}
                  className="text-base font-medium text-white hover:text-[#bcef5d] transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/freelancer/job-listings"
                  className="text-base font-medium text-white hover:text-[#bcef5d] transition"
                >
                  Listings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="text-base font-medium text-white hover:text-[#bcef5d] transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="text-base font-medium text-white hover:text-[#bcef5d] transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

