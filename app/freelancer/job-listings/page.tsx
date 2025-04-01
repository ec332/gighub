'use client';

import { useEffect, useState } from 'react';

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  skills: string[];
  price: number;
  status: string;
}

export default function JobListings() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('http://localhost:6100/matchjob');
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
        setJobs(data.jobs || []); // match your API response
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  if (loading) return <div className="p-8">Loading matched jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Matched Job Listings</h1>

      {jobs.length === 0 ? (
        <p className="mt-4 text-gray-500">No matched jobs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow space-y-2">
              <h3 className="text-xl font-semibold text-[#1860f1]">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.description}</p>
              <p className="text-sm text-gray-600">Category: {job.category}</p>
              <p className="text-sm text-gray-600">Skills: {job.skills?.join(', ')}</p>
              <p className="text-sm text-gray-600">Price: ${job.price}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
