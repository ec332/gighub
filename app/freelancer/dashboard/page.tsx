'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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
  freelancer_id: number;
  employer_id: number;
}

interface Profile {
  Id: number;
  Name: string;
  Email: string;
  Gender: string;
  Skills: string;
  WalletId?: number;
}

export default function FreelancerDashboard() {
  const { data: session } = useSession();
  const email = session?.user?.email;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [showNotifications, setShowNotifications] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!email) return;

    const fetchDashboardData = async () => {
      try {
        const profileRes = await fetch(`https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`);
        const profileData = await profileRes.json();
        const freelancer = profileData.Freelancer;
        const wallet_id = freelancer.WalletId;

        setProfile(freelancer);
        setEditedProfile(freelancer);

        const [jobsRes, walletRes] = await Promise.all([
          fetch(`http://localhost:5100/job/freelancer/${freelancer.Id}`),
          fetch(`http://localhost:5300/wallet/${wallet_id}`)
        ]);

        const jobsData = await jobsRes.json();
        const walletData = walletRes.ok ? await walletRes.json() : { balance: 0 };

        setJobs(jobsData.jobs || []);
        setWalletBalance(walletData.balance || 0);
      } catch (err) {
        console.error('Failed to refresh dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [email]);

  const handleEditClick = () => setIsEditing(true);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedProfile((prev) => ({ ...prev!, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    try {
      const response = await fetch('https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProfile),
      });

      if (response.ok) {
        setProfile(editedProfile);
        setIsEditing(false);
      } else {
        console.error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  useEffect(() => {
    if (!profile?.Id) return;
  
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:5800/consume_notifications/freelancer/${profile.Id}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        console.log(data);
        const parsedNotifications = (data.notifications || []).map(n => {
          try {
            return typeof n === 'string' ? JSON.parse(n) : n;
          } catch (err) {
            console.error('Failed to parse notification:', n, err);
            return null;
          }
        }).filter(n => n !== null);
        
        setNotifications(parsedNotifications);
      } catch (error) {
        console.error(error);
      }
    };
  
    fetchNotifications();
  }, [profile?.Id]);

const handleAcknowledge = () => {
setShowNotifications(false);
};

  const handleCompleteJob = async (job: Job) => {
    try {
      if (!job.description || !job.category || !job.price) {
        alert("Cannot complete job. Missing description, category, or price.");
        return;
      }

      const payload = {
        ID: job.id,
        EmployerID: job.employer_id,
        FreelancerID: job.freelancer_id,
        Title: job.title,
        Description: job.description,
        Category: job.category,
        Price: job.price,
        Status: "finished",
        isCompliant: true,
        ComplianceID: 1,
      };

      const res = await fetch('http://localhost:5004/complete-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Complete job error:", data);
        alert(`Job completion failed: ${data?.error || "Unknown server error"}`);
      } else {
        setSuccessMessage("Job Completed! Please wait for Pending Approval.");
        setShowSuccessModal(true);
        setJobs((prevJobs) => prevJobs.map((j) => j.id === job.id ? { ...j, status: "pending approval" } : j));
      }
    } catch (err) {
      console.error("Network/server error:", err);
      alert("Network/server error when marking job as complete.");
    }
  };

  /*if (loading) return <div>Loading...</div>; */

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
  

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Notifications */}
      {showNotifications && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">New Notifications</h2>
            <ul className="list-disc pl-5 mb-4">
              {notifications.map((n, i) => <li key={i} className="text-gray-700">{n.message}</li>)}
            </ul>
            {notifications.length == 0 && (
              <p className="text-gray-600 mb-4">No new notifications.</p>
            )}
            <button
              className="mt-2 w-full bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] text-white px-4 py-2 rounded-md"
              onClick={handleAcknowledge}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                  <h2 className="text-2xl font-bold mb-4 text-center">Success</h2>
                  <p className="text-gray-700 mb-4 text-center">{successMessage}</p>
                  <button
                    className="mt-2 w-full bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] text-white px-4 py-2 rounded-md"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <motion.div
          initial={!hasAnimated ? { x: -100, opacity: 0 } : false}
          animate={!hasAnimated ? { x: 0, opacity: 1 } : {}}
          transition={!hasAnimated ? { duration: 1.2, ease: 'easeOut' } : {}}
          onAnimationComplete={() => setHasAnimated(true)}
          whileHover={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1], transition: { duration: 1 } }}
          className="relative"
        >
          <Image src={doveIcon} alt="Dove Icon" width={36} height={36} className="drop-shadow-md" />
          <div className="absolute w-4 h-4 bg-blue-300 rounded-full blur-sm -z-10 top-1 left-1 animate-ping" />
        </motion.div>
        <h1 className="text-3xl font-bold text-[#1860f1]">Freelancer Dashboard</h1>
      </div>

      {/* Profile Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">
          Welcome, {profile?.Name || email}
        </h2>
        <button
          className="px-4 py-2 rounded text-white font-medium bg-[#1860f1] hover:bg-[#bcef5d] hover:text-[#1860f1]"
          onClick={handleEditClick}
        >
          Edit
        </button>
      </div>

      <div className="mb-6 bg-white p-6 rounded-xl shadow space-y-2">
        {isEditing ? (
          <>
            <input type="text" name="Name" value={editedProfile?.Name || ''} onChange={handleProfileChange} className="w-full p-2 border rounded" />
            <input type="text" name="Gender" value={editedProfile?.Gender || ''} onChange={handleProfileChange} className="w-full p-2 border rounded" />
            <input type="text" name="Skills" value={editedProfile?.Skills || ''} onChange={handleProfileChange} className="w-full p-2 border rounded" />
            <button className="mt-2 px-4 py-2 rounded text-white font-medium bg-[#1860f1] hover:bg-[#bcef5d] hover:text-[#1860f1] transition-colors duration-200" onClick={handleSaveProfile}>Save</button>
          </>
        ) : (
          <>
            <p className="text-gray-600 text-base">Email: {profile?.Email}</p>
            <p className="text-gray-600 text-base">Gender: {profile?.Gender}</p>
            <p className="text-gray-600 text-base">Skills: {profile?.Skills?.split(',').join(', ')}</p>
          </>
        )}
      </div>

      {/* Wallet Section */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-black">Wallet</h2>
        <button className="px-4 py-2 rounded text-white font-medium transition-colors duration-200 bg-[#1860f1] hover:bg-[#bcef5d] hover:text-[#1860f1]">
          Withdraw
        </button>
      </div>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <p className="text-gray-600 text-base">Balance: ${walletBalance?.toFixed(2) || '0.00'}</p>
      </div>

      {/* Jobs Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Your Applied Jobs</h2>
        {jobs.length === 0 ? (
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-base">No jobs applied yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white border rounded-lg p-3 shadow hover:shadow-md transition flex flex-col justify-between min-h-[150px]">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                  <p className="text-gray-600 text-sm">
                    Status: {
                      job.status.toLowerCase() === 'close' ? 'Applied'
                      : job.status.toLowerCase() === 'pending approval' ? 'Pending Approval'
                      : job.status.toLowerCase() === 'completed' ? 'Completed'
                      : job.status
                    }
                  </p>
                  <p className="text-gray-600 text-sm">Price: ${job.price.toFixed(2)}</p>
                </div>
                <div className="mt-auto flex justify-between items-center pt-2">
                  <a
                    href={`/freelancer/job-listings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-green-600 underline"
                  >
                    View Listing
                  </a>
                  {['pending approval', 'completed', 'finished'].includes(job.status.toLowerCase()) ? (
                    <button
                      className="px-4 py-2 text-sm font-semibold text-[#1860F1] bg-[#BBEF5D] rounded cursor-default"
                      disabled
                    >
                      Completed
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCompleteJob(job)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-[#1860F1] rounded hover:bg-[#BBEF5D] hover:text-[#1860F1]"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

















