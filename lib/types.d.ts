declare module 'typo-js' {
  export default class Typo {
    constructor(dictionary?: string);
    check(word: string): boolean;
    suggest(word: string): string[];
  }
}

declare module 'write-good' {
  interface WriteGoodIssue {
    index?: number;
    offset?: number;
    reason?: string;
    ruleId?: string;
    text?: string;
    suggestion?: string;
  }

  function writeGood(text: string): WriteGoodIssue[];
  export = writeGood;
}

// Update the existing GrammarSuggestion type to include 'style'
export interface GrammarSuggestion {
  text: string;
  suggestion: string;
  start: number;
  end: number;
  type?: "spelling" | "grammar" | "style";
  description?: string;
} 