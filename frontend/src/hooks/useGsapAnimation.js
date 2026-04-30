import gsap from 'gsap';
import { useEffect, useRef } from 'react';

// GSAP animation presets
export const gsapAnimations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 0.6 },
  },
  slideInUp: {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0, duration: 0.6 },
  },
  slideInDown: {
    from: { opacity: 0, y: -30 },
    to: { opacity: 1, y: 0, duration: 0.6 },
  },
  slideInLeft: {
    from: { opacity: 0, x: -30 },
    to: { opacity: 1, x: 0, duration: 0.6 },
  },
  slideInRight: {
    from: { opacity: 0, x: 30 },
    to: { opacity: 1, x: 0, duration: 0.6 },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1, duration: 0.6 },
  },
  bounce: {
    to: {
      y: -10,
      duration: 0.6,
      ease: 'elastic.out(1, 0.5)',
    },
  },
  pulse: {
    to: {
      scale: 1.05,
      duration: 0.4,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
    },
  },
  hover: {
    to: {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
    },
  },
  shimmer: {
    to: {
      backgroundPosition: '200% center',
      duration: 2,
      ease: 'power1.inOut',
    },
  },
};

// Hook for GSAP animations on mount
export const useGsapAnimation = (animation, delay = 0, trigger = true) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!trigger || !ref.current) return;

    // Set initial state
    if (animation.from) {
      gsap.set(ref.current, animation.from);
    }

    // Animate
    gsap.to(ref.current, {
      ...animation.to,
      delay,
    });
  }, [animation, delay, trigger]);

  return ref;
};

// Hook for staggered animations
export const useGsapStagger = (selector, animation, delay = 0, trigger = true) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!trigger || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll(selector);

    // Set initial state
    if (animation.from) {
      gsap.set(elements, animation.from);
    }

    // Stagger animation
    gsap.to(elements, {
      ...animation.to,
      delay,
      stagger: animation.stagger || 0.1,
    });
  }, [selector, animation, delay, trigger]);

  return containerRef;
};

// Hook for scroll animations
export const useGsapScrollAnimation = (selector, animation) => {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    elements.forEach((el) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (animation.from) {
              gsap.set(el, animation.from);
            }
            gsap.to(el, animation.to);
            observer.unobserve(el);
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => {
        const observer = new IntersectionObserver(() => {});
        observer.unobserve(el);
      });
    };
  }, [selector, animation]);
};

// Direct GSAP utilities
export const animateElement = (element, animation, delay = 0) => {
  if (!element) return;
  if (animation.from) {
    gsap.set(element, animation.from);
  }
  gsap.to(element, {
    ...animation.to,
    delay,
  });
};

export const animateElements = (elements, animation, delay = 0, stagger = 0.1) => {
  if (!elements || elements.length === 0) return;
  if (animation.from) {
    gsap.set(elements, animation.from);
  }
  gsap.to(elements, {
    ...animation.to,
    delay,
    stagger,
  });
};
