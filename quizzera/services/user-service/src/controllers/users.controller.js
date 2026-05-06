import mongoose from 'mongoose';
import * as userService from '../services/user.service.js';

export async function bootstrapProfile(req, res, next) {
  try {
    const user = await userService.ensureProfile(req.firebase);
    return res.status(200).json({
      success: true,
      data: { user: user.toObject({ flattenMaps: true }) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user.toObject({ flattenMaps: true });
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

export async function patchMe(req, res, next) {
  try {
    const user = await userService.patchPreferences(req.user, req.body.preferences);
    return res.status(200).json({
      success: true,
      data: { user: user.toObject({ flattenMaps: true }) },
    });
  } catch (err) {
    next(err);
  }
}

export async function patchMeOnboarding(req, res, next) {
  try {
    const user = await userService.patchOnboardingCompleted(req.user, req.body.onboardingCompleted);
    return res.status(200).json({
      success: true,
      data: { user: user.toObject({ flattenMaps: true }) },
    });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(_req, res, next) {
  try {
    const users = await userService.findAllUsers();
    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id.',
      });
    }

    const doc = await userService.findUserById(userId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: doc.toObject({ flattenMaps: true }) },
    });
  } catch (err) {
    next(err);
  }
}

export async function patchUserById(req, res, next) {
  try {
    const user = await userService.patchUserByAdmin(
      {
        firebaseUid: req.user.firebaseUid,
        email: req.user.email,
      },
      req.params.userId,
      req.validatedAdminUserPatch
    );
    return res.status(200).json({
      success: true,
      data: { user: user.toObject({ flattenMaps: true }) },
    });
  } catch (err) {
    next(err);
  }
}
