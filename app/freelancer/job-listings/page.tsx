
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Job {
  id: string;
  title: string;
  description: string;
  payRate: number;
  status: string;
  skill: string;
}

export default function JobListings() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('http://localhost:5100/job');
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  if (loading) return <div className="p-8">Loading jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load jobs: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Job Listings</h1>

      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-xl font-bold">Browse Available Jobs</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {jobs.length === 0 ? (
          <p className="text-gray-500 col-span-full">No jobs available at the moment.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow space-y-2">
              <h3 className="text-xl font-semibold text-[#1860f1]">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.description}</p>
              <p className="text-sm text-gray-600">Skills Needed: {job.skill}</p>
              <p className="text-sm text-gray-600">Pay Rate: ${job.payRate.toFixed(2)}/hr</p>
              <span className={`inline-block px-2 py-1 text-xs rounded ${
                job.status.toLowerCase() === 'open'
                  ? 'bg-green-100 text-green-700'
                  : job.status.toLowerCase() === 'closed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {job.status}
              </span>
              <button className="text-sm underline text-[#1860F1] hover:text-[#BBEF5D] block mt-2">Apply</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

