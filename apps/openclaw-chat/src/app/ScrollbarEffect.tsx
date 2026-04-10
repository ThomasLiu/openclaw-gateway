'use client';

import { useEffect } from 'react';
import { initializeScrollbarEffect } from './scrollbar-effect';

export default function ScrollbarEffect() {
  useEffect(() => {
    // Initialize scrollbar effect when component mounts
    initializeScrollbarEffect();
  }, []);

  return null;
}
