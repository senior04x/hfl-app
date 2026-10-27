// Production backend API over HTTPS
export const API_BASE_URL = 'https://api.amatora.uz';

export const AUTH_API = {
  REQUEST_OTP: `${API_BASE_URL}/api/auth/request-otp`,
  VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  FIND_ACCOUNTS: `${API_BASE_URL}/api/auth/find-accounts`,
  DELETE_ACCOUNT: `${API_BASE_URL}/api/auth/delete-account`,
};
