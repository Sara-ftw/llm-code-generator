
export function buildCodeGenerationPrompt(request) {
  return `
You are a code generation engine.

Return ONLY a valid JSON object.
Do not return Markdown.
Do not use code fences.
Do not use backticks.
Do not use comments inside JSON.
Do not use trailing commas.

Generate a complete ${request.language} project using ${request.framework}.

User requirements:
${request.description}

If the user request is short or vague, infer a reasonable beginner-friendly but complete version of the project.

The JSON object must have this exact shape:

{
  "summary": "Short explanation of the generated project.",
  "architecture": [
    "Architecture point"
  ],
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "Complete file content as a JSON string. Use \\n for line breaks."
    }
  ],
  "setupInstructions": [
    "Setup step"
  ],
  "runInstructions": [
    "Run step"
  ],
  "testInstructions": [
    "Test step"
  ]
}

Rules:
- All keys and string values must use double quotes.
- File content must be escaped as valid JSON strings.
- Every file path must be relative.
- Do not use absolute paths.
- Include all required source files.
- ${request.includeTests ? 'Include at least one meaningful test file.' : 'Do not include tests unless necessary.'}
- ${request.includeReadme ? 'Include a README.md file.' : 'Do not include a README unless necessary.'}
- Prefer clean, maintainable code.
`.trim();
}

export function buildProjectFixPrompt(project, warnings) {
  return `
You are a code repair engine.

Return ONLY a valid JSON object.
Do not return Markdown.
Do not use code fences.
Do not use backticks.
Do not use comments inside JSON.
Do not use trailing commas.

You will receive a generated software project and a quality report.
Fix the project according to the quality report.

Original project:
${JSON.stringify(project, null, 2)}

Quality report:
${JSON.stringify(warnings, null, 2)}

Return the corrected project using this exact JSON shape:

{
  "summary": "Short explanation of the corrected project.",
  "architecture": [
    "Architecture point"
  ],
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "Complete file content as a JSON string. Use \\n for line breaks."
    }
  ],
  "setupInstructions": [
    "Setup step"
  ],
  "runInstructions": [
    "Run step"
  ],
  "testInstructions": [
    "Test step"
  ]
}

Rules:
- Keep the user's original goal.
- Fix every issue mentioned in the quality report.
- Keep file paths relative.
- Return all files, not only changed files.
- Make sure package.json includes required scripts and dependencies.
- Make sure tests can import the app if needed.
- Prefer clean, maintainable code.
`.trim();
}