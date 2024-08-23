import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import Alert from './components/Alert.js';
import Button from './components/Button';
import Card from './components/Card';
import Progress from './components/Progress';
import LoadingPage from './LoadingPage';
import { useAuth } from './hooks/useAuth';
import { useFirestore } from './hooks/useFirestore';
import { useDarkMode } from './hooks/useDarkMode';
import ShareOptions from './components/ShareOptions';
import LotteryNumbers from './components/LotteryNumbers';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

const App = () => {
  const [image, setImage] = useState(null);
  const [lotteryNumbers, setLotteryNumbers] = useState(null);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [lotteryType, setLotteryType] = useState('lotto');
  const [infoMessage, setInfoMessage] = useState(null);
  const fileInputRef = useRef(null);

  const { user, login, logout } = useAuth();
  const { fetchRecords, addRecord, records } = useFirestore(user);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  useEffect(() => {
    const loadModel = async () => {
      console.log('모델 로딩 프로세스 시작');
      try {
        setIsModelLoading(true);
        console.log('TensorFlow.js 초기화 시작');
        await tf.ready();
        console.log('TensorFlow.js 초기화 완료');
        setModelLoadingProgress(10);

        console.log('MobileNet 모델 로딩 시작');
        const mobilenetModel = await mobilenet.load({
          version: 2,
          alpha: 1.0,
        }, (progress) => {
          const currentProgress = 10 + progress * 80;
          console.log(`MobileNet 모델 로딩 진행률: ${currentProgress.toFixed(2)}%`);
          setModelLoadingProgress(currentProgress);
        });
        console.log('MobileNet 모델 로딩 완료');
        setModelLoadingProgress(90);

        console.log('모델 초기화 및 웜업 시작');
        const sampleImageTensor = tf.zeros([1, 224, 224, 3]);
        await mobilenetModel.classify(sampleImageTensor);
        sampleImageTensor.dispose();
        console.log('모델 초기화 및 웜업 완료');

        setModel(mobilenetModel);
        setIsModelReady(true);
        setIsModelLoading(false);
        setModelLoadingProgress(100);
        console.log('모델 로딩 프로세스 완료. 모델 사용 준비 완료.');
      } catch (error) {
        console.error('모델 로딩 실패. 상세 오류:', error);
        console.error('오류 스택:', error.stack);
        setError('모델 로딩에 실패했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.');
        setIsModelLoading(false);
        setModelLoadingProgress(0);
      }
    };

    console.log('모델 로딩 함수 호출');
    loadModel();

    return () => {
      console.log('컴포넌트 언마운트. 필요시 모델 정리 로직 실행.');
    };
  }, []);

  const resetState = useCallback(() => {
    setImage(null);
    setLotteryNumbers(null);
    setError(null);
    setIsGenerating(false);
    setProgress(0);
    setInfoMessage(null);
  }, []);

  const generateLotteryNumbers = useCallback(async (file) => {
    console.log('번호 생성 프로세스 시작');
    console.log('현재 선택된 복권 타입:', lotteryType);
    
    if (!isModelReady) {
      console.error('모델이 아직 준비되지 않음. 현재 모델 상태:', { isModelReady, isModelLoading });
      setError('모델이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  
    setIsGenerating(true);
    setProgress(0);
  
    try {
      let generatedNumbers;
  
      if (lotteryType === 'pension') {
        console.log('연금복권 번호 생성 시작');
        const group = Math.floor(Math.random() * 5) + 1;
        const number = Math.floor(Math.random() * 1000000);
        generatedNumbers = [`${group}조`, number.toString().padStart(6, '0')];
        console.log('생성된 연금복권 번호:', generatedNumbers);
      } else {
        console.log('로또 번호 생성 시작');
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
  
        const tfImg = tf.browser.fromPixels(img);
        const results = await model.classify(tfImg);
        console.log('이미지 분류 완료. 결과:', results);
  
        const hash = results.slice(0, 3).map(r => r.className).join(',');
        const numbers = [];
        for (let i = 0; i < 6; i++) {
          const index = hash.charCodeAt(i % hash.length) + hash.charCodeAt((i + 1) % hash.length);
          numbers.push((index % 45) + 1);
        }
  
        const uniqueNumbers = Array.from(new Set(numbers));
        while (uniqueNumbers.length < 6) {
          const index = Math.floor(Math.random() * 45) + 1;
          uniqueNumbers.push(index);
        }
  
        generatedNumbers = uniqueNumbers.slice(0, 6).sort((a, b) => a - b);
        
        tfImg.dispose();
      }
      
      console.log('생성된 번호:', generatedNumbers);
      setLotteryNumbers(generatedNumbers);
      setIsGenerating(false);
      setProgress(100);
  
      if (user) {
        console.log('사용자 로그인 확인. 기록 저장 시도');
        try {
          await addRecord(generatedNumbers);
          console.log('기록 저장 성공');
        } catch (error) {
          console.error('기록 저장 실패:', error);
          setError('기록 저장에 실패했습니다.');
        }
      }
  
      console.log('번호 생성 프로세스 완료');
    } catch (error) {
      console.error('번호 생성 중 오류 발생:', error);
      console.error('오류 스택:', error.stack);
      setError('번호 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsGenerating(false);
    }
  }, [lotteryType, isModelReady, model, user, addRecord]);

  const InfoMessage = ({ message }) => (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 flex items-start">
      <LucideIcons.Info className="flex-shrink-0 mr-2 mt-1" />
      <p>{message}</p>
    </div>
  );

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('이미지 업로드 시작:', file.name);
      console.log('현재 선택된 복권 타입:', lotteryType);
      if (file.size > 10 * 1024 * 1024) {
        console.warn('이미지 크기 초과:', file.size);
        setError("이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요.");
        return;
      }
      setImage(URL.createObjectURL(file));
      setError(null);
      setLotteryNumbers(null);
      setInfoMessage("참고: 업로드된 이미지는 서버에 저장되지 않으며, 번호 생성 후 즉시 삭제됩니다.");
      if (isModelReady) {
        console.log('모델 준비 완료. 번호 생성 시작');
        generateLotteryNumbers(file);
      } else {
        console.log('모델이 아직 준비되지 않음');
        setError("모델 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      }
    }
  }, [isModelReady, generateLotteryNumbers, lotteryType]);

  const handleNewImageUpload = useCallback(() => {
    fileInputRef.current.click();
  }, []);

  const copyToClipboard = useCallback(() => {
    if (lotteryNumbers) {
      const numbersText = lotteryType === 'lotto' 
        ? lotteryNumbers.join(', ') 
        : `${lotteryNumbers[0]} ${lotteryNumbers[1]}`;
      navigator.clipboard.writeText(numbersText).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }, (err) => {
        console.error('Could not copy text: ', err);
      });
    }
  }, [lotteryNumbers, lotteryType]);

  const shareResults = useCallback(() => {
    if (lotteryNumbers) {
      setShowShareOptions(true);
    }
  }, [lotteryNumbers]);

  const toggleRecords = useCallback(() => {
    if (user) {
      setShowRecords(prev => !prev);
      if (!showRecords) {
        fetchRecords();
      }
    } else {
      setError('기록을 조회하려면 로그인이 필요합니다.');
    }
  }, [user, showRecords, fetchRecords]);

  const handleLotteryTypeChange = useCallback((newType) => {
    setLotteryType(newType);
    resetState();
  }, [resetState]);

  const mainContent = useMemo(() => (
    <div className="w-full lg:max-w-md">
      <h1 className="text-4xl font-bold mb-6 text-center text-yellow-300">최애의 번호</h1>

      {infoMessage && <InfoMessage message={infoMessage} />}

      <Card className="mb-6">
        <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
            {user ? (
              <>
                <Button 
                  onClick={logout} 
                  className="bg-red-500 hover:bg-red-600 flex items-center justify-center py-2"
                >
                  <LucideIcons.LogOut size={18} className="mr-2" />
                  <span>로그아웃</span>
                </Button>
                <Button 
                  onClick={toggleRecords} 
                  className="bg-pink-500 hover:bg-pink-600 flex items-center justify-center py-2"
                >
                  {showRecords ? <LucideIcons.ChevronUp size={18} className="mr-2" /> : <LucideIcons.ChevronDown size={18} className="mr-2" />}
                  <span>{showRecords ? '기록 닫기' : '기록 보기'}</span>
                </Button>
              </>
            ) : (
              <Button 
                onClick={login} 
                className="bg-green-500 hover:bg-green-600 col-span-2 flex items-center justify-center py-2"
              >
                <LucideIcons.LogIn size={18} className="mr-2" />
                <span>구글 로그인</span>
              </Button>
            )}
            <Button
              onClick={() => handleLotteryTypeChange('lotto')}
              className={`flex items-center justify-center py-2 ${lotteryType === 'lotto' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <LucideIcons.Clover size={18} className="mr-2" />
              <span>로또</span>
            </Button>
            <Button
              onClick={() => handleLotteryTypeChange('pension')}
              className={`flex items-center justify-center py-2 ${lotteryType === 'pension' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <LucideIcons.PiggyBank size={18} className="mr-2" />
              <span>연금복권</span>
            </Button>
          </div>

          {image ? (
            <img src={image} alt="Uploaded" className="w-full h-48 object-cover rounded-lg mb-4" loading="lazy" />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg mb-4">
              <LucideIcons.Upload size={48} className="text-gray-400" />
            </div>
          )}
<p className="text-center mb-4">
            {image ? "새 이미지를 업로드하려면 아래 버튼을 클릭하세요" : "최애의 이미지를 업로드하세요"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            id="imageUpload"
          />
          <Button
            onClick={handleNewImageUpload}
            className="bg-yellow-400 hover:bg-yellow-500 text-purple-700 w-full flex items-center justify-center py-2"
            disabled={isModelLoading || !isModelReady}
          >
            <LucideIcons.Image size={18} className="mr-2" />
            <span>
              {isModelLoading ? "모델 로딩 중..." : !isModelReady ? "모델 준비 중..." : image ? "새 이미지 선택" : "이미지 선택"}
            </span>
          </Button>
        </div>
      </Card>

      {lotteryNumbers && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">🎉 당신의 최애가 뽑아준 번호</h2>
            <LotteryNumbers numbers={lotteryNumbers} type={lotteryType} />
            <div className="flex flex-col space-y-2 mt-4">
              <Button 
                onClick={copyToClipboard} 
                className="bg-blue-500 hover:bg-blue-600 w-full flex items-center justify-center py-2"
              >
                <LucideIcons.Copy size={18} className="mr-2" />
                <span>{copySuccess ? '복사됨!' : '번호 복사'}</span>
              </Button>
              <Button 
                onClick={shareResults} 
                className="bg-green-500 hover:bg-green-600 w-full flex items-center justify-center py-2"
              >
                <LucideIcons.Share2 size={18} className="mr-2" />
                <span>결과 공유하기</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {user && showRecords && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">최근 기록</h3>
            {isLoadingRecords ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : records.length > 0 ? (
              <ul className="space-y-2">
                {records.map((record) => (
                  <li key={record.id} className="bg-purple-700 rounded p-2">
                    <span className="block text-sm text-yellow-300">
                      {record.createdAt instanceof Date
                        ? record.createdAt.toLocaleString()
                        : new Date(record.createdAt.seconds * 1000).toLocaleString()}
                    </span>
                    <span className="font-semibold">
                      {Array.isArray(record.numbers) 
                        ? record.numbers.join(', ')
                        : `${record.numbers[0]} ${record.numbers[1]}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>기록이 없습니다.</p>
            )}
          </div>
        </Card>
      )}

      {!user && (
        <p className="text-center text-yellow-200 mt-4">
          로그인하시면 번호 생성 기록을 저장하고 언제든지 조회할 수 있습니다.
        </p>
      )}

      {error && (
        <Alert className="mb-6" title="오류" description={error} />
      )}

      {isGenerating && (
        <Card className="mb-6">
          <div className="p-4">
            <Progress value={progress} className="w-full mb-2" />
            <p className="text-center">최애의 힘으로 번호를 생성 중...</p>
          </div>
        </Card>
      )}
    </div>
  ), [user, showRecords, login, logout, toggleRecords, lotteryNumbers, lotteryType, copyToClipboard, copySuccess, shareResults, image, handleNewImageUpload, isModelLoading, isModelReady, handleLotteryTypeChange, records, isLoadingRecords, error, isGenerating, progress, infoMessage]);

  if (isModelLoading) {
    return <LoadingPage progress={modelLoadingProgress} />;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'} p-4`}>
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-center items-start">
        {/* 왼쪽 광고 (PC에서만 표시) */}
        <div className="hidden lg:block lg:w-[160px] lg:mr-4">
          <div className="sticky top-4">
            <ins
              className="kakao_ad_area"
              style={{ display: "none" }}
              data-ad-unit="DAN-0QaJ4KAraBvXnzPS"
              data-ad-width="160"
              data-ad-height="600"
            ></ins>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        {mainContent}

        {/* 오른쪽 광고 (PC에서만 표시) */}
        <div className="hidden lg:block lg:w-[160px] lg:ml-4">
          <div className="sticky top-4">
            <ins
              className="kakao_ad_area"
              style={{ display: "none" }}
              data-ad-unit="DAN-0QaJ4KAraBvXnzPS"
              data-ad-width="160"
              data-ad-height="600"
            ></ins>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <amp-ad width="100vw" height="320"
          type="adsense"
          data-ad-client="ca-pub-9391132389131438"
          data-ad-slot="3450393174"
          data-auto-format="rspv"
          data-full-width="">
          <div overflow=""></div>
        </amp-ad>
      </div>

      {/* 다크 모드 토글 버튼 */}
      <button
        onClick={toggleDarkMode}
        className="fixed bottom-4 right-4 bg-gray-200 dark:bg-gray-700 p-2 rounded-full shadow-lg"
        aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
      >
        {isDarkMode ? '🌞' : '🌙'}
      </button>

      {/* ShareOptions 모달 */}
      {showShareOptions && (
        <ShareOptions
          onClose={() => setShowShareOptions(false)}
          lotteryNumbers={lotteryNumbers}
          serviceUrl="https://oshi-no-number.firebaseapp.com"
          lotteryType={lotteryType}
        />
      )}
    </div>
  );
};

export default React.memo(App);