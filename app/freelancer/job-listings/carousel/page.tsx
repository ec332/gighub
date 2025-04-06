'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
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

export default function JobCarousel() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freelancerId, setFreelancerId] = useState<number | null>(null);

  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [acceptedJob, setAcceptedJob] = useState<Job | null>(null);
  const [modalSuccess, setModalSuccess] = useState(true);

  useEffect(() => {
    if (!email) return;

    async function fetchFreelancerId() {
      try {
        const res = await fetch(
          `https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`
        );
        if (!res.ok) throw new Error("Failed to fetch freelancer ID");
        const data = await res.json();
        if (data.Result.Success) {
          setFreelancerId(data.Freelancer.Id);
        }
      } catch (err) {
        console.error("Error fetching freelancer ID", err);
      }
    }

    fetchFreelancerId();
  }, [email]);

  useEffect(() => {
    if (!email) return;

    async function fetchJobs() {
      try {
        const res = await fetch('http://localhost:5001/matchjob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ freelancer_email: email }),
        });

        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
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
      if (!jobs.length || !email || !freelancerId) return;

      const job = jobs[currentIndex];

      if (e.key === 'ArrowLeft') {
        setShowRejectPopup(true);
        setTimeout(() => setShowRejectPopup(false), 1500);
        goNext();
      }

      if (e.key === 'ArrowRight' && job.status !== 'close') {
        await handleAcceptJob(job);
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jobs, currentIndex, email, freelancerId]);

  const goNext = () => {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= jobs.length) nextIndex = 0;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          employer_id: job.employer_id,
          freelancer_id: freelancerId,
        }),
      });

      if (!res.ok) throw new Error();

      await res.json();
      setAcceptedJob(job);
      setModalSuccess(true);
      setShowModal(true);

      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === job.id ? { ...j, status: 'close' } : j))
      );
    } catch (err) {
      setAcceptedJob(null);
      setModalSuccess(false);
      setShowModal(true);
    }
  };

  if (loading) return <div className="p-8">Loading jobs...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!jobs.length || jobs.every((job) => job.status === 'close')) {
    return <div className="p-8 text-gray-500">No more jobs to display.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-4 px-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Job Listings</h1>

      {showRejectPopup && (
        <div className="absolute top-10 z-50 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg animate-fadeOut">
          Rejected!
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
            <div key={job.id} className="p-6 bg-white rounded-lg shadow text-center">
              <h3 className="text-xl font-semibold text-[#1860f1] mb-2">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.description}</p>
              <p className="text-sm text-gray-600">Category: {job.category}</p>
              <p className="text-sm text-gray-600">Skills: {job.skills.join(', ')}</p>
              <p className="text-sm text-gray-600">Price: ${job.price}</p>
              <span className="inline-block px-2 py-1 mt-2 text-xs rounded bg-green-100 text-green-700">
                HIRING
              </span>
              <div className="mt-4 text-sm text-gray-400">
                Press ← to Reject | → to Accept
              </div>
            </div>
          ))}
        </Carousel>
      </div>

      <Link href="/freelancer/job-listings">
        <button className="mt-10 px-6 py-2 bg-[#1860F1] text-white rounded hover:bg-[#BBEF5D] hover:text-[#1860F1] transition">
          Back to Job Listings Overview
        </button>
      </Link>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full text-center">
            <h2 className={`text-2xl font-bold mb-4 ${modalSuccess ? 'text-green-600' : 'text-red-600'}`}>
              {modalSuccess ? 'Job Accepted!' : 'Failed to accept job.'}
            </h2>

            {modalSuccess && acceptedJob ? (
              <div className="text-left space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold">Title:</span> {acceptedJob.title}</p>
                <p><span className="font-semibold">Category:</span> {acceptedJob.category}</p>
                <p><span className="font-semibold">Description:</span> {acceptedJob.description}</p>
                <p><span className="font-semibold">Skills:</span> {acceptedJob.skills.join(', ')}</p>
                <p><span className="font-semibold">Price:</span> ${acceptedJob.price}</p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Please try again!</p>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 bg-[#1860F1] text-white px-6 py-2 rounded hover:bg-[#BBEF5D] hover:text-[#1860F1] transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
