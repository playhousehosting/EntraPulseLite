// Global React JSX augmentation for react-markdown
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Ensure this module is treated as a module
export {};
