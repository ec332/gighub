'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface FormField {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  options?: string[];
}

interface ProfileFormProps {
  userType: 'employer' | 'employee';
  onSubmit: (data: any) => Promise<void>;
}

export default function ProfileForm({ userType, onSubmit }: ProfileFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const baseFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1234567890' },
    { name: 'location', label: 'Location', type: 'text', placeholder: 'City, Country' },
    { name: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Tell us about yourself...' },
  ];

  const employerFields: FormField[] = [
    { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Company Inc.', required: true },
    { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Technology, Healthcare, etc.' },
    { name: 'companySize', label: 'Company Size', type: 'select', placeholder: 'Select company size', 
      options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
    { name: 'website', label: 'Company Website', type: 'url', placeholder: 'https://example.com' },
  ];

  const employeeFields: FormField[] = [
    { name: 'title', label: 'Professional Title', type: 'text', placeholder: 'Software Engineer', required: true },
    { name: 'skills', label: 'Skills', type: 'text', placeholder: 'JavaScript, React, Node.js' },
    { name: 'experience', label: 'Years of Experience', type: 'select', placeholder: 'Select experience',
      options: ['0-1', '1-3', '3-5', '5-10', '10+'] },
    { name: 'education', label: 'Education', type: 'text', placeholder: 'Degree, Institution' },
    { name: 'availability', label: 'Availability', type: 'select', placeholder: 'Select availability',
      options: ['Immediately', 'In 2 weeks', 'In 1 month', 'In 3 months'] },
    { name: 'preferredLocation', label: 'Preferred Location', type: 'text', placeholder: 'Remote, City, Country' },
  ];

  const fields = [...baseFields, ...(userType === 'employer' ? employerFields : employeeFields)];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      
      // Convert skills string to array for employee profiles
      if (userType === 'employee' && data.skills) {
        data.skills = (data.skills as string).split(',').map(skill => skill.trim());
      }

      await onSubmit({
        ...data,
        email: session?.user?.email,
        userId: session?.user?.email,
      });

      // Redirect to dashboard after successful profile creation
      router.push(`/${userType}/dashboard`);
    } catch (err) {
      setError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={4}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">{field.placeholder}</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          )}
        </div>
      ))}

      {error && (
        <div className="text-red-500 text-sm text-center">{error}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
} 