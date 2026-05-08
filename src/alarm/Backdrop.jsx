import { useEffect, useState } from 'react';

const IMAGES = [
  'images/image1.png',
  'images/image2.png',
  'images/image3.png',
  'images/image4.png',
];
const SLIDE_MS = 30_000;
const FADE_MS = 1500;

function pickRandom(exclude) {
  if (IMAGES.length <= 1) return 0;
  let i;
  do { i = Math.floor(Math.random() * IMAGES.length); } while (i === exclude);
  return i;
}

export default function Backdrop() {
  // Two layers — we crossfade between them.
  const [a, setA] = useState(() => Math.floor(Math.random() * IMAGES.length));
  const [b, setB] = useState(() => pickRandom(a));
  const [showA, setShowA] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShowA((prev) => {
        if (prev) {
          // currently A is visible — preload next on B
          setB(pickRandom(a));
        } else {
          setA(pickRandom(b));
        }
        return !prev;
      });
    }, SLIDE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b]);

  const url = (i) => chrome.runtime.getURL(IMAGES[i]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Layer A */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity"
        style={{
          backgroundImage: `url(${url(a)})`,
          opacity: showA ? 1 : 0,
          transitionDuration: `${FADE_MS}ms`,
        }}
      />
      {/* Layer B */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity"
        style={{
          backgroundImage: `url(${url(b)})`,
          opacity: showA ? 0 : 1,
          transitionDuration: `${FADE_MS}ms`,
        }}
      />
      {/* Soft tint to keep text readable on top of any image */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
    </div>
  );
}
