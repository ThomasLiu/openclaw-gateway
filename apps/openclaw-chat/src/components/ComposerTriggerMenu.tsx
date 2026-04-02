'use client';

import { useEffect, useRef, useState } from 'react';

interface MenuItem {
  label: string;
  description: string;
  insertText: string;
}

interface ComposerTriggerMenuProps {
  items: MenuItem[];
  onSelect: (insertText: string) => void;
  onClose: () => void;
}

export function ComposerTriggerMenu({ items, onSelect, onClose }: ComposerTriggerMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Keep a ref in sync with state for use in event handler (updated in effect to avoid render-time ref access)
  const selectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  });

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        onSelect(items[selectedIndexRef.current]?.insertText ?? '');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, onSelect, onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 left-0 right-0 max-h-80 flex bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-50"
      style={{ overflow: 'visible' }}
    >
      {/* Left: list */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-700 overflow-y-auto min-h-0 flex-1 max-h-80">
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => onSelect(item.insertText)}
            className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-zinc-700 transition-colors ${
              i === selectedIndex ? 'bg-zinc-700 text-white' : 'text-zinc-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right: description */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0 max-h-80">
        <p className="text-xs text-zinc-400 leading-relaxed">
          {items[selectedIndex]?.description ?? ''}
        </p>
      </div>
    </div>
  );
}
