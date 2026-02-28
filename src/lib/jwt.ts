export function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function getUserRoleFromToken(token: string): string | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  return decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
}

export function getUserIdFromToken(token: string): string | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  return decoded.sub || null;
}

export function getUserEmailFromToken(token: string): string | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  return decoded.email || null;
}

export function getUserNameFromToken(token: string): string | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  // Based on your token payload: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "vnthuan02"
  return decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || null;
}
