// /**
//  * Role-based authorization middleware
//  * @param {...string} roles - Allowed roles
//  * @returns {Function} Middleware function
//  */
// module.exports = (...roles) => {
//   return (req, res, next) => {
//     // Check if user exists (should be attached by auth middleware)
//     if (!req.user) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Authentication required.',
//       });
//     }

//     // Check if user's role is allowed
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({
//         status: 'error',
//         message: 'Access denied. Insufficient permissions.',
//       });
//     }

//     next();
//   };
// };

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be attached by auth middleware)
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
    }

    // Check if user's role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

module.exports = { authorize };