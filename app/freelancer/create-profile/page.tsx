'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import logo from '@/public/gighub.png';

export default function CreateFreelancerProfile() {
  const router = useRouter();
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [formData, setFormData] = useState({
    Name: '',
    Gender: '',
    Skills: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert('Session email not loaded yet. Try again.');
      return;
    }

    // Step 1: Create wallet with role "Freelancer"
    const walletRes = await fetch('http://localhost:5300/wallet/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'Freelancer',
      }),
    });

    if (!walletRes.ok) throw new Error('Failed to create wallet');
    const walletData = await walletRes.json();
    const walletId = walletData.walletId; 

    console.log('Submitting form data to OutSystems:');
    console.log({ ...formData, Email: email });

    // Step 2: Create freelancer using the walletId
    const res = await fetch('https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Name: formData.Name,
        Email: email,
        Gender: formData.Gender,
        Skills: formData.Skills,
        WalletId: walletId, 
      }),
    });

    if (res.ok) {
      console.log('Profile creation successful!');
      router.push('/freelancer/dashboard');
    } else {
      console.error('Failed to POST to OutSystems');
      alert('Failed to create profile. Please try again.');
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

        <h1 className="text-center text-3xl font-extrabold text-[#1860F1]">
          Create Your Freelancer Profile
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="Name"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
                value={formData.Name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                name="Gender"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
                value={formData.Gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
              <input
                type="text"
                name="Skills"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
                value={formData.Skills}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 rounded-md shadow-md text-sm font-semibold text-white bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200"
          >
            Create Profile
          </button>
        </form>
      </div>
    </div>
  );
}





