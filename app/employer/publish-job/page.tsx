'use client';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateJob() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('testing');
  const [employerInfo, setEmployerInfo] = useState({ id: '' });

  async function fetchEmployerInfo() {
    try {
      const response = await fetch(`http://localhost:5400/api/employer/${session?.user?.email}`);
      if (!response.ok) throw new Error('Failed to fetch employer info');
      const data = await response.json();
      setEmployerInfo(data.employer);
      console.log(data.employer);
      return {
        employer_id: data.employer.id,
        wallet_id: data.employer.wallet_id // Assuming wallet_id exists in the response
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const employerInfo = await fetchEmployerInfo();

      if (!employerInfo?.employer_id || !employerInfo?.wallet_id) {
        alert('Unable to retrieve employer information - missing ID or wallet');
        return;
      }

      const { employer_id, wallet_id } = employerInfo;
      const jobId = Math.floor(Date.now() / 1000);
      const skillsArray = skills.split(',').map(skill => skill.trim()).filter(Boolean);
      
      const jobData = {
        job: {
          employer_id: employer_id,
          title,
          category,
          skills:skillsArray,
          price: parseFloat(price),
          description,
          wallet: wallet_id
        },
      };
      
      console.log('Posting job with data:', jobData);

      
      const response = await fetch('http://localhost:5003/job-listing', {
        method: 'POST',
        body: JSON.stringify(jobData),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Response status:', response.status);
      console.log('Response text:', await response.text());

      if (!response.ok) {
        throw new Error(`Failed to post job: ${response.statusText}`);
      }
      alert('Job published successfully!');
      router.push('/employer/dashboard');
    } catch (error) {
      console.error('Error posting job:', error);
      alert('An error occurred while posting the job.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 max-w mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Publish New Job</h1>
      <h2 className="text-gray-500 mb-2">
        Fill in your job details and click 'Post' to publish your job.
      </h2>
      <form onSubmit={handlePost} className="bg-white p-6 rounded-lg shadow mb-6">
        <label className="block mb-4">
          <span className="text-gray-700">Job Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter job title"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            required
          />
        </label>
        {/* Category Dropdown */}
        <label className="block mb-4">
          <span className="text-gray-700">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            required
          >
            <option value="">Select Category</option>
            <option value="IT">IT</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Education">Education</option>
            <option value="Engineering">Engineering</option>
            <option value="Retail">Retail</option>
            <option value="F&B">F&B</option>
            <option value="Logistics">Logistics</option>
          </select>
        </label>
        <label className="block mb-4">
          <span className="text-gray-700">Skills Required</span>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g., JavaScript, React, Node.js"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            required
          />
        </label>
        <label className="block mb-4">
          <span className="text-gray-700">Pay</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 25"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            min="0"
            step="0.01"
            required
          />
        </label>
        <button type="submit" className="mt-4 w-full bg-[#1860F1] hover:bg-[#BBEF5D] hover:text-[#1860F1] transition-colors duration-200 text-white px-4 py-2 rounded-md">
          Post Job
        </button>
      </form>
    </div>
  );
}
