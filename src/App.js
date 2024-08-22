import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileImage, Share2, Copy, LogIn, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import Alert from './components/Alert';
import Button from './components/Button';
import Card from './components/Card';
import Progress from './components/Progress';
import LoadingPage from './LoadingPage';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Google 로그인 설정
provider.setCustomParameters({
  'client_id': process.env.REACT_APP_GOOGLE_CLIENT_ID
});

const App = () => {
  const [image, setImage] = useState(null);
  const [lotteryNumbers, setLotteryNumbers] = useState(null);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [showRecords, setShowRecords] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        await tf.ready();
        setModelLoadingProgress(20);

        const mobilenetModel = await mobilenet.load({
          version: 2,
          alpha: 1.0,
        }, (progress) => {
          setModelLoadingProgress(20 + progress * 80);
        });

        setModel(mobilenetModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Failed to load model:', error);
        setError('모델 로딩에 실패했습니다. 페이지를 새로고침해주세요.');
        setIsModelLoading(false);
      }
    };
    loadModel();

    // Firebase 인증 상태 리스너
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRecords(currentUser.uid);
      } else {
        setRecords([]);
        setShowRecords(false);
      }
    });

    // Firestore 컬렉션 초기화
    const initializeFirestore = async () => {
      try {
        const recordsRef = collection(db, 'records');
        const snapshot = await getDocs(query(recordsRef, limit(1)));
        if (snapshot.empty) {
          console.log('Records collection is empty');
        } else {
          console.log('Records collection exists');
        }
      } catch (error) {
        console.error('Error checking Firestore:', error);
      }
    };

    initializeFirestore();

    return () => unsubscribe();
  }, []);

  const fetchRecords = async (userId) => {
    try {
      setIsLoadingRecords(true);
      const recordsRef = collection(db, 'records');
      const q = query(recordsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10));
      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt.seconds * 1000)
        };
      });
      setRecords(fetchedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('기록을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("이미지 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요.");
        return;
      }
      setImage(URL.createObjectURL(file));
      setError(null);
      setLotteryNumbers(null);
      generateLotteryNumbers(file);
    }
  };

  const generateLotteryNumbers = async (file) => {
    if (!model) {
      setError('모델이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const img = new Image();
    img.onload = async () => {
      try {
        const tfImg = tf.browser.fromPixels(img);
        const results = await model.classify(tfImg);

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

        const generatedNumbers = uniqueNumbers.slice(0, 6).sort((a, b) => a - b);
        setLotteryNumbers(generatedNumbers);
        setIsGenerating(false);
        setProgress(100);

        if (user) {
          try {
            const recordsRef = collection(db, 'records');
            await addDoc(recordsRef, {
              userId: user.uid,
              numbers: generatedNumbers,
              createdAt: new Date()
            });
            fetchRecords(user.uid);
          } catch (error) {
            console.error('Error saving record:', error);
            setError('기록 저장에 실패했습니다.');
          }
        }

        tfImg.dispose();
      } catch (error) {
        console.error('Error generating lottery numbers:', error);
        setError('번호 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        setIsGenerating(false);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleNewImageUpload = () => {
    fileInputRef.current.click();
  };

  const copyToClipboard = () => {
    if (lotteryNumbers) {
      const numbersText = lotteryNumbers.join(', ');
      navigator.clipboard.writeText(numbersText).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }, (err) => {
        console.error('Could not copy text: ', err);
      });
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRecords([]);
      setShowRecords(false);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('로그아웃에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const shareResults = () => {
    if (lotteryNumbers && image) {
      const serviceUrl = "oshi-no-number.firebaseapp.com"; // 실제 서비스 URL로 변경해주세요
      const shareText = `내 최애가 뽑아준 행운의 번호: ${lotteryNumbers.join(', ')}! 🍀✨ 너의 최애는 어떤 번호를 뽑아줄까? '최애의 번호'에서 확인해봐! ${serviceUrl} #최애의번호 #행운번호생성기`;

      if (navigator.share) {
        navigator.share({
          title: '최애의 번호',
          text: shareText,
          url: serviceUrl,
        }).then(() => {
          console.log('공유 성공');
        }).catch((error) => {
          console.error('공유 실패:', error);
        });
      } else {
        navigator.clipboard.writeText(shareText)
          .then(() => {
            alert('공유 텍스트가 클립보드에 복사되었습니다. 원하는 곳에 붙여넣기 해주세요!');
          })
          .catch(err => {
            console.error('클립보드 복사 실패:', err);
          });
      }
    }
  };

  const toggleRecords = () => {
    if (user) {
      setShowRecords(!showRecords);
      if (!showRecords) {
        fetchRecords(user.uid);
      }
    } else {
      setError('기록을 조회하려면 로그인이 필요합니다.');
    }
  };

  if (isModelLoading) {
    return <LoadingPage progress={modelLoadingProgress} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-4">
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
        <div className="w-full lg:max-w-md">
          <h1 className="text-4xl font-bold mb-6 text-center text-yellow-300">최애의 번호</h1>

          <Card className="mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                {user ? (
                  <>
                    <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 flex-1 mr-2">
                      <LogOut className="mr-2" size={18} />
                      로그아웃
                    </Button>
                    <Button onClick={toggleRecords} className="bg-pink-500 hover:bg-pink-600 flex-1 ml-2">
                      {showRecords ? <ChevronUp className="mr-2" size={18} /> : <ChevronDown className="mr-2" size={18} />}
                      {showRecords ? '기록 닫기' : '기록 보기'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleLogin} className="bg-green-500 hover:bg-green-600 w-full">
                    <LogIn className="mr-2" size={18} />
                    구글 로그인
                  </Button>
                )}
              </div>

              {image ? (
                <img src={image} alt="Uploaded" className="w-full h-48 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg mb-4">
                  <Upload size={48} className="text-gray-400" />
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
                className="bg-yellow-400 hover:bg-yellow-500 text-purple-700 w-full"
              >
                {image ? "새 이미지 선택" : "이미지 선택"}
              </Button>
            </div>
          </Card>

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

          {lotteryNumbers && (
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-center">🎉 당신의 최애가 뽑아준 번호</h2>
                <div className="flex justify-between mb-6">
                  {lotteryNumbers.map((number, index) => (
                    <span
                      key={index}
                      className="inline-block w-12 h-12 rounded-full bg-yellow-400 text-purple-700 flex items-center justify-center font-bold text-lg shadow-lg pop-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {number}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col space-y-2">
                  <Button onClick={copyToClipboard} className="bg-blue-500 hover:bg-blue-600 w-full">
                    <Copy className="mr-2" size={18} />
                    {copySuccess ? '복사됨!' : '번호 복사'}
                  </Button>
                  <Button onClick={shareResults} className="bg-green-500 hover:bg-green-600 w-full">
                    <Share2 className="mr-2" size={18} />
                    결과 공유하기
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
                        <span className="font-semibold">{record.numbers.join(', ')}</span>
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

          {/* 모바일용 광고 (lg 미만 화면에서만 표시) */}
          <div className="lg:hidden mt-6">
            <ins
              className="kakao_ad_area"
              style={{ display: "none" }}
              data-ad-unit="DAN-djoXY6w9p9hhc9or"
              data-ad-width="320"
              data-ad-height="100"
            ></ins>
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
      </div>


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
  );
};

export default App;