'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateJob() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [payRate, setPayRate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobData = {
      title,
      category,
      skills: skills.split(',').map(skill => skill.trim()),
      payRate: parseFloat(payRate),
      status: 'open', // Default to 'open' on creation
    };

    try {
      const response = await fetch('http://localhost:5003/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create job: ${response.statusText}`);
      }

      alert('Job published successfully!');
      router.push('/employer/dashboard');
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Publish New Job</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
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
        <label className="block mb-4">
          <span className="text-gray-700">Category</span>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Software Development"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            required
          />
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
          <span className="text-gray-700">Pay Rate (per hour)</span>
          <input
            type="number"
            value={payRate}
            onChange={(e) => setPayRate(e.target.value)}
            placeholder="e.g., 25"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
            min="0"
            step="0.01"
            required
          />
        </label>
        <button
          type="submit"
          className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Publish Job
        </button>
      </form>
    </div>
  );
}
