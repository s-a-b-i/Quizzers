import * as authService from '../services/auth.service.js';

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.validatedRefresh;
    const tokens = await authService.refreshIdToken(refreshToken);
    return res.status(200).json({
      success: true,
      data: {
        idToken: tokens.idToken,
        ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
        ...(tokens.expiresIn != null && { expiresIn: tokens.expiresIn }),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.revokeUserRefreshTokens(req.user.firebaseUid);
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validatedLogin;
    const result = await authService.loginWithEmailPassword({ email, password });
    return res.status(200).json({
      success: true,
      data: {
        userId: result.user._id.toString(),
        role: result.user.role,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        ...(result.expiresIn != null && { expiresIn: result.expiresIn }),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function guest(req, res, next) {
  try {
    const result = await authService.createGuestSession();
    return res.status(201).json({
      success: true,
      data: {
        userId: result.user._id.toString(),
        role: result.user.role,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        ...(result.expiresIn != null && { expiresIn: result.expiresIn }),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function google(req, res, next) {
  try {
    const { idToken } = req.validatedGoogle;
    const user = await authService.signInWithGoogleIdToken(idToken);
    return res.status(200).json({
      success: true,
      data: {
        userId: user._id.toString(),
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const { email, password } = req.validatedRegister;
    const user = await authService.registerUser({ email, password });
    return res.status(201).json({
      success: true,
      data: { userId: user._id.toString() },
    });
  } catch (err) {
    next(err);
  }
}
