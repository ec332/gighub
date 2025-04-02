'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import doveIcon from '@/public/dove.png';

interface Job {
  id: string;
  title: string;
  status: string;
}

interface Profile {
  Name: string;
  Gender: string;
  Skills: string;
}

export default function FreelancerDashboard() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!email) return;

    const fetchDashboardData = async () => {
      try {
        const jobsRes = await fetch(`/api/jobs?email=${email}`);
        const walletRes = await fetch(`/api/wallet?email=${email}`);
        const profileRes = await fetch(
          `https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`
        );

        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const walletData = walletRes.ok ? await walletRes.json() : { balance: 0 };
        const profileData = await profileRes.json();

        setJobs(jobsData || []);
        setWalletBalance(walletData.balance || 0);
        setProfile(profileData.Freelancer || null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [email]);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Header with Dove Animation */}
      <div className="flex items-center space-x-3 mb-4">
        <motion.div
          initial={!hasAnimated ? { x: -100, opacity: 0 } : false}
          animate={!hasAnimated ? { x: 0, opacity: 1 } : {}}
          transition={!hasAnimated ? { duration: 1.2, ease: 'easeOut' } : {}}
          onAnimationComplete={() => setHasAnimated(true)}
          whileHover={{
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1],
            transition: { duration: 1 },
          }}
          className="relative"
        >
          <Image
            src={doveIcon}
            alt="Dove Icon"
            width={36}
            height={36}
            className="drop-shadow-md"
          />
          <div className="absolute w-4 h-4 bg-blue-300 rounded-full blur-sm -z-10 top-1 left-1 animate-ping" />
        </motion.div>
        <h1 className="text-3xl font-bold text-[#1860f1]">Freelancer Dashboard</h1>
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          {/* Welcome + Edit */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">
              Welcome, {profile?.Name ? `${profile.Name}!` : email}
            </h2>
            <button
              className="px-4 py-2 rounded text-white font-medium transition"
              style={{ backgroundColor: '#1860f1' }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#bcef5d';
                e.currentTarget.style.color = '#000';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1860f1';
                e.currentTarget.style.color = '#fff';
              }}
            >
              Edit
            </button>
          </div>

          {/* Profile Info */}
          <div className="mb-6 bg-white p-6 rounded-xl shadow">
            <p className="text-gray-600 text-base mb-4">Gender: {profile?.Gender || 'N/A'}</p>
            <p className="text-gray-600 text-base">
              Skills: {profile?.Skills?.split(',').join(', ') || 'N/A'}
            </p>
          </div>

          {/* Wallet Section */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-black">Wallet</h2>
            <button
              className="px-4 py-2 rounded text-white font-medium transition"
              style={{ backgroundColor: '#1860f1' }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#bcef5d';
                e.currentTarget.style.color = '#000';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1860f1';
                e.currentTarget.style.color = '#fff';
              }}
            >
              Withdraw
            </button>
          </div>

          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-base">
              Balance: ${walletBalance?.toFixed(2) || '0.00'}
            </p>
          </div>

          {/* Submitted Jobs */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Your Submitted Jobs</h2>
            {jobs.length === 0 ? (
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-500 text-base">No jobs submitted yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
                  >
                    <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                    <p className="text-gray-600 mt-1 capitalize mb-2">Status: {job.status}</p>
                    <button
                      className="text-sm font-medium text-blue-600 hover:text-green-600"
                      onClick={() => console.log(`Viewing job ID: ${job.id}`)}
                    >
                      View Listing
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <h2 className="text-xl font-semibold mb-2 text-black">Notifications</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-base">No new notifications.</p>
          </div>
        </>
      )}
    </div>
  );
}













