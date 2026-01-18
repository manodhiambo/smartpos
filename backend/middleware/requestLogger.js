/**
 * Request body logger middleware
 */
const logRequestBody = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('=== Request Details ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('======================');
  }
  next();
};

module.exports = { logRequestBody };
