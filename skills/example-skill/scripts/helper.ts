# Helper script for example-skill

function exampleFunction(name: string): string {
  return `Hello, ${name}!`;
}

// Simple test
const result = exampleFunction('world');
if (result !== 'Hello, world!') {
  console.error('Test failed');
  process.exit(1);
}
console.log('Test passed:', result);
