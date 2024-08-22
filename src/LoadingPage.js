import React from 'react';
import { Loader } from 'lucide-react';
import Progress from './components/Progress';

const LoadingPage = ({ progress }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-4">
      <h1 className="text-4xl font-bold mb-6 text-center text-yellow-300">최애의 번호</h1>
      <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
        <div className="flex items-center justify-center mb-4">
          <Loader className="animate-spin text-purple-600 mr-2" size={32} />
          <span className="text-xl font-semibold text-purple-600">AI 모델 로딩 중...</span>
        </div>
        <Progress value={progress} className="w-full mb-4" />
        <p className="text-center text-gray-600">
          잠시만 기다려주세요. 최애의 번호를 생성하기 위한 준비를 하고 있습니다.
        </p>
      </div>
    </div>
  );
};

export default LoadingPage;