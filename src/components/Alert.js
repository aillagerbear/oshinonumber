import React from 'react';

const Alert = ({ title, description, className, ...props }) => (
  <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative ${className}`} role="alert" {...props}>
    <strong className="font-bold">{title}</strong>
    <span className="block sm:inline"> {description}</span>
  </div>
);

export default Alert;