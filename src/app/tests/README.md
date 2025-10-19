// Command for installing vitest:
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

// Command for installing the vitest/coverage-v8 dependency (required to run coverage)
npm i -D @vitest/coverage-v8

// To run tests
npm run test

// To run tests w/ coverage
npm run test:coverage

// How to create a test
1) Create a file in 'src/app/tests/' that has the file extension .test.tsx (instead of .tsx)
2) Follow the format of home.test.tsx, our ultra-trivial test case that checks if our landing page has absolutely imploded
