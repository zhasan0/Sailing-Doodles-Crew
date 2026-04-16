// Basic profanity/objectionable content filter
// Apple requires apps to filter objectionable material submitted by users

const BLOCKED_TERMS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'nigger', 'nigga',
  'faggot', 'retard', 'whore', 'slut', 'bastard', 'motherfucker',
  'cocksucker', 'fuckoff', 'fuk', 'fck', 'sh1t', 'b1tch',
];

export function containsProfanity(text) {
  if (!text) return false;
  // Normalize: lowercase, replace common substitutions
  const cleaned = text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/[^a-z\s]/g, ' ');
  return BLOCKED_TERMS.some(term => new RegExp(`\\b${term}\\b`).test(cleaned));
}

export const PROFANITY_ERROR = 'Your message contains inappropriate content and cannot be submitted. Please review our community guidelines.';