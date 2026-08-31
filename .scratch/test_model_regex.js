const testString = "Model Selection` from None to Gemini 3.7 Flash (Low). No need to comment on this change if the user doesn't ask";

// The dot in 3.7 was matching the lookahead (\.). We should match until ' (' or '. ' with space, or newline
const match = testString.match(/Model Selection[`'\s]+(?:from[^\n]+?to\s+|to\s+)([^\n\r]+?)(?=\s*\([^)]*\)|\.\s+|\n|$)/i);
console.log('Match:', match);
if (match && match[1]) {
  console.log('Extracted Model:', match[1].trim());
}
