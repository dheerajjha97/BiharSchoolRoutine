
"use client";

import { useState, useEffect } from 'react';

function useMediaQuery(query: string): { isMobile: boolean, isMounted: boolean } {
  const [matches, setMatches] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Ensure this code only runs on the client
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => {
        setMatches(media.matches);
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [query]); // matches dependency removed to prevent re-renders

  return { isMobile: matches, isMounted };
}

export default useMediaQuery;
