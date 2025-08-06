// ArtifactParser.ts
// Parses AI responses to extract artifacts (similar to Claude's artifact detection)

import { Artifact, ArtifactType } from '../types/artifacts';

export interface ParsedResponse {
  content: string;
  artifacts: Artifact[];
}

export class ArtifactParser {
  private static readonly ARTIFACT_PATTERNS = {
    // Code blocks with specific languages - more comprehensive detection like Claude
    codeBlock: /```(\w+)?\n?([\s\S]*?)```/g,
    
    // HTML content - enhanced detection
    html: /<(!DOCTYPE html|html|head|body|div|p|h[1-6]|script|style|link)/i,
    
    // React/JSX content - more comprehensive like Claude
    react: /(import\s+.*from\s+['"]react|export\s+default\s+function|const\s+\w+\s*=\s*\(\s*\)\s*=>|function\s+\w+\s*\(\s*\)\s*{|<\w+[\s\S]*?>|jsx|tsx)/,
    
    // SVG content
    svg: /<svg[\s\S]*?<\/svg>/gi,
    
    // CSS content - enhanced detection
    css: /(\.[a-zA-Z][\w-]*\s*{|#[a-zA-Z][\w-]*\s*{|@media|@keyframes|body\s*{|html\s*{|\.[\w-]+|#[\w-]+)/,
    
    // JSON content - enhanced detection
    json: /^\s*[\{\[]/,
    
    // SQL content
    sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|FROM|WHERE|JOIN)\b/i,
    
    // Python content - enhanced detection like Claude
    python: /\b(def\s+\w+|class\s+\w+|import\s+\w+|from\s+\w+\s+import|if\s+__name__|print\(|for\s+\w+\s+in|while\s+|try:|except:|with\s+open)/,
    
    // Streamlit content
    streamlit: /\b(st\.|streamlit|import streamlit)/,
    
    // Next.js content
    nextjs: /(import.*from\s+['"]next|export\s+default\s+function.*Page|getStaticProps|getServerSideProps|useRouter|useEffect)/,
    
    // Web app generation requests
    webAppRequest: /\b(create|generate|build)\s+(streamlit|html|react|nextjs|web)\s+(app|application|dashboard|site)/i,
    
    // Interactive content indicators - like Claude's detection
    interactive: /\b(interactive|clickable|button|input|form|chart|graph|visualization|dashboard)\b/i,
    
    // Complete HTML documents
    fullHtmlDoc: /<!DOCTYPE\s+html|<html[\s\S]*<\/html>/gi
  };

  /**
   * Parse an AI response and extract artifacts
   */
  static parseResponse(content: string): ParsedResponse {
    const artifacts: Artifact[] = [];
    let cleanedContent = content;

    // Extract code blocks first
    const codeBlocks = this.extractCodeBlocks(content);
    for (const block of codeBlocks) {
      const artifact = this.createArtifactFromCodeBlock(block);
      if (artifact) {
        artifacts.push(artifact);
        // Remove the code block from the content
        cleanedContent = cleanedContent.replace(block.raw, `\n[Artifact: ${artifact.title}]\n`);
      }
    }

    // Extract inline artifacts (HTML, SVG, etc.)
    const inlineArtifacts = this.extractInlineArtifacts(cleanedContent);
    artifacts.push(...inlineArtifacts);

    // Clean up content by removing extracted artifacts
    for (const artifact of inlineArtifacts) {
      cleanedContent = cleanedContent.replace(artifact.content, `\n[Artifact: ${artifact.title}]\n`);
    }

    return {
      content: cleanedContent.trim(),
      artifacts
    };
  }

  /**
   * Extract code blocks from markdown-style content
   */
  private static extractCodeBlocks(content: string): Array<{
    raw: string;
    language: string;
    code: string;
  }> {
    const blocks: Array<{ raw: string; language: string; code: string }> = [];
    const regex = /```(\w+)?\n?([\s\S]*?)```/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        raw: match[0],
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return blocks;
  }

  /**
   * Create an artifact from a code block
   */
  private static createArtifactFromCodeBlock(block: {
    raw: string;
    language: string;
    code: string;
  }): Artifact | null {
    const { language, code } = block;
    
    if (!code.trim()) return null;

    // Only create artifacts for substantial code (like Claude does)
    // Skip very short code snippets that are better displayed inline
    if (code.length < 50 && !this.shouldForceArtifact(code, language)) {
      return null;
    }

    const type = this.getArtifactTypeFromLanguage(language, code);
    if (!type) return null;

    const title = this.generateTitle(type, code);
    const id = this.generateId();

    return {
      id,
      type,
      title,
      content: code,
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        size: code.length,
        tags: [language],
        isInteractive: this.isInteractiveContent(code, type)
      }
    };
  }

  /**
   * Check if code should be forced into an artifact even if short
   */
  private static shouldForceArtifact(code: string, language: string): boolean {
    // Force artifact for HTML/SVG/CSS regardless of length
    const forceTypes = ['html', 'css', 'svg'];
    if (forceTypes.includes(language.toLowerCase())) return true;
    
    // Force for complete HTML documents
    if (this.ARTIFACT_PATTERNS.fullHtmlDoc.test(code)) return true;
    
    // Force for interactive content
    if (this.ARTIFACT_PATTERNS.interactive.test(code)) return true;
    
    // Force for React components (usually worth showing in artifact)
    if (this.ARTIFACT_PATTERNS.react.test(code)) return true;
    
    return false;
  }

  /**
   * Determine if content is interactive (like Claude's detection)
   */
  private static isInteractiveContent(code: string, type: ArtifactType): boolean {
    // HTML/React/Apps are potentially interactive
    if (['text/html', 'application/react', 'application/webapp', 'application/dashboard'].includes(type)) {
      return this.ARTIFACT_PATTERNS.interactive.test(code) || 
             code.includes('onclick') || 
             code.includes('addEventListener') ||
             code.includes('<button') ||
             code.includes('<input') ||
             code.includes('<form') ||
             code.includes('useState') ||
             code.includes('useEffect');
    }
    
    return false;
  }

  /**
   * Extract inline artifacts (HTML, SVG, etc.)
   */
  private static extractInlineArtifacts(content: string): Artifact[] {
    const artifacts: Artifact[] = [];

    // Extract SVG
    const svgMatches = content.match(this.ARTIFACT_PATTERNS.svg);
    if (svgMatches) {
      for (const svgContent of svgMatches) {
        artifacts.push({
          id: this.generateId(),
          type: 'image/svg+xml',
          title: 'SVG Image',
          content: svgContent,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            size: svgContent.length
          }
        });
      }
    }

    return artifacts;
  }

  /**
   * Determine artifact type from language and content
   */
  private static getArtifactTypeFromLanguage(language: string, code: string): ArtifactType | null {
    const lowerLang = language.toLowerCase();

    // Direct language mappings
    const languageMap: Record<string, ArtifactType> = {
      'html': 'text/html',
      'css': 'text/css',
      'javascript': 'text/javascript',
      'js': 'text/javascript',
      'jsx': 'application/react',
      'react': 'application/react',
      'python': 'text/python',
      'py': 'text/python',
      'sql': 'text/sql',
      'json': 'application/json',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      'markdown': 'text/markdown',
      'md': 'text/markdown',
      'svg': 'image/svg+xml',
      'streamlit': 'application/streamlit',
      'nextjs': 'application/nextjs',
      'webapp': 'application/webapp',
      'dashboard': 'application/dashboard'
    };

    if (languageMap[lowerLang]) {
      return languageMap[lowerLang];
    }

    // Content-based detection
    if (this.ARTIFACT_PATTERNS.streamlit.test(code)) {
      return 'application/streamlit';
    }
    
    if (this.ARTIFACT_PATTERNS.nextjs.test(code)) {
      return 'application/nextjs';
    }
    
    if (this.ARTIFACT_PATTERNS.html.test(code)) {
      return 'text/html';
    }
    
    if (this.ARTIFACT_PATTERNS.react.test(code)) {
      return 'application/react';
    }
    
    if (this.ARTIFACT_PATTERNS.css.test(code)) {
      return 'text/css';
    }
    
    if (this.ARTIFACT_PATTERNS.json.test(code.trim())) {
      try {
        JSON.parse(code);
        return 'application/json';
      } catch {
        // Not valid JSON
      }
    }
    
    if (this.ARTIFACT_PATTERNS.sql.test(code)) {
      return 'text/sql';
    }
    
    if (this.ARTIFACT_PATTERNS.python.test(code)) {
      return 'text/python';
    }

    // Default to JavaScript for unspecified code
    if (lowerLang === 'text' || !lowerLang) {
      return 'text/javascript';
    }

    return null;
  }

  /**
   * Generate a descriptive title for an artifact
   */
  private static generateTitle(type: ArtifactType, content: string): string {
    const typeNames: Record<ArtifactType, string> = {
      'text/html': 'HTML Document',
      'text/css': 'CSS Styles',
      'text/javascript': 'JavaScript Code',
      'application/react': 'React Component',
      'text/python': 'Python Script',
      'text/sql': 'SQL Query',
      'application/json': 'JSON Data',
      'text/yaml': 'YAML Configuration',
      'text/markdown': 'Markdown Document',
      'image/svg+xml': 'SVG Image',
      'application/streamlit': 'Streamlit App',
      'application/nextjs': 'Next.js Application',
      'application/webapp': 'Web Application',
      'application/dashboard': 'Interactive Dashboard'
    };

    const baseName = typeNames[type] || 'Code';

    // Try to extract a more specific title from content
    if (type === 'text/html') {
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1];
      }
    }

    if (type === 'application/react') {
      const componentMatch = content.match(/(?:function|const)\s+(\w+)/);
      if (componentMatch) {
        return `${componentMatch[1]} Component`;
      }
    }

    if (type === 'text/python') {
      const functionMatch = content.match(/def\s+(\w+)/);
      if (functionMatch) {
        return `${functionMatch[1]} Function`;
      }
    }

    return baseName;
  }

  /**
   * Generate a unique ID for an artifact
   */
  private static generateId(): string {
    return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if content contains potential artifacts
   */
  static containsArtifacts(content: string): boolean {
    return (
      this.ARTIFACT_PATTERNS.codeBlock.test(content) ||
      this.ARTIFACT_PATTERNS.html.test(content) ||
      this.ARTIFACT_PATTERNS.svg.test(content) ||
      this.ARTIFACT_PATTERNS.react.test(content) ||
      this.ARTIFACT_PATTERNS.fullHtmlDoc.test(content)
    );
  }

  /**
   * Test function to verify artifact parsing works correctly
   */
  static testArtifactParsing(): void {
    console.log('🧪 Testing Enhanced Artifact Parser...');
    
    const testCases = [
      {
        name: 'HTML Document',
        content: '```html\n<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body><h1>Hello World</h1></body>\n</html>\n```'
      },
      {
        name: 'React Component',
        content: '```jsx\nfunction Button() {\n  return <button onClick={() => alert("Hello!")}>Click me</button>;\n}\nexport default Button;\n```'
      },
      {
        name: 'CSS Styles',
        content: '```css\n.button {\n  background: blue;\n  color: white;\n  padding: 10px;\n}\n```'
      }
    ];
    
    testCases.forEach(test => {
      const result = this.parseResponse(test.content);
      console.log(`✅ ${test.name}: Found ${result.artifacts.length} artifacts`);
      result.artifacts.forEach(artifact => {
        console.log(`   - ${artifact.title} (${artifact.type}) - Interactive: ${artifact.metadata?.isInteractive}`);
      });
    });
    
    console.log('🎉 Artifact Parser testing complete!');
  }
}