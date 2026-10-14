const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please log in to access this page.');
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash('error', 'Please log in to access this page.');
      return res.redirect('/auth/login');
    }
    if (!roles.includes(req.session.user.role) && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to access that resource.');
      return res.redirect('/dashboard');
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
