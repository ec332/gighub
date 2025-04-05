'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  skills: string[];
  price: number;
  status: string;
  employer_id: string;
}

export default function JobListings() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;

    async function fetchJobs() {
      try {
        const res = await fetch('http://localhost:5001/matchjob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ freelancer_email: email }),
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
        setJobs((data.jobs || []).filter((job: Job) => job.status === 'hiring'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [email]);

  const handleAcceptJob = async (job: Job) => {
    try {
      const res = await fetch('http://localhost:5006/acceptjob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employer_id: job.employer_id,
          job_id: job.id,
          pay: job.price,
          freelancer_email: email,
        }),
      });

      if (!res.ok) throw new Error(`Failed to accept job: ${res.statusText}`);
      const responseData = await res.json();

      alert(responseData.message);

      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === job.id ? { ...j, status: 'close' } : j
        )
      );
    } catch (err: any) {
      console.error('Error accepting job:', err.message);
      alert('Failed to accept job. Please try again.');
    }
  };

  if (loading) return <div className="p-8">Loading matched jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Matched Job Listings</h1>
      <Link href="/freelancer/job-listings/carousel">
      <button className="mt-4 px-4 py-2 bg-[#1860F1] text-white hover:bg-[#BBEF5D] hover:text-[#1860F1] rounded transition">
        Swipe for Job!
      </button>
      </Link>

      {jobs.length === 0 ? (
        <p className="mt-4 text-gray-500">No matched jobs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-lg transition-shadow space-y-2"
            >
              <h3 className="text-xl font-semibold text-[#1860f1]">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.description}</p>
              <p className="text-sm text-gray-600">Category: {job.category}</p>
              <p className="text-sm text-gray-600">Skills: {job.skills?.join(', ')}</p>
              <p className="text-sm text-gray-600">Price: ${job.price}</p>
              <div className="flex items-center justify-between">
                <span className="inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                  {job.status}
                </span>
                <button
                  onClick={() => handleAcceptJob(job)}
                  disabled={job.status === 'close'}
                  className={`px-2 py-1 text-xs rounded transition ${
                    job.status === 'close'
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-[#1860F1] text-white hover:bg-[#BBEF5D] hover:text-[#1860F1]'
                  }`}
                >
                  {job.status === 'close' ? 'Job Accepted' : 'Accept Job'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
