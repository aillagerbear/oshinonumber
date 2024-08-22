import React from 'react';

const Card = ({ children, className, ...props }) => (
  <div className={`bg-gray-200 bg-opacity-20 backdrop-blur-md border-2 border-dashed border-gray-400 rounded-lg overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

export default Card;