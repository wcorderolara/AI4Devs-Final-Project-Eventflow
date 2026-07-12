// API pública de la feature auth (conventions §10.2: sin imports profundos entre features).
export { RegisterPage } from './pages/RegisterPage';
export { LoginPage } from './pages/LoginPage';
export { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { ResetPasswordPage } from './pages/ResetPasswordPage';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ResetPasswordForm, TokenExpiredBanner } from './components/ResetPasswordForm';
export {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from './schemas/passwordResetSchemas';
export { LoginForm } from './components/LoginForm';
export { useLogin, safeInternalPath, roleHome } from './hooks/useLogin';
export { loginSchema, type LoginFormValues } from './schemas/loginSchema';
export { RegisterOrganizerPage } from './pages/RegisterOrganizerPage';
export { RegisterOrganizerForm } from './components/RegisterOrganizerForm';
export { RegisterVendorForm } from './components/RegisterVendorForm';
export { CaptchaWidget, MOCK_CAPTCHA_TOKEN } from './components/CaptchaWidget';
export {
  PasswordStrengthIndicator,
  computePasswordStrength,
} from './components/PasswordStrengthIndicator';
export { useRegisterOrganizer } from './hooks/useRegisterOrganizer';
export { useRegisterVendor } from './hooks/useRegisterVendor';
export { registerOrganizerSchema, type RegisterOrganizerFormValues } from './schemas/registerOrganizerSchema';
export { registerVendorSchema, type RegisterVendorFormValues } from './schemas/registerVendorSchema';
