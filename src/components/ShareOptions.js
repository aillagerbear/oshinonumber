import React, { useState } from 'react';
import { Copy, X, Share2, Twitter, Facebook, Instagram, MessageCircle } from 'lucide-react';

const sharePlatforms = [
  { name: 'Twitter', icon: Twitter, color: '#1DA1F2', url: 'https://twitter.com/intent/tweet?text=' },
  { name: 'Facebook', icon: Facebook, color: '#4267B2', url: 'https://www.facebook.com/sharer/sharer.php?u=' },
  { name: 'Instagram', icon: Instagram, color: '#E1306C', url: 'https://www.instagram.com/' },
  { name: 'Discord', icon: MessageCircle, color: '#7289DA', url: 'https://discord.com/channels/@me' },
];

const shareTemplates = [
  "내 최애 사진으로 뽑은 {복권타입} 번호예요! 이 번호로 당첨될까요? 😆",
  "최애 사진으로 {복권타입} 번호 뽑아봤어요. 여러분도 한번 도전해보세요!",
  "내 최애 덕질하다가 이 {복권타입} 번호를 받았어요. 이번 주 당첨 예감? 😏",
  "{복권타입} 번호를 뽑아준 최애, 나중에 '내가 너 당첨되게 해줬지?' 할까봐 걱정돼요 😂",
];

const hashtags = ['#복권', '#최애', '#덕질', '#행운의번호', '#당첨기원', '#운빨', '#복권덕후', '#최애덕질', '#로또', '#연금복권'];

const getRandomTemplate = (lotteryType) => {
  const template = shareTemplates[Math.floor(Math.random() * shareTemplates.length)];
  return template.replace('{복권타입}', lotteryType === 'lotto' ? '로또' : '연금복권');
};

const getRandomHashtags = (count) => {
  const shuffled = hashtags.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(' ');
};

const ShareOptions = ({ onClose, lotteryNumbers, serviceUrl, lotteryType }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const formatNumbers = () => {
    if (lotteryType === 'lotto') {
      return lotteryNumbers.join(', ');
    } else if (lotteryType === 'pension') {
      return `${lotteryNumbers[0]} ${lotteryNumbers[1]}`;
    }
    return '';
  };

  const shareText = `${getRandomTemplate(lotteryType)}\n\n🔢 ${lotteryType === 'lotto' ? '로또' : '연금복권'} 번호: ${formatNumbers()}\n\n${getRandomHashtags(3)}\n\n번호 생성하러 가기 👉 ${serviceUrl}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold">결과 공유하기</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {sharePlatforms.map((platform) => {
            let shareUrl = platform.url;
            if (platform.name !== 'Instagram' && platform.name !== 'Discord') {
              shareUrl += `${encodeURIComponent(shareText)}`;
            }
            return (
              <a
                key={platform.name}
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-3 px-4 rounded-lg text-white font-medium transition-transform duration-200 transform hover:scale-105"
                style={{ backgroundColor: platform.color }}
              >
                <platform.icon className="mr-2" size={20} />
                {platform.name}
              </a>
            );
          })}
        </div>
        <button
          onClick={copyToClipboard}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
        >
          <Copy className="mr-2" size={20} />
          {copySuccess ? '복사됨!' : '공유 텍스트 복사'}
        </button>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          <Share2 className="inline-block mr-1" size={16} />
          친구들과 공유하고 함께 행운을 나눠보세요!
        </div>
      </div>
    </div>
  );
};

export default ShareOptions;