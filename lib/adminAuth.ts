const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Alpha@2088';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'money-qa-admin-token-2024';

export function validateAdminAuth(request: Request): boolean {
  const auth = request.headers.get('Authorization');
  return auth === `Bearer ${ADMIN_TOKEN}`;
}

export function checkLogin(password: string): { token: string } | null {
  if (password === ADMIN_PASSWORD) {
    return { token: ADMIN_TOKEN };
  }
  return null;
}
