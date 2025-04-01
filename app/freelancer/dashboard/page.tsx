'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

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

  useEffect(() => {
    if (!email) return;

    const fetchDashboardData = async () => {
      try {
        const [jobsRes, walletRes, profileRes] = await Promise.all([
          fetch(`/api/jobs?email=${email}`),
          fetch(`/api/wallet?email=${email}`),
          fetch(`https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`),
        ]);
    
        const jobsData = await jobsRes.json();
        const walletData = await walletRes.json();
        const profileData = await profileRes.json();
    
        console.log('Profile Data:', profileData); // Clearly log response
    
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
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#1860f1' }}>
        Freelancer Dashboard
      </h1>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          {/* Profile Info */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold" style={{ color: '#1860f1' }}>
              Welcome, {profile?.Name || email}
            </h2>
            <p className="text-gray-600">Gender: {profile?.Gender || 'N/A'}</p>
            <p className="text-gray-600">Skills: {profile?.Skills || 'N/A'}</p>
          </div>

          {/* Wallet */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#1860f1' }}>
              Wallet
            </h2>
            <p className="text-lg font-medium text-gray-700">
                Balance: <span style={{ color: '#7db32e' }}>${walletBalance?.toFixed(2)}</span>
            </p>


          </div>

          {/* Jobs */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#1860f1' }}>
              Your Submitted Jobs
            </h2>
            {jobs.length === 0 ? (
              <p className="text-gray-500">No jobs submitted yet.</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex justify-between items-center border p-3 rounded"
                  >
                    <span>{job.title}</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : job.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notifications (placeholder) */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#1860f1' }}>
              Notifications
            </h2>
            <p className="text-gray-500">No new notifications.</p>
          </div>
        </>
      )}
    </div>
  );
}
