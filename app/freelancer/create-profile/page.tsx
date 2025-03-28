'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const router = useRouter();
  const [userType, setUserType] = useState('freelancer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const checkFreelancerProfile = async (email: string) => {
    const res = await fetch(`https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}`);
    return res.ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await signIn('credentials', {
      email,
      password,
      userType,
      redirect: false,
    });

    if (result?.error) {
      setError('Login failed. Please check your credentials.');
    } else {
      // Custom redirect logic after login
      if (userType === 'freelancer') {
        const exists = await checkFreelancerProfile(email);
        router.push(exists ? '/freelancer/dashboard' : '/freelancer/create-profile');
      } else {
        router.push('/employer/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">Sign in to your account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">User Type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="freelancer">Freelancer</option>
                <option value="employer">Employer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-semibold text-white bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200"
          >
            Sign in
          </button>

          <p className="text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-[#1860F1] hover:text-[#BBEF5D] font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}


