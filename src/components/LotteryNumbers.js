import React from 'react';
import { motion } from 'framer-motion';
import Alert from './Alert';
import Button from './Button';
import Card from './Card';
import Progress from './Progress';
import LoadingPage from '../LoadingPage';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { useDarkMode } from '../hooks/useDarkMode';
import ShareOptions from './ShareOptions';

const LotteryNumbers = ({ numbers, type }) => {
  if (type === 'lotto') {
    return (
      <div className="flex justify-between mb-6">
        {numbers.map((number, index) => (
          <motion.span
            key={index}
            className="inline-block w-12 h-12 rounded-full bg-yellow-400 text-purple-700 flex items-center justify-center font-bold text-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {number}
          </motion.span>
        ))}
      </div>
    );
  } else if (type === 'pension') {
    const [group, number] = numbers;
    const numberString = typeof number === 'number' ? number.toString().padStart(6, '0') : number;
    return (
      <div className="flex flex-col items-center mb-6">
        <motion.span
          className="text-2xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {group}
        </motion.span>
        <motion.div
          className="flex justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {numberString.split('').map((digit, index) => (
            <motion.span
              key={index}
              className="inline-block w-10 h-10 rounded-full bg-yellow-400 text-purple-700 flex items-center justify-center font-bold text-lg shadow-lg mx-1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              {digit}
            </motion.span>
          ))}
        </motion.div>
      </div>
    );
  }
};

export default LotteryNumbers;