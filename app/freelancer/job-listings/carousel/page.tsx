'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

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

export default function JobCarousel() {
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
        setJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [email]);

  if (loading) return <div className="p-8">Loading carousel...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-10">
      <h1 className="text-3xl font-bold mb-6">Job Listings Carousel</h1>
      <Carousel showThumbs={false} infiniteLoop useKeyboardArrows autoPlay>
        {jobs.map((job) => (
          <div key={job.id} className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-[#1860f1]">{job.title}</h3>
            <p className="text-sm text-gray-600">{job.description}</p>
            <p className="text-sm text-gray-600">Category: {job.category}</p>
            <p className="text-sm text-gray-600">Skills: {job.skills.join(', ')}</p>
            <p className="text-sm text-gray-600">Price: ${job.price}</p>
            <span
              className={`inline-block px-2 py-1 text-xs rounded ${
                job.status === 'hiring'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {job.status}
            </span>
          </div>
        ))}
      </Carousel>
    </div>
  );
}
