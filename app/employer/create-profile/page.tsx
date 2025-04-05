'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import logo from '@/public/gighub.png';

export default function CreateEmployerProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const email = session?.user?.email;

  useEffect(() => {
    if (status === 'loading') return; // Wait until authentication status is known
  
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  
    if (session?.user?.userType !== 'employer') {
      router.push('/');
    }
  }, [session, status]);

    const [formData, setFormData] = useState({
      Name: '',
      Email: '',
      Company: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
    
      try {
        // Step 1: Create wallet
        const walletRes = await fetch('http://localhost:5300/wallet/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'Employer',
          }),
        });
        
    
        if (!walletRes.ok) throw new Error('Failed to create wallet');
        const walletData = await walletRes.json();
        const walletId = walletData.walletId
    
        // Step 2: Create employer with walletId
        const res = await fetch('http://localhost:5400/api/employer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.Name,
            email: email,
            company: formData.Company,
            wallet: walletId,
          }),
        });
    
        if (res.ok) {
          router.push('/employer/dashboard');
        } else {
          alert('Failed to create employer profile. Please try again.');
        }
    
      } catch (err) {
        console.error(err);
        alert('Something went wrong. Please try again.');
      }
    };
    

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

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
          Create Your Employer Profile
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
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                name="Company"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 focus:ring-[#1860F1] focus:border-[#1860F1]"
                value={formData.Company}
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