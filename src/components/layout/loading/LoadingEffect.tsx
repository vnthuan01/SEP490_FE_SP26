import React from 'react';
import { useEffect, useState } from 'react';
import { ShieldCheck, Helicopter, Cross, CloudRain, Mountain } from 'lucide-react';

import './LoadingEffect.css';

type Scene = {
  icon: React.ReactNode;
  text: string;
};

interface Props {
  timeout?: number;
}

const scenes: Scene[] = [
  {
    icon: <ShieldCheck className="loader-icon pulse" />,
    text: 'Kết nối hệ thống cứu hộ - cứu trợ',
  },
  {
    icon: <Helicopter className="loader-icon helicopter" />,
    text: 'Điều phối trực thăng cứu hộ',
  },
  {
    icon: <Cross className="loader-icon medical" />,
    text: 'Chuẩn bị đội y tế khẩn cấp',
  },
  {
    icon: <CloudRain className="loader-icon rain" />,
    text: 'Phân tích mưa bão',
  },
  {
    icon: <Mountain className="loader-icon landslide" />,
    text: 'Phát hiện nguy cơ sạt lở',
  },
];

const LoadingEffect = ({ timeout = 2500 }: Props) => {
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      timer = setTimeout(() => {
        setTransition(true);

        setTimeout(() => {
          setIndex((prev) => (prev + 1) % scenes.length);
          setTransition(false);

          run(); // chạy vòng tiếp
        }, 400); // thời gian animation icon
      }, timeout);
    };

    run();

    return () => clearTimeout(timer);
  }, [timeout]);

  return (
    <div className="loader-page">
      <div className="loader-container">
        <div key={index} className={`icon-wrapper ${transition ? 'transition' : 'fade'}`}>
          <div className="loader-ring"></div>

          {scenes[index].icon}
        </div>

        <div className="loading-text">
          {scenes[index].text}
          <span className="dots"></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingEffect;
