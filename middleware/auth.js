// const jwt = require('jsonwebtoken');
// const db = require('../config/db');
// require('dotenv').config();

// /**
//  * Authentication middleware
//  * Verifies JWT token and attaches user to request
//  */
// module.exports = async (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.headers.authorization;
    
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Access denied. No token provided.',
//       });
//     }

//     const token = authHeader.split(' ')[1];

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

//     // Check if user still exists
//     const result = await db.query(
//       'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
//       [decoded.id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'User no longer exists.',
//       });
//     }

//     const user = result.rows[0];

//     // Check if user is active
//     if (!user.is_active) {
//       return res.status(403).json({
//         status: 'error',
//         message: 'Account is deactivated. Please contact administrator.',
//       });
//     }

//     // Attach user to request
//     req.user = {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//     };

//     next();
//   } catch (error) {
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Invalid token.',
//       });
//     }
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Token expired.',
//       });
//     }

//     console.error('Auth middleware error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Internal server error.',
//     });
//   }
// };

// const jwt = require('jsonwebtoken');
// const db = require('../config/db');
// require('dotenv').config();

// /**
//  * Authentication middleware
//  * Verifies JWT token and attaches user to request
//  */
// const authenticate = async (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.headers.authorization;
    
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Access denied. No token provided.',
//       });
//     }

//     const token = authHeader.split(' ')[1];

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

//     // Check if user still exists
//     const result = await db.query(
//       'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
//       [decoded.id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'User no longer exists.',
//       });
//     }

//     const user = result.rows[0];

//     // Check if user is active
//     if (!user.is_active) {
//       return res.status(403).json({
//         status: 'error',
//         message: 'Account is deactivated. Please contact administrator.',
//       });
//     }

//     // Attach user to request
//     req.user = {
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role: user.role,
//     };

//     next();
//   } catch (error) {
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Invalid token.',
//       });
//     }
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Token expired.',
//       });
//     }

//     console.error('Auth middleware error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Internal server error.',
//     });
//   }
// };

// module.exports = { authenticate };

const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Use a consistent secret
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
    
    console.log('🔑 Verifying token with secret length:', JWT_SECRET.length);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verified for user:', decoded.email);
    } catch (jwtError) {
      console.error('❌ Token verification failed:', jwtError.message);
      
      // Try with fallback secret
      try {
        decoded = jwt.verify(token, 'fallback_secret_key_for_development');
        console.log('✅ Token verified with fallback secret');
      } catch (fallbackError) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid or expired token.',
        });
      }
    }

    // Check if user still exists
    const result = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists.',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated.',
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error.',
    });
  }
};

module.exports = { authenticate };