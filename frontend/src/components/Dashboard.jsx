import React, { useEffect, useState } from 'react';
import api from '../api';

const Dashboard = ({ refreshTrigger }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/tickets/stats/');
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [refreshTrigger]);

  if (loading || !stats) return <div className="text-center p-4">Loading stats...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
        <h3 className="text-sm font-medium text-gray-500">Total Tickets</h3>
        <p className="text-2xl font-bold">{stats.total_tickets}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
        <h3 className="text-sm font-medium text-gray-500">Open Tickets</h3>
        <p className="text-2xl font-bold">{stats.open_tickets}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
        <h3 className="text-sm font-medium text-gray-500">Avg Tickets/Day</h3>
        <p className="text-2xl font-bold">{stats.avg_tickets_per_day}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
         <h3 className="text-sm font-medium text-gray-500">Critical Priority</h3>
         <p className="text-2xl font-bold">{stats.priority_breakdown?.critical || 0}</p>
      </div>
    </div>
  );
};

export default Dashboard;
