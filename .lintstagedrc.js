module.exports = {
  // js not included as it uses require import
  '*.ts': [
    'eslint --fix',
    (filenames) => {
      // Run tests related to changed files only if they are spec files
      const testFiles = filenames
        .filter((file) => file.endsWith('.spec.ts'))
        .map((file) => `"${file}"`)
        .join(' ');

      if (testFiles.length > 0) {
        return `jest ${testFiles} --findRelatedTests --passWithNoTests`;
      }

      // For non-test files, find potentially affected tests
      const sourceFiles = filenames
        .filter((file) => !file.endsWith('.spec.ts') && file.endsWith('.ts'))
        .map((file) => `"${file}"`)
        .join(' ');

      if (sourceFiles.length > 0) {
        return `jest --findRelatedTests ${sourceFiles} --passWithNoTests`;
      }

      return 'echo "No test files to run"';
    },
  ],
};
