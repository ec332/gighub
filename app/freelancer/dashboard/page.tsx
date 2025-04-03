'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import doveIcon from '@/public/dove.png';

interface Job {
  id: string;
  title: string;
  status: string;
}

interface Profile {
  Name: string;
  Gender: string;
  Skills: string;
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
  const [notifications, setNotifications] = useState([
    'New job application received for "UI/UX Designer".',
    'Your job "Temp Sales Assistant" has been marked as completed.',
  ]);

  useEffect(() => {
    if (!email) return;

    const fetchDashboardData = async () => {
      try {
        const jobsRes = await fetch(`/api/jobs?email=${email}`);
        const walletRes = await fetch(`/api/wallet?email=${email}`);
        const profileRes = await fetch(
          `https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/${email}/`
        );

        const jobsData = jobsRes.ok ? await jobsRes.json() : [];
        const walletData = walletRes.ok ? await walletRes.json() : { balance: 0 };
        const profileData = await profileRes.json();

        setJobs(jobsData || []);
        setWalletBalance(walletData.balance || 0);
        setProfile(profileData.Freelancer || null);
        setEditedProfile(profileData.Freelancer || null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [email]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedProfile((prev) => ({
      ...prev!,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    try {
      const response = await fetch('https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleAcknowledge = () => {
    setShowNotifications(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Notification Modal */}
      {showNotifications && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">New Notifications</h2>
            <ul className="list-disc pl-5 mb-4">
              {notifications.map((notification, index) => (
                <li key={index} className="text-gray-700">
                  {notification}
                </li>
              ))}
            </ul>
            <button
              className="mt-2 w-full bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200 text-white px-4 py-2 rounded-md"
              onClick={handleAcknowledge}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Header with Dove Animation */}
      <div className="flex items-center space-x-3 mb-4">
        <motion.div
          initial={!hasAnimated ? { x: -100, opacity: 0 } : false}
          animate={!hasAnimated ? { x: 0, opacity: 1 } : {}}
          transition={!hasAnimated ? { duration: 1.2, ease: 'easeOut' } : {}}
          onAnimationComplete={() => setHasAnimated(true)}
          whileHover={{
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1],
            transition: { duration: 1 },
          }}
          className="relative"
        >
          <Image
            src={doveIcon}
            alt="Dove Icon"
            width={36}
            height={36}
            className="drop-shadow-md"
          />
          <div className="absolute w-4 h-4 bg-blue-300 rounded-full blur-sm -z-10 top-1 left-1 animate-ping" />
        </motion.div>
        <h1 className="text-3xl font-bold text-[#1860f1]">Freelancer Dashboard</h1>
      </div>

      {/* Welcome + Edit */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-black">
          Welcome, {profile?.Name ? `${profile.Name}!` : email}
        </h2>
        <button
          className="px-4 py-2 rounded text-white font-medium transition"
          style={{ backgroundColor: '#1860f1' }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#bcef5d';
            e.currentTarget.style.color = '#1860f1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1860f1';
            e.currentTarget.style.color = '#fff';
          }}
          onClick={handleEditClick}
        >
          Edit
        </button>
      </div>

      {/* Profile Info */}
      <div className="mb-6 bg-white p-6 rounded-xl shadow">
        {isEditing ? (
          <div>
            <input
              type="text"
              name="Name"
              value={editedProfile?.Name || ''}
              onChange={handleProfileChange}
              className="mb-2 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="Gender"
              value={editedProfile?.Gender || ''}
              onChange={handleProfileChange}
              className="mb-2 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="Skills"
              value={editedProfile?.Skills || ''}
              onChange={handleProfileChange}
              className="mb-2 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              className="mt-4 px-4 py-2 rounded text-white font-medium transition"
              style={{ backgroundColor: '#1860f1' }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#bcef5d';
                e.currentTarget.style.color = '#1860f1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1860f1';
                e.currentTarget.style.color = '#fff';
              }}
              onClick={handleSaveProfile}
            >
              Save
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-base mb-4">Gender: {profile?.Gender || 'N/A'}</p>
            <p className="text-gray-600 text-base">
              Skills: {profile?.Skills?.split(',').join(', ') || 'N/A'}
            </p>
          </>
        )}
      </div>

      {/* Wallet Section */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-black">Wallet</h2>
        <button
          className="px-4 py-2 rounded text-white font-medium transition-colors duration-200"
          style={{ backgroundColor: '#1860f1' }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#bcef5d';
            e.currentTarget.style.color = '#1860f1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1860f1';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          Withdraw
        </button>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <p className="text-gray-600 text-base">Balance: ${walletBalance?.toFixed(2) || '0.00'}</p>
      </div>

      {/* Applied Jobs */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Your Jobs</h2>
        {jobs.length === 0 ? (
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-500 text-base">No jobs applied yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border rounded-lg p-4 shadow hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                <p className="text-gray-600 mt-1 capitalize mb-2">Status: {job.status}</p>
                <button
                  className="text-sm font-medium text-blue-600 hover:text-green-600"
                  onClick={() => console.log(`Viewing job ID: ${job.id}`)}
                >
                  View Listing
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
















