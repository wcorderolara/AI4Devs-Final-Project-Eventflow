// API pública de la feature profile (US-006 / US-007). Sin imports profundos entre features.
export { ProfilePage } from './pages/ProfilePage';
export { ProfileForm } from './components/ProfileForm';
export { ChangePasswordForm } from './components/ChangePasswordForm';
export { PreferredLanguageSelector } from './components/PreferredLanguageSelector';
export { useMyProfile, PROFILE_QUERY_KEY } from './hooks/useMyProfile';
export { useUpdateProfile } from './hooks/useUpdateProfile';
export { useUpdatePreferredLanguage } from './hooks/useUpdatePreferredLanguage';
export { useChangePassword } from './hooks/useChangePassword';
export { profileApi } from './api/profileApi';
export { profileSchema, PREFERRED_LANGUAGES, type ProfileFormValues } from './schemas/profileSchema';
export {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from './schemas/changePasswordSchema';
export type {
  UserProfile,
  PreferredLanguage,
  UpdateProfileRequestDTO,
  ChangePasswordRequestDTO,
} from './api/profileApi.types';
