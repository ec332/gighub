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
  
        // ✅ Filter only hiring jobs
        const hiringJobs = (data.jobs || []).filter((job: Job) => job.status === 'hiring');
        setJobs(hiringJobs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  
    fetchJobs();
  }, [email]);
  

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!jobs.length || !email) return;

      const job = jobs[currentIndex];

      if (e.key === 'ArrowLeft') {
        console.log(`❌ Rejected job: ${job.id}`);
        setShowRejectPopup(true);
        setTimeout(() => setShowRejectPopup(false), 1500);
        goNext();
      }

      if (e.key === 'ArrowRight' && job.status !== 'close') {
        console.log(`✅ Accepting job: ${job.id}`);
        setShowAcceptPopup(true);
        setTimeout(() => setShowAcceptPopup(false), 1500);
        await handleAcceptJob(job);
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jobs, currentIndex, email]);

  const goNext = () => {
    let nextIndex = currentIndex + 1;

    if (nextIndex >= jobs.length) {
      nextIndex = 0;
    }

    let attempts = 0;
    while (jobs[nextIndex]?.status === 'close' && attempts < jobs.length) {
      nextIndex = (nextIndex + 1) % jobs.length;
      attempts++;
    }

    setCurrentIndex(nextIndex);
  };

  const handleAcceptJob = async (job: Job) => {
    try {
      const res = await fetch('http://localhost:5002/acceptjob', {
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

      if (!res.ok) {
        throw new Error(`Failed to accept job: ${res.statusText}`);
      }

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

  if (loading) return <div className="p-8">Loading jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!jobs.length || jobs.every((job) => job.status === 'close')) {
    return <div className="p-8 text-gray-500">No more jobs to display.</div>;
  }

  const job = jobs[currentIndex];

  return (
    <div className="relative min-h-screen bg-gray-100 flex flex-col items-center justify-center py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Job Listings</h1>

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
          transitionTime={400}
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
