/**
 * tokenBridge.ts
 * Cầu nối nhỏ để interceptor axios (ngoài React) có thể thông báo
 * cho AuthContext cập nhật lại token state sau khi refresh thành công.
 */

type TokenUpdateCallback = (accessToken: string | null, refreshToken?: string | null) => void;

let _callback: TokenUpdateCallback | null = null;

/** Đăng ký callback – gọi trong AuthProvider (useEffect) */
export function registerTokenUpdateCallback(cb: TokenUpdateCallback): void {
  _callback = cb;
}

/** Hủy đăng ký – gọi trong cleanup của useEffect */
export function unregisterTokenUpdateCallback(): void {
  _callback = null;
}

/** Gọi sau khi refresh token thành công trong interceptor */
export function notifyTokenUpdate(accessToken: string | null, refreshToken?: string | null): void {
  _callback?.(accessToken, refreshToken);
}
