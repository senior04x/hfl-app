// Backend API base URL - Railway Real Server
export const API_BASE_URL = 'https://web-production-eaa31.up.railway.app';

export const AUTH_API = {
  REQUEST_OTP: `${API_BASE_URL}/api/auth/request-otp`,
  VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  FIND_ACCOUNTS: `${API_BASE_URL}/api/auth/find-accounts`,
};
