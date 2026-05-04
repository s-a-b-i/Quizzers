import { Router } from 'express';
import {
  google,
  guest,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js';
import { checkAccountStatus } from '../middleware/checkAccountStatus.js';
import { validateGoogleAuth } from '../middleware/validateGoogleAuth.js';
import { validateLogin } from '../middleware/validateLogin.js';
import { validateRefreshToken } from '../middleware/validateRefreshToken.js';
import { validateRegister } from '../middleware/validateRegister.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', validateGoogleAuth, google);
router.post('/guest', guest);
router.post('/refresh', validateRefreshToken, refresh);
router.post('/logout', verifyToken, checkAccountStatus, logout);

export default router;
