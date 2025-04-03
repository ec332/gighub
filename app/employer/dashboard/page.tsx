'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EmployerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // const [jobs, setJobs] = useState([
  //   {
  //     id: '1',
  //     title: 'UI/UX Designer',
  //     description: 'testing how it will look w long desc Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam',
  //     payRate: 35,
  //     status: 'Closed',
  //     skill:'Figma, CSS'
  //   },
  //   {
  //     id: '2',
  //     title: 'Temp Sales Assistant',
  //     description: 'Sell perfume at Perfume Fair',
  //     payRate: 20,
  //     status: 'Open',
  //     skill:'Sales'
  //   },
  //   {
  //     id: '3',
  //     title: 'Server',
  //     description: 'Assist restaurant with service',
  //     payRate: 22,
  //     status: 'Open',
  //     skill:'Hold tray'

  //   }
  // ]);
  const [employerInfo, setEmployerInfo] = useState({ id: '',name: '', email: '', company: '',wallet_id:'' });

  const [walletBalance, setWalletBalance] = useState(150.75);
  const [jobs, setJobs] = useState([]);
  const [approvalJobs, setApprovalJobs] = useState([]);

  const [showNotifications, setShowNotifications] = useState(true);
  const [notifications, setNotifications] = useState([
    'New application received for "Temp Sales Assistant".',
    'Your job "Server" has been marked as completed.',
  ]);

  // const [walletBalance, setWalletBalance] = useState(0);
  // const [showNotifications, setShowNotifications] = useState(true);
  // const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.userType !== 'employer') {
      router.push('/freelancer/dashboard');
      return;
    }

    async function fetchEmployerInfo() {
      try {
        const response = await fetch(`http://localhost:5400/api/employer/${session?.user?.email}`);
        if (!response.ok) throw new Error('Failed to fetch employer info');
        const data = await response.json();
        setEmployerInfo(data.employer);
      } catch (error) {
        console.error(error);
      }
    }

    async function fetchJobs() {
      try {
        const response = await fetch(`http://localhost:5100/job/employer/${employerInfo.id}`);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        setJobs(data.jobs);
      } catch (error) {
        console.error(error);
      }
    }

    // async function fetchApprovalJobs() {
    //   try {
    //     const response = await fetch('http://localhost:5500/pendingapproval?employerId=${employerInfo.id}');
    //     if (!response.ok) throw new Error('Failed to fetch approval jobs');
    //     const data = await response.json();
    //     setApprovalJobs(data.jobs);
    //     // console.log(data.jobs);
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }

    // async function fetchWalletBalance() {
    //   try {
    //     const response = await fetch(`http://localhost:5300/wallet/<int:wallet_id>`);
    //     if (!response.ok) throw new Error('Failed to fetch wallet balance');
    //     const data = await response.json();
    //     setWalletBalance(data.balance);
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }

    // async function fetchNotifications() {
    //   try {
    //     const response = await fetch(`{API_URL}/notifications?employerID=${session?.user?.id}`);
    //     if (!response.ok) throw new Error('Failed to fetch notifications');
    //     const data = await response.json();
    //     setNotifications(data.notifications);
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }

    fetchEmployerInfo();
    fetchJobs();
    // fetchApprovalJobs();
    // fetchWalletBalance();
    // fetchNotifications();
  }, [session, status, router]);

  const handleAcknowledge = () => {
    setShowNotifications(false);
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 max-w mx-auto py-6 sm:px-6 lg:px-8"> 

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
              onClick={handleAcknowledge}>Acknowledge</button>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
          
      {/* acct info */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900">
              Welcome back, {employerInfo.name}!
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Email: {employerInfo.email}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Company: {employerInfo.company}
            </p>
      </div>

      {/* wallet balance */}
      <div className='wallet'>
        <div className="mt-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Wallet</h2>
        </div>
        <div className="bg-white shadow rounded-lg p-4 mt-2">
          <p className="text-gray-700">Balance: ${walletBalance}</p>
        </div>
      </div>

      {/* job listings */}
      <div className='job-listing'>
        <div className="mt-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">My Job Listings</h2>
          <button className="text-white px-4 py-2 rounded-md bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200" onClick={() =>{console.log('Publish Job button clicked'); router.push('/employer/publish-job')}}>+ Publish New Job</button>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-4 text-gray-500 bg-white p-4 shadow rounded-lg">No job listings yet.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white p-4 shadow rounded-lg">
              <h3 className="text-xl font-semibold">{job.title}</h3>
              <p className="text-sm text-gray-600 overflow-hidden overflow-ellipsis whitespace-nowrap">Job Description: {job.description}</p>
              <p className="text-sm text-gray-600">Pay Rate: ${job.price}/hr</p>
              <p className="text-sm text-gray-600">Status: {job.status}</p>
              <button className="text-sm underline text-[#1860F1] hover:text-[#BBEF5D]">Edit Job</button>
            </div>
          ))}
        </div>
        )}
      </div>
        
      {/* Waiting for Approval */}
      <div className="waiting-approval mt-8">
        <h2 className="text-xl font-bold mb-4">Waiting for Approval</h2>
        {approvalJobs.length === 0 ? (
          <p className="mt-4 text-gray-500 bg-white p-4 shadow rounded-lg">No approval listings yet.</p>
        ) : (
          approvalJobs.slice(0, 2).map((job, index) => (
            <div key={`approval-${index}`} className="bg-white p-4 shadow rounded-lg">
              <h3 className="text-xl font-semibold">{job.title}</h3>
              <p className="text-sm text-gray-600">Job ID: {job.jobId}</p>
              {/* <p className="text-sm text-gray-600">Date Completed: {job.completedDate}</p> */}
              <button className="text-sm underline text-[#1860F1] hover:text-[#BBEF5D]">Release Payment</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}