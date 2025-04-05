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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [showAcceptPopup, setShowAcceptPopup] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!jobs.length) return;

      if (e.key === 'ArrowLeft') {
        console.log(`❌ Rejected job: ${jobs[currentIndex].id}`);
        setShowRejectPopup(true);
        setTimeout(() => setShowRejectPopup(false), 1500);
        goNext();
      }

      if (e.key === 'ArrowRight') {
        console.log(`✅ Accepted job: ${jobs[currentIndex].id}`);
        setShowAcceptPopup(true);
        setTimeout(() => setShowAcceptPopup(false), 1500);
        acceptJob(jobs[currentIndex]);
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jobs, currentIndex]);

  const goNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, jobs.length - 1));
  };

  const acceptJob = async (job: Job) => {
    try {
      const res = await fetch('http://localhost:5001/acceptjob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancer_email: email,
          job_id: job.id,
        }),
      });

      if (!res.ok) throw new Error(`Failed to accept job: ${res.status}`);
      console.log(`Successfully accepted job: ${job.title}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!jobs.length || currentIndex >= jobs.length) {
    return <div className="p-8 text-gray-500">No more jobs to display.</div>;
  }

  return (
    <div className="relative min-h-screen bg-gray-100 flex flex-col items-center justify-center py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Job Listings Carousel</h1>

      {showRejectPopup && (
        <div className="absolute top-10 z-50 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg animate-fadeOut">
          ❌ Rejected!
        </div>
      )}

      {showAcceptPopup && (
        <div className="absolute top-10 z-50 px-6 py-3 bg-green-500 text-white rounded-full shadow-lg animate-fadeOut">
          ✅ Accepted!
        </div>
      )}

      <div className="w-full max-w-2xl flex justify-center items-center">
        <Carousel
          selectedItem={currentIndex}
          showThumbs={false}
          showStatus={false}
          showArrows={false}
          showIndicators={false}
          infiniteLoop={false}
          swipeable={false}
          emulateTouch={false}
          className="w-full"
        >
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-6 bg-white rounded-lg shadow text-center"
            >
              <h3 className="text-xl font-semibold text-[#1860f1] mb-2">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.description}</p>
              <p className="text-sm text-gray-600">Category: {job.category}</p>
              <p className="text-sm text-gray-600">Skills: {job.skills.join(', ')}</p>
              <p className="text-sm text-gray-600">Price: ${job.price}</p>
              <span
                className={`inline-block px-2 py-1 mt-2 text-xs rounded ${
                  job.status === 'hiring'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {job.status}
              </span>
              <div className="mt-4 text-sm text-gray-400">
                Press ← to Reject | → to Accept
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  );
}
