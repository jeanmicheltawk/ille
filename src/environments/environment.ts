// Point the frontend at your backend API.
//
// Default assumes the local Node server is running on port 3000.
// Leave apiUrl as '' (empty) to run the frontend on built-in MOCK data
// with no backend at all.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
