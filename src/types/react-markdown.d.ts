// Type definitions for react-markdown compatibility
/// <reference types="react" />

declare module 'react-markdown' {
  import { ReactNode } from 'react';
  
  export interface ReactMarkdownProps {
    children: string;
    className?: string;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    components?: Record<string, any>;
  }
  
  declare const ReactMarkdown: React.FunctionComponent<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'remark-gfm' {
  const remarkGfm: any;
  export default remarkGfm;
}
