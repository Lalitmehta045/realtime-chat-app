import { useState, useEffect } from 'react';

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isXs = windowSize.width < breakpoints.sm;
  const isSm = windowSize.width >= breakpoints.sm && windowSize.width < breakpoints.md;
  const isMd = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isLg = windowSize.width >= breakpoints.lg && windowSize.width < breakpoints.xl;
  const isXl = windowSize.width >= breakpoints.xl && windowSize.width < breakpoints['2xl'];
  const is2xl = windowSize.width >= breakpoints['2xl'];

  const isSmallScreen = windowSize.width < breakpoints.md;
  const isMediumScreen = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg;
  const isLargeScreen = windowSize.width >= breakpoints.lg;

  return {
    windowSize,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
  };
};
