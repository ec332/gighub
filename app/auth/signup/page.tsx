'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/public/gighub.png';

export default function SignUp() {
  const router = useRouter();
  const [userType, setUserType] = useState('freelancer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, userType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      const result = await signIn('credentials', {
        email,
        password,
        userType,
        redirect: false,
      });

      if (result?.error) {
        setError('Sign up failed');
        return;
      }

      router.push(userType === 'employer' ? '/employer/create-profile' : '/freelancer/create-profile');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-xl border border-gray-200">
      <div className="flex items-center justify-between mb-2 w-full">
        <Image
          src={logo}
          alt="GigHub Logo"
          width={120}
          height={120}
          className="rounded-md"
        />
        <span className="text-[#A3D743] font-bold italic text-sm tracking-wide">Just Swipe Right!</span>
      </div>
        <h2 className="text-center text-3xl font-extrabold text-[#1860F1]">
          Create your Account
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">I am a</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:ring-[#1860F1] focus:border-[#1860F1]"
              >
                <option value="freelancer">Freelancer</option>
                <option value="employer">Employer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm  px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 rounded-md shadow-md text-sm font-semibold text-white bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200"
          >
            Sign Up
          </button>

          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-[#1860F1] hover:text-[#BBEF5D] font-medium">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
