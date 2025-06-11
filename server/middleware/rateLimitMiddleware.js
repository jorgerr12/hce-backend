// server/middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

// Rate limiting general para la API
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Máximo 1000 requests por ventana de tiempo por IP
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Incluir headers de rate limit en la respuesta
  legacyHeaders: false, // Deshabilitar headers legacy
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Intenta nuevamente más tarde.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting estricto para login (protección contra ataques de fuerza bruta)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos de login por IP en 15 minutos
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    error: 'Demasiados intentos de login',
    message: 'Has excedido el límite de intentos de login. Intenta nuevamente en 15 minutos.',
    retryAfter: '15 minutos'
  },
  handler: (req, res) => {
    console.warn(`Rate limit excedido para login desde IP: ${req.ip}`);
    res.status(429).json({
      error: 'Demasiados intentos de login',
      message: 'Has excedido el límite de intentos de login. Intenta nuevamente en 15 minutos.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting para operaciones de creación (más restrictivo)
const createRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 50, // Máximo 50 creaciones por IP en 5 minutos
  message: {
    error: 'Demasiadas operaciones de creación',
    message: 'Has excedido el límite de operaciones de creación. Intenta nuevamente en 5 minutos.',
    retryAfter: '5 minutos'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas operaciones de creación',
      message: 'Has excedido el límite de operaciones de creación. Intenta nuevamente más tarde.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting para búsquedas (prevenir scraping)
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 búsquedas por IP por minuto
  message: {
    error: 'Demasiadas búsquedas',
    message: 'Has excedido el límite de búsquedas. Intenta nuevamente en 1 minuto.',
    retryAfter: '1 minuto'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas búsquedas',
      message: 'Has excedido el límite de búsquedas. Intenta nuevamente más tarde.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting para APIs externas (webhooks)
const externalApiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // Máximo 200 requests por IP por minuto para APIs externas
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests from this IP. Please try again later.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Middleware personalizado para rate limiting por usuario autenticado
const createUserRateLimit = (maxRequests, windowMs, message) => {
  const userLimits = new Map();
  
  return (req, res, next) => {
    // Si no hay usuario autenticado, usar rate limiting por IP
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.userId;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Obtener o crear registro para el usuario
    if (!userLimits.has(userId)) {
      userLimits.set(userId, []);
    }
    
    const userRequests = userLimits.get(userId);
    
    // Limpiar requests antiguos
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Verificar límite
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Límite de usuario excedido',
        message: message || 'Has excedido tu límite personal de solicitudes.',
        retryAfter: Math.round((validRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Agregar request actual
    validRequests.push(now);
    userLimits.set(userId, validRequests);
    
    // Limpiar usuarios inactivos periódicamente
    if (Math.random() < 0.01) { // 1% de probabilidad
      cleanupInactiveUsers(userLimits, windowMs);
    }
    
    next();
  };
};

// Función para limpiar usuarios inactivos
const cleanupInactiveUsers = (userLimits, windowMs) => {
  const now = Date.now();
  const cutoff = now - windowMs * 2; // Limpiar usuarios inactivos por más del doble del tiempo de ventana
  
  for (const [userId, requests] of userLimits.entries()) {
    const recentRequests = requests.filter(timestamp => timestamp > cutoff);
    if (recentRequests.length === 0) {
      userLimits.delete(userId);
    } else {
      userLimits.set(userId, recentRequests);
    }
  }
};

// Rate limiting específico para médicos (más permisivo)
const doctorRateLimit = createUserRateLimit(500, 15 * 60 * 1000, 'Has excedido tu límite de solicitudes como médico.');

// Rate limiting para administradores (muy permisivo)
const adminRateLimit = createUserRateLimit(1000, 15 * 60 * 1000, 'Has excedido tu límite de solicitudes como administrador.');

module.exports = {
  generalRateLimit,
  loginRateLimit,
  createRateLimit,
  searchRateLimit,
  externalApiRateLimit,
  doctorRateLimit,
  adminRateLimit,
  createUserRateLimit
};

