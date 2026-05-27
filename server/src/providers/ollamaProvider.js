const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:3b';

export async function getOllamaModels() {
  const response = await fetch(`${ollamaBaseUrl}/api/tags`);

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  return data.models ?? [];
}

export async function generateCodeWithOllama(prompt) {
  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        num_ctx: 8192
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  return data.response;
}