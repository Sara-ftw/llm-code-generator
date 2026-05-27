export function parseGeneratedProject(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('The model did not return valid JSON.');
    }

    const possibleJson = rawText.slice(start, end + 1);
    return JSON.parse(possibleJson);
  }
}