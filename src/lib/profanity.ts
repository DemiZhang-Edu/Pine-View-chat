export const BAD_WORDS = [
  'abuse', 'ass', 'asshole', 'bastard', 'bitch', 'cock', 'crap', 'cunt', 'damn', 'dick', 'fag', 'fuck', 'fucking', 'hell', 'motherfucker', 'piss', 'pussy', 'shit', 'slut', 'whore'
];

export function filterProfanity(text: string): { filteredText: string, triggeredWords: string[], hasProfanity: boolean } {
  let filteredText = text;
  const triggeredWords: string[] = [];
  
  BAD_WORDS.forEach(word => {
    // Escape word for regex
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    
    if (regex.test(text)) {
      triggeredWords.push(word);
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    }
  });
  
  return {
    filteredText,
    triggeredWords,
    hasProfanity: triggeredWords.length > 0
  };
}
