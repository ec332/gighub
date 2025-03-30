'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EmployerDashboard() {
  const { data: session, status } = useSession();
  // const empID = session?.user?.id;
  const router = useRouter();
  const [employerInfo, setEmployerInfo] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Tech Innovators Inc.',
  });
  
  const [jobs, setJobs] = useState([
    {
      id: '1',
      title: 'UI/UX Designer',
      description: 'Design webpage for a Pet Shop',
      payRate: 35,
      status: 'Closed',
      skill:'Figma, CSS'
    },
    {
      id: '2',
      title: 'Temp Sales Assistant',
      description: 'Sell perfume at Perfume Fair',
      payRate: 20,
      status: 'Open',
      skill:'Sales'
    },
    {
      id: '3',
      title: 'Server',
      description: 'Assist restaurant with service',
      payRate: 22,
      status: 'Open',
      skill:'Hold tray'

    }
  ]);
  
  const [walletBalance, setWalletBalance] = useState(150.75);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.userType !== 'employer') {
      router.push('/freelancer/dashboard');
    }
  }, [session, status, router]);

  // to be updated with url
  // useEffect(() => {
  //   async function fetchJobs() {
  //     try {
  //       const response = await fetch('http://localhost:5003/job-listing', {method: 'GET'});
  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch jobs: ${response.statusText}`);}
  //       const data = await response.json();
  //       setJobs(data.jobs);
  //     } catch (error) {
  //       console.error('Error fetching jobs:', error);}
  //   }

  //   async function fetchWalletBalance() {
  //     try {
  //       const response = await fetch('http://localhost:5003/wallet', {method: 'GET'});

  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch wallet balance: ${response.statusText}`);}

  //       const data = await response.json();
  //       setWalletBalance(data.balance);
  //     } catch (error) {
  //       console.error('Error fetching wallet balance:',error);}
  //    }

  //   fetchJobs();
  //   fetchWalletBalance();
  // }, []);


  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
              <button className="text-white font-semibold px-4 py-2 rounded-md bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200">+ Top Up</button>
            </div>
            <div className="bg-white shadow rounded-lg p-4 mt-2">
              <p className="text-gray-700">Balance: ${walletBalance}</p>
            </div>
          </div>

          {/* job listings */}
          <div className='job-listing'>
            <div className="mt-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">My Job Listings</h2>
              <button className="text-white font-semibold px-4 py-2 rounded-md bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200" onClick={() =>{console.log('Publish Job button clicked'); router.push('/employer/publish-job')}}>+ Publish New Job</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-4 shadow rounded-lg">
                  <h3 className="text-xl font-semibold">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.description}</p>
                  <p className="text-sm text-gray-600">Skills Needed: {job.skill}</p>
                  <p className="text-sm text-gray-600">Pay Rate: ${job.payRate}/hr</p>
                  <p className="text-sm text-gray-600">Status: {job.status}</p>
                  <button className="text-sm underline text-[#1860F1] hover:text-[#BBEF5D]">Edit Job</button>
                </div>
              ))}
            </div>
          </div>

    </div>

  );
}