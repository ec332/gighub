'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EmployerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employerInfo, setEmployerInfo] = useState({ id: '',name: '', email: '', company: '',wallet_id:'' });
  const [walletBalance, setWalletBalance] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [approvalJobs, setApprovalJobs] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);
  const [notifications, setNotifications] = useState([]);

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
    fetchEmployerInfo();
  }, [session, status, router]);

  useEffect(() => {
    if (!employerInfo.id) return;

    async function fetchJobs() {
      try {
        const response = await fetch(`http://localhost:5100/job/employer/${employerInfo.id}`);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        // setJobs(data);
        setJobs(data?.jobs || []);  
        console.log(data)
      } catch (error) {
        console.error(error);
      }
    }
    fetchJobs();
  }, [employerInfo.id]);

  useEffect(() => {
    if (!employerInfo.id) return;
    async function fetchApprovalJobs() {
      try {
        const response = await fetch(`http://localhost:5500/pendingapproval?employerId=${employerInfo.id}`);
        if (!response.ok) throw new Error('Failed to fetch approval jobs');
        const data = await response.json();
        setApprovalJobs(data);
        console.log(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchApprovalJobs();  
  }, [employerInfo.id]);

  useEffect(() => {
    if (!employerInfo.id) return;
    async function fetchWalletBalance() {
      try {
        const response = await fetch(`http://localhost:5300/wallet/${employerInfo.wallet_id}`);
        if (!response.ok) throw new Error('Failed to fetch wallet balance');
        const data = await response.json();
        setWalletBalance(data.balance);
      } catch (error) {
        console.error(error);
      }
    }
    fetchWalletBalance();  
  }, [employerInfo.wallet_id]);

    useEffect(() => {
      if (!employerInfo.id) return;
    
      async function fetchNotifications() {
        try {
          const response = await fetch(`http://localhost:5800/consume_notifications/employer/${employerInfo.id}`);
          if (!response.ok) throw new Error('Failed to fetch notifications');
          const data = await response.json();
          setNotifications(data.notifications || []);
        } catch (error) {
          console.error(error);
        }
      }
      fetchNotifications();
    }, [employerInfo.id]);

  const handleAcknowledge = () => {
    setShowNotifications(false);
  };

  const handleReleasePayment = async (jobId) => {
    try {
      // Step 1: Fetch the job details using the jobId
      const jobResponse = await fetch(`http://localhost:5100/job/${jobId}`);
      if (!jobResponse.ok) throw new Error('Failed to fetch job details');
      const jobData = await jobResponse.json();
      console.log(jobData);
      
      // Extract freelancer ID and price from the fetched job data
      const freelancerId = jobData.job.freelancer_id;
      const price = jobData.job.price;
  
      // Step 2: Call the payment release endpoint
      const paymentResponse = await fetch('http://localhost:5000/approve-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ID: jobId,
          FreelancerID: freelancerId,
          Price: price,
        }),
      });
  
      const paymentData = await paymentResponse.json();
  
      if (!paymentResponse.ok) throw new Error(paymentData.error || 'Failed to release payment');
  
      alert('Payment Released Successfully');
      setApprovalJobs(approvalJobs.filter(job => job.jobId !== jobId)); // Remove the job from approval
    } catch (error) {
      console.error('Error releasing payment:', error);
      alert('Error releasing payment');
    }
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
            {notifications.length > 0 ? (
            <ul className="list-disc pl-5 mb-4">
              {notifications.map((notification, index) => (
                <li key={index} className="text-gray-700">
                  {notification}
                </li>
              ))}
            </ul>
            ) : (
            <p className="text-gray-600 mb-4">No new notifications.</p>
              )}
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
        {Array.isArray(jobs) && jobs.length === 0 ? (
          <p className="mt-4 text-gray-500 bg-white p-4 shadow rounded-lg">No job listings yet.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white p-4 shadow rounded-lg">
              <h3 className="text-xl font-semibold">{job.title}</h3>
              <p className="text-sm text-gray-600 overflow-hidden overflow-ellipsis whitespace-nowrap">Job Description: {job.description}</p>
              <p className="text-sm text-gray-600">Pay: ${job.price}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {approvalJobs.map((job, index) => (
            <div key={`approval-${index}`} className="bg-white p-4 shadow rounded-lg">
              <h3 className="text-lg font-semibold">Job #{job.jobId}</h3>
              <p className="text-sm text-gray-600">Employer ID: {job.employerId}</p>
              <button className="mt-2 text-sm underline text-[#1860F1] hover:text-[#BBEF5D]" onClick={() => handleReleasePayment(job.jobId)}
              >
                Release Payment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div> // main container
  );
}