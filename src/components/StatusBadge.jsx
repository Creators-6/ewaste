import React from 'react';
import './StatusBadge.css';

const STATUS_STYLES = {
  pending: 'status-badge status-pending',
  interested: 'status-badge status-interested',
  rejected: 'status-badge status-rejected',
  done: 'status-badge status-done',
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  let label = '';
  if (normalized === 'pending') label = 'Pending';
  else if (normalized === 'interested') label = 'Interested';
  else if (normalized === 'rejected') label = 'Rejected';
  else label = status;

  return <span className={STATUS_STYLES[normalized] || 'status-badge'}>{label}</span>;
}

// To make the status changeable via dropdown or button:
// 1. Store the status in a parent component's state.
// 2. Pass the status and a setter function to a dropdown or button group.
// 3. On change, update the status in state and re-render StatusBadge.
// Example:
// const [status, setStatus] = useState('pending');
// <select value={status} onChange={e => setStatus(e.target.value)}>
//   <option value="pending">Pending</option>
//   <option value="recycled">Recycled</option>
//   <option value="rejected">Rejected</option>
// </select>
// <StatusBadge status={status} /> 