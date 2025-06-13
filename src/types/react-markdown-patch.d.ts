// Comprehensive patch for react-markdown compatibility with React 19
// This file patches the JSX namespace issues in react-markdown

// First, patch the complex-types module that's causing the error
declare module 'react-markdown/lib/complex-types' {
  import { ComponentType, ComponentProps, JSXElementConstructor } from 'react';

  export type TagName = keyof JSX.IntrinsicElements;
  
  // Fix the problematic type constraint issue
  export type NormalComponents = {
    [TagName in keyof JSX.IntrinsicElements]: 
      ComponentType<ComponentProps<TagName> & { node?: any }>;
  };
  
  export type SpecialComponents = {
    [Key in string]: ComponentType<any>;
  };
  
  export type ReactMarkdownNames = any;
  export type PluggableList = any[];
}

// Re-export react-markdown with corrected types
declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';
  
  export interface Options {
    children: string;
    className?: string;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    components?: Record<string, ComponentType<any>>;
    allowedElements?: string[];
    disallowedElements?: string[];
    unwrapDisallowed?: boolean;
    skipHtml?: boolean;
    includeElementIndex?: boolean;
    [key: string]: any;
  }

  export interface ReactMarkdownProps extends Options {}
  
  declare const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
