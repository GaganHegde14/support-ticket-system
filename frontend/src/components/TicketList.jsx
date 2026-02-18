import React, { useState, useEffect } from 'react';
import api from '../api';

const TicketList = ({ refreshTrigger }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;
      
      const response = await api.get('/tickets/', { params });
      setTickets(response.data);
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters, refreshTrigger]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/tickets/${id}/`, { status: newStatus });
      fetchTickets(); // Refresh list to reflect changes
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold">Tickets</h2>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <input
            type="text"
            placeholder="Search..."
            className="border rounded p-2 text-sm"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="border rounded p-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="border rounded p-2 text-sm"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading tickets...</div>
      ) : (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <p className="text-gray-500 text-center">No tickets found.</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{ticket.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{ticket.description}</p>
                    <div className="flex space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                        {ticket.category.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 py-1">
                        {new Date(ticket.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <select
                      className="border rounded text-sm p-1 ml-4"
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TicketList;
