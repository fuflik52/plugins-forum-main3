import React, { useEffect, useRef } from "react";
import Prism from "prismjs";

// Импортируем нужные языки и темы
import "prismjs/components/prism-csharp";
import "prismjs/themes/prism-tomorrow.css";

interface CodeHighlightProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  language = "csharp",
  className = "",
}) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <pre className={`language-${language} ${className}`}>
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};
