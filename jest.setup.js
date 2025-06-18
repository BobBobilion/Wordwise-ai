// Mock browser globals
global.window = global;
global.document = {
  createElement: jest.fn(),
  getElementById: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

// Mock browser runtime
global.browser = {
  runtime: {
    getURL: jest.fn(() => ''),
  },
};

global.chrome = {
  runtime: {
    getURL: jest.fn(() => ''),
  },
}; 