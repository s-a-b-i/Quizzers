function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateRegister(req, res, next) {
  const { email, password } = req.body ?? {};
  const messages = [];

  if (!isValidEmail(email)) {
    messages.push('Invalid email address.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    messages.push('Password must be at least 8 characters.');
  }

  if (messages.length > 0) {
    return res.status(422).json({
      success: false,
      message: messages.join(' '),
    });
  }

  req.validatedRegister = {
    email: email.trim().toLowerCase(),
    password,
  };
  next();
}
