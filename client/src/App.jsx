import { useState } from 'react';
import './App.css';

function App() {
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [framework, setFramework] = useState('Express');
  const [includeTests, setIncludeTests] = useState(true);
  const [includeReadme, setIncludeReadme] = useState(true);
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [isFixing, setIsFixing] = useState(false);

  async function handleGenerate(event) {
    event.preventDefault();

    setIsLoading(true);
    setError('');
    setProject(null);
    setWarnings([]);

    try {
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          language,
          framework,
          includeTests,
          includeReadme
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage =
        data.details?.fieldErrors?.description?.[0] ||
        data.message ||
        data.error ||
        'Generation failed';
        
        throw new Error(validationMessage);
      }

      setProject(data.project);
      setWarnings(data.warnings || []);
    } catch (generationError) {
      setError(generationError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFixProject() {
  if (!project || warnings.length === 0) {
    return;
  }

  setIsFixing(true);
  setError('');

  try {
    const response = await fetch('http://localhost:3001/api/fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project,
        warnings
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Fix failed');
    }

    setProject(data.project);
    setWarnings(data.warnings || []);
  } catch (fixError) {
    setError(fixError.message);
  } finally {
    setIsFixing(false);
  }
}
  
  async function handleDownloadProject() {
  if (!project) {
    return;
  }

  setError('');

  try {
    const response = await fetch('http://localhost:3001/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ project })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || 'Download failed');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'generated-project.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (downloadError) {
    setError(downloadError.message);
  }
}

  return (
    <main className="app">
      <section className="panel">
        <div className="app-header">
          <div>
            <p className="eyebrow">Local LLM platform</p>
            <h1>LLM Code Generator</h1>
            <p>
              Generate, inspect, repair, and export source code projects using Ollama.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="form">
          <label>
            Project request
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: Create an Express API for managing books with CRUD routes, validation, tests, and README."
              rows="7"
            />
          </label>

          <label>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>JavaScript</option>
              <option>Python</option>
              <option>Java</option>
            </select>
          </label>

          <label>
            Framework
            <select value={framework} onChange={(event) => setFramework(event.target.value)}>
              <option>Express</option>
              <option>React</option>
              <option>FastAPI</option>
              <option>Flask</option>
              <option>Spring Boot</option>
            </select>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeTests}
              onChange={(event) => setIncludeTests(event.target.checked)}
            />
            Include tests
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeReadme}
              onChange={(event) => setIncludeReadme(event.target.checked)}
            />
            Include README
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Code'}
          </button>
          <p className="form-note">
           The backend validates the model response, analyzes quality issues, and lets you repair warnings manually.
          </p>
        </form>
      </section>

      <section className="panel output">
        <h2>Generated Output</h2>

        {error && <div className="error">{error}</div>}

        {warnings.length > 0 && (
          <div className="warnings">
            <div className="quality-summary">
              <strong>{warnings.length} warning{warnings.length > 1 ? 's' : ''} found</strong>
              <p>
                Review the quality report before downloading or use Fix Project to ask the model for a corrected version.
              </p>
            </div>
            
            <div className="quality-header">
              
            <h3>Quality Report</h3>

            <button type="button" onClick={handleFixProject} disabled={isFixing}>
              {isFixing ? 'Fixing project...' : 'Fix Project'}
            </button>
            </div>
            
            {warnings.map((warning, index) => (
              <article className={`warning ${warning.severity}`} key={`${warning.type}-${index}`}>
                <div className="warning-header">
                  <strong>{warning.title}</strong>
                  <span>{warning.severity}</span>
                </div>
                
                <p>{warning.explanation}</p>
                
                <div className="suggestion">
                  <strong>Suggested action:</strong>
                  <p>{warning.suggestion}</p>
                </div>
                  
                <details>
                  <summary>Technical detail</summary>
                  <p>{warning.technicalDetail}</p>
                </details>
              </article>
            ))}
          </div>
        )}

        {project ? (
          <div className="generated-project">
            <div className="project-toolbar">
              <div>
                <h3>{project.summary}</h3>
                </div>

              <button type="button" onClick={handleDownloadProject}>
                Download ZIP
              </button>
            </div>
            
            <h4>Architecture</h4>
            <ul>
              {project.architecture.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            
            <h4>Files</h4>
            {project.files.map((file) => (
              <div className="file-block" key={file.path}>
                <div className="file-name">
                  <span>{file.path}</span>
                  <small>{file.content.split('\n').length} lines</small>
                </div>
                <pre>{file.content}</pre>
              </div>
            ))}
            
            <h4>Setup</h4>
            
            <ul>
              {project.setupInstructions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            
            <h4>Run</h4>
            
            <ul>
              {project.runInstructions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

             <h4>Test</h4>
            <ul>
            {project.testInstructions.map((item) => (
              <li key={item}>{item}</li>
            ))}
            </ul>
          </div>
        ) : (

          <div className="empty-state">
            <h3>No project generated yet</h3>
            <p>
              Describe a project, choose a language and framework, then generate a structured project.
            </p>
            
          </div>
        )}
      </section>
    </main>
  );
}


export default App;