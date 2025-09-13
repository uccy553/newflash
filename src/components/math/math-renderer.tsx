'use client';

// NOTE: This component is a placeholder.
// To render complex mathematical equations, a library like 'mathjax-react' or 'katex' is recommended.
// The user request mentioned 'React-MathJax2', but it's not in package.json.
// If you install a MathJax library, update this component to use it.
// Example usage with mathjax-react (after `npm install mathjax-react`):
/*
import { MathJax, MathJaxContext } from "mathjax-react";

const config = {
  loader: { load: ["input/tex", "output/svg"] },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
  },
  svg: { fontCache: 'global' }
};

export function MathRenderer({ equation }: { equation: string }) {
  if (!equation) return null;

  return (
    <MathJaxContext version={3} config={config}>
      <MathJax inline={isInline(equation)}>{`\\(${equation}\\)`}</MathJax> 
    </MathJaxContext> // adjust inline/display based on equation format
  );
}

function isInline(equation: string): boolean {
  // Simple check, can be improved
  return !equation.includes("\\displaystyle");
}
*/

interface MathRendererProps {
  equation: string;
  className?: string;
}

export function MathRenderer({ equation, className }: MathRendererProps) {
  if (!equation) return null;

  // Simple text rendering as a fallback
  return (
    <div className={`p-2 border rounded-md bg-muted/50 text-sm overflow-x-auto ${className}`}>
      <code className="font-mono">{equation}</code>
      <p className="text-xs text-muted-foreground mt-1">(Equation: {equation} - MathJax rendering not yet configured)</p>
    </div>
  );
}
