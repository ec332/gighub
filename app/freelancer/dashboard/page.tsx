'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Job {
  id: string;
  title: string;
  status: string;
}

export default function FreelancerDashboard() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchDashboardData = async () => {
      try {
        const jobsRes = await fetch(`/api/jobs?email=${email}`);
        const walletRes = await fetch(`/api/wallet?email=${email}`);

        const jobsData = await jobsRes.json();
        const walletData = await walletRes.json();

        setJobs(jobsData || []);
        setWalletBalance(walletData.balance || 0);
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
      <h1 className="text-3xl font-bold mb-6">Freelancer Dashboard</h1>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          {/* Profile Info */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Welcome, {email}</h2>
            <p className="text-gray-600">You are logged in as a freelancer.</p>
          </div>

          {/* Wallet */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Wallet</h2>
            <p className="text-green-600 text-lg font-medium">
              Balance: ${walletBalance?.toFixed(2)}
            </p>
          </div>

          {/* Jobs */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Your Submitted Jobs</h2>
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
            <h2 className="text-xl font-semibold mb-2">Notifications</h2>
            <p className="text-gray-500">No new notifications.</p>
          </div>
        </>
      )}
    </div>
  );
}
