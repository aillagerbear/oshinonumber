import React from 'react';
import { motion } from 'framer-motion';

const UserProfile = ({ user, onLogout }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4"
    >
      <div className="flex items-center mb-4">
        <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full mr-4" />
        <div>
          <h2 className="text-xl font-semibold">{user.displayName}</h2>
          <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full"
      >
        로그아웃
      </button>
    </motion.div>
  );
};

export default React.memo(UserProfile);