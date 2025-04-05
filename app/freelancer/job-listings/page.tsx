'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import doveIcon from '@/public/dove.png';

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
  const [freelancerId, setFreelancerId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [acceptedJob, setAcceptedJob] = useState<Job | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Fetch freelancer ID
  useEffect(() => {
    if (!email) return;

    async function fetchFreelancerId() {
      try {
        const res = await fetch(
          `https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`
        );
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.Result.Success) {
          setFreelancerId(data.Freelancer.Id); // Store the freelancer ID
        } else {
          throw new Error(data.Result.ErrorMessage || 'Failed to fetch freelancer ID');
        }
      } catch (err: any) {
        console.error('Error fetching freelancer ID:', err.message);
        setError(err.message);
      }
    }

    fetchFreelancerId();
  }, [email]);

  // Fetch jobs
  useEffect(() => {
    if (!email || !freelancerId) return;

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
  }, [email, freelancerId]);

  // Handle accepting a job
  const handleAcceptJob = async (job: Job) => {
    try {
      const res = await fetch('http://localhost:5002/acceptjob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: job.id,
          freelancer_id: freelancerId,
          employer_id: job.employer_id,
        }),
      });

      if (!res.ok) throw new Error(`Failed to accept job: ${res.statusText}`);
      const responseData = await res.json();

      setAcceptedJob(job);
      setShowModal(true);

      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === job.id ? { ...j, status: 'close' } : j))
      );
    } catch (err: any) {
      console.error('Error accepting job:', err.message);
      setModalMessage('Failed to accept job. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 flex-col space-y-4">
        <motion.div
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        >
          <Image
            src={doveIcon}
            alt="Loading Dove"
            width={64}
            height={64}
            className="drop-shadow-md"
          />
        </motion.div>
        <p className="text-lg font-semibold text-[#1860f1] animate-pulse">Loading...</p>
      </div>
    );
  }
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
                <span
                  className={`inline-block px-2 py-1 text-xs rounded ${
                    job.status === 'hiring'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
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
                  {job.status === 'Close' ? 'Closed' : 'Accept Job'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for accepted job */}
      {showModal && acceptedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Job Accepted!</h2>
            <div className="text-left space-y-2 text-sm text-gray-700">
              <p><span className="font-semibold">Title:</span> {acceptedJob.title}</p>
              <p><span className="font-semibold">Price:</span> ${acceptedJob.price}</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 bg-[#1860F1] text-white px-6 py-2 rounded hover:bg-[#BBEF5D] hover:text-[#1860F1] transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {modalMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Failure to accept job.</h2>
            <p className="text-gray-700">Please try again!</p>
            <button
              onClick={() => setModalMessage(null)}
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