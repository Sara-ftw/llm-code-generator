export function analyzeGeneratedProject(project) {
  const warnings = [];

  const packageFile = project.files.find((file) => file.path === 'package.json');
  const jsFiles = project.files.filter((file) => file.path.endsWith('.js'));
  const testFiles = project.files.filter((file) =>
    file.path.toLowerCase().includes('test')
  );
  for (const file of project.files) {
  if (!file.content.trim()) {
    warnings.push({
      type: 'file',
      severity: 'high',
      title: 'Empty File Generated',
      explanation: 'One of the generated files has no content, so the project may be incomplete.',
      suggestion: 'Regenerate or repair the project so every listed file contains useful code or documentation.',
      technicalDetail: `${file.path} is empty.`
    });
  }

  if (file.path.startsWith('/') || file.path.includes(':\\')) {
    warnings.push({
      type: 'security',
      severity: 'high',
      title: 'Unsafe File Path',
      explanation: 'A generated file uses an absolute path, which is unsafe when exporting or writing files.',
      suggestion: 'Use only relative file paths inside generated projects.',
      technicalDetail: `${file.path} is not a relative path.`
    });
  }

  if (file.path.includes('..')) {
    warnings.push({
      type: 'security',
      severity: 'high',
      title: 'Unsafe Parent Directory Path',
      explanation: 'A generated file path tries to move outside the project folder.',
      suggestion: 'Remove parent directory references from generated file paths.',
      technicalDetail: `${file.path} contains "..".`
    });
  }
}

if (project.setupInstructions.length === 0) {
  warnings.push({
    type: 'documentation',
    severity: 'medium',
    title: 'Setup Instructions Are Missing',
    explanation: 'The generated project does not explain how to install dependencies.',
    suggestion: 'Add setup instructions such as npm install or the equivalent for the selected language.',
    technicalDetail: 'setupInstructions is empty.'
  });
}

if (project.runInstructions.length === 0) {
  warnings.push({
    type: 'documentation',
    severity: 'medium',
    title: 'Run Instructions Are Missing',
    explanation: 'The generated project does not explain how to start or execute the application.',
    suggestion: 'Add clear run instructions for the generated project.',
    technicalDetail: 'runInstructions is empty.'
  });
}

  if (!project.files.some((file) => file.path.toLowerCase() === 'readme.md')) {
    warnings.push({
      type: 'documentation',
      severity: 'medium',
      title: 'Documentation Is Missing',
      explanation: 'The generated project does not include a README file, so users may not know how to install, run, or test it.',
      suggestion: 'Generate or add a README.md file with setup instructions, run commands, and usage examples.',
      technicalDetail: 'README.md was not found in the generated files.'
    });
  }

  if (testFiles.length === 0) {
    warnings.push({
      type: 'testing',
      severity: 'medium',
      title: 'No Tests Were Generated',
      explanation: 'The project was generated without test files, so there is no automatic way to verify that the code works.',
      suggestion: 'Ask the system to generate unit or integration tests for the main features.',
      technicalDetail: 'No file path containing "test" was found.'
    });
  }

  if (packageFile) {
    analyzePackageJson(packageFile, testFiles, warnings);
  }

  analyzeJavaScriptExports(jsFiles, testFiles, warnings);

  return warnings;
}

function analyzePackageJson(packageFile, testFiles, warnings) {
  try {
    const packageJson = JSON.parse(packageFile.content);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    if (!packageJson.scripts?.start && !packageJson.scripts?.dev) {
      warnings.push({
        type: 'metadata',
        severity: 'medium',
        title: 'Start Command Is Missing',
        explanation: 'The generated Node.js project does not define a clear command to run it.',
        suggestion: 'Add a start or dev script to package.json.',
        technicalDetail: 'package.json does not define scripts.start or scripts.dev.'
      });
    }

    if (testFiles.length > 0 && !packageJson.scripts?.test) {
      warnings.push({
        type: 'testing',
        severity: 'high',
        title: 'Test Command Is Missing',
        explanation: 'The project includes test files, but it does not define a command to run them.',
        suggestion: 'Add a test script to package.json, for example "test": "jest" or "test": "vitest".',
        technicalDetail: 'Test files exist, but package.json does not define scripts.test.'
      });
    }

    const allTestContent = testFiles.map((file) => file.content).join('\n');

    if (allTestContent.includes('supertest') && !dependencies.supertest) {
      warnings.push({
        type: 'dependency',
        severity: 'high',
        title: 'Testing Package Is Missing',
        explanation: 'The generated tests use a package for testing HTTP APIs, but that package is not listed as a dependency.',
        suggestion: 'Add supertest to devDependencies so the tests can run correctly.',
        technicalDetail: 'Tests use supertest, but supertest is not listed in package.json.'
      });
    }

    if (
      (allTestContent.includes('describe(') || allTestContent.includes('it(') || allTestContent.includes('expect(')) &&
      !dependencies.jest &&
      !dependencies.vitest
    ) {
      warnings.push({
        type: 'dependency',
        severity: 'high',
        title: 'Test Framework Is Missing',
        explanation: 'The generated tests use common test functions, but the project does not include a test framework.',
        suggestion: 'Add Jest or Vitest to devDependencies and configure the test script.',
        technicalDetail: 'Tests use describe/it/expect, but jest or vitest is not listed in package.json.'
      });
    }
  } catch {
    warnings.push({
      type: 'metadata',
      severity: 'high',
      title: 'Project Metadata Is Invalid',
      explanation: 'The package.json file could not be read as valid JSON.',
      suggestion: 'Regenerate package.json or fix its JSON syntax manually.',
      technicalDetail: 'package.json is not valid JSON.'
    });
  }
}

function analyzeJavaScriptExports(jsFiles, testFiles, warnings) {
  const allTestContent = testFiles.map((file) => file.content).join('\n');

  for (const testFile of testFiles) {
    const requiredAppMatch = testFile.content.match(/require\(['"]\.\/app['"]\)/);

    if (!requiredAppMatch) {
      continue;
    }

    const appFile = jsFiles.find((file) => file.path === 'app.js' || file.path.endsWith('/app.js'));

    if (!appFile) {
      warnings.push({
        type: 'structure',
        severity: 'high',
        title: 'Main App File Is Missing',
        explanation: 'A generated test expects an app.js file, but that file was not generated.',
        suggestion: 'Regenerate the project or create an app.js file that contains the Express app.',
        technicalDetail: 'A test imports ./app, but no app.js file was generated.'
      });
      continue;
    }

    if (!appFile.content.includes('module.exports') && !appFile.content.includes('export default')) {
      warnings.push({
        type: 'testing',
        severity: 'high',
        title: 'App Is Not Testable',
        explanation: 'The test files try to import the Express app, but the app file does not export it.',
        suggestion: 'Separate the Express app from the server startup and export the app for tests.',
        technicalDetail: 'A test imports ./app, but app.js does not export the Express app.'
      });
    }
  }

  if (allTestContent.includes('request(app)') && !allTestContent.includes("require('supertest')")) {
    warnings.push({
      type: 'testing',
      severity: 'medium',
      title: 'Test Import May Be Missing',
      explanation: 'The tests appear to use an HTTP test helper, but the import statement was not found.',
      suggestion: 'Check that supertest is imported at the top of the test file.',
      technicalDetail: 'Tests call request(app), but the supertest import was not detected.'
    });
  }
}