declare module 'typo-js' {
  export default class Typo {
    constructor(dictionary?: string);
    check(word: string): boolean;
    suggest(word: string): string[];
  }
} 