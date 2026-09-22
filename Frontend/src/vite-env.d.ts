/// <reference types="vite/client" />

declare module 'lucide-react';

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        prompt: (callback?: (notification: any) => void) => void;
        renderButton: (parent: HTMLElement, options: any) => void;
        disableAutoSelect: () => void;
      };
    };
  };
}
