/* ══════════════════════════════════════════════════════════
   utils/asyncHandler.js
   Wraps an async Express route handler so any rejected promise
   is forwarded to next(err) automatically.
   Eliminates the need for try/catch blocks in every route.

   Usage:
     router.get('/route', asyncHandler(async (req, res) => {
       const data = await SomeService.getData();
       res.json(data);
     }));
══════════════════════════════════════════════════════════ */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
