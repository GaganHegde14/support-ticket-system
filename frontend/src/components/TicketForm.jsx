import React, { useState, useEffect } from 'react';
import api from '../api';

const TicketForm = ({ onTicketCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('low');
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDescriptionBlur = async () => {
    if (!description.trim()) return;

    setIsClassifying(true);
    try {
      const response = await api.post('/tickets/classify/', { description });
      if (response.data.suggested_category) {
        setCategory(response.data.suggested_category);
      }
      if (response.data.suggested_priority) {
        setPriority(response.data.suggested_priority);
      }
    } catch (error) {
      console.error("Classification failed", error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/tickets/', {
        title,
        description,
        category,
        priority
      });
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('low');
      if (onTicketCreated) onTicketCreated();
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">New Ticket</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            required
          />
          {isClassifying && <p className="text-xs text-indigo-600 mt-1">✨ AI is analyzing...</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
};

export default TicketForm;
