import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';

import { useAuthContext } from '@/components/provider/auth/AuthProvider';
import { getUserRoleFromToken } from '@/lib/jwt';
import { roleRoutes } from '@/constants/roleRoutes';
import type { UserRoleType } from '@/enums/UserRole';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

type LoginFormValues = {
  email: string;
  password: string;
};

function LoginPage() {
  const navigate = useNavigate();
  const { login, phoneLogin } = useAuthContext();
  const authDebug = import.meta.env.DEV;

  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState('');

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setRootError('');

    try {
      if (authDebug) {
        console.log('[AUTH_DEBUG][LoginPage] submit', {
          identity: values.email,
          mode: /^\d+$/.test(values.email) ? 'phone' : 'email',
        });
      }

      let res;
      const isPhoneNumber = /^\d+$/.test(values.email);
      if (isPhoneNumber) {
        res = await phoneLogin({ phoneNumber: values.email, password: values.password });
      } else {
        res = await login(values);
      }

      const accessToken = res?.data?.accessToken || (res as any)?.data?.data?.accessToken || '';
      const role = getUserRoleFromToken(accessToken);

      if (authDebug) {
        console.log('[AUTH_DEBUG][LoginPage] login success', {
          hasAccessToken: !!accessToken,
          roleFromToken: role,
          responseShapeKeys: Object.keys((res as any)?.data || {}),
        });
      }

      if (
        !role ||
        !roleRoutes[role as UserRoleType] ||
        roleRoutes[role as UserRoleType] === '/login'
      ) {
        setRootError('Tài khoản của bạn không có quyền truy cập hệ thống.');
        return;
      }

      const normalizedRole =
        role === 'Coordinator' ? 'Moderator' : role === 'moderator' ? 'Moderator' : role;

      const targetRoute =
        roleRoutes[normalizedRole as UserRoleType] || '/portal/coordinator/dashboard';

      if (authDebug) {
        console.log('[AUTH_DEBUG][LoginPage] navigate', {
          normalizedRole,
          targetRoute,
        });
      }

      // Force full reload so AuthProvider rehydrates from fresh cookie token.
      window.location.replace(targetRoute);
      return;
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 401 || code === 'AUTH_INVALID_CREDENTIALS') {
        setRootError('Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại sau.');
      } else if (status === 400) {
        setRootError('Tài khoản đã bị khóa.');
      } else {
        setRootError('Đăng nhập thất bại. Vui lòng thử lại.');
      }

      if (authDebug) {
        console.log('[AUTH_DEBUG][LoginPage] login error', {
          status: err?.response?.status,
          data: err?.response?.data,
        });
      }
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-background font-display">
      {/* ===== HEADER ===== */}
      <header className="border-b bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">flood</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            VN Relief
            <span className="hidden sm:inline font-normal text-muted-foreground">
              {' '}
              | Hệ thống Điều phối Cứu trợ & Cứu hộ
            </span>
          </h1>
        </div>

        <Link to="#" className="text-sm font-medium text-muted-foreground hover:text-primary">
          Trợ giúp
        </Link>
      </header>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decor */}
        <div
          className="
          absolute inset-0 pointer-events-none
          bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAO6tUYI2zyzqOE7gRminOx08U9q-7yhhwDDv4fdx0EfgD5-dKTnC-LRh0w422OQkWNL-aGaFRUip1f8O5IMnpHb4kQuywlKTG53rEiSwvVc2-PmdpbxVC6Ab1wWwVG7vB0VpWKAYPaMtOYLt_ve02NZ40vRM3_CmoeUnCRgqtUbBjhTlCDLGJjRCZ3O_ho30Crr0sEft-i2EkKkv5vqZUTiP7PVKP3b0Yn2Qy6sEaAsA12CnT7S-K8x27_XEjHWWHbSKXcr3bHdog')]
          bg-cover bg-center

          /* Default / Light theme */
          brightness-100 contrast-100 opacity-10

          /* Dark theme */
          dark:brightness-75 dark:contrast-90 dark:opacity-06
        "
        />
        {/* ===== LOGIN CARD ===== */}
        <div className="relative z-10 w-full max-w-[460px] bg-surface rounded-2xl shadow-xl border overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <h2 className="text-3xl font-black tracking-tight mb-2">Đăng nhập hệ thống</h2>
            <p className="text-muted-foreground">Hệ thống điều phối cứu trợ thiên tai thông minh</p>
          </div>
          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLogin)}
              className="px-8 pb-10 flex flex-col gap-5"
            >
              {rootError && (
                <p className="text-sm text-destructive text-center font-medium">{rootError}</p>
              )}

              {/* Email / Phone */}
              <FormField
                control={form.control}
                name="email"
                rules={{ required: 'Vui lòng nhập số điện thoại hoặc email' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại / Email</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập số điện thoại hoặc email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'Vui lòng nhập mật khẩu' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Nhập mật khẩu"
                          className="pr-10"
                        />
                        {showPassword ? (
                          <EyeOffIcon
                            onClick={() => setShowPassword(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground cursor-pointer"
                          />
                        ) : (
                          <EyeIcon
                            onClick={() => setShowPassword(true)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground cursor-pointer"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <div className="text-right">
                      <Link to="#" className="text-sm font-medium text-primary hover:underline">
                        Quên mật khẩu?
                      </Link>
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button type="submit" variant="primary" size="lg" className="mt-2">
                <span>Đăng nhập</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Button>
            </form>
          </Form>
          {/* Footer */}
          <div className="px-8 pb-8 border-t text-center">
            <p className="text-sm text-muted-foreground mt-6">
              Gặp sự cố đăng nhập? Liên hệ{' '}
              <a href="tel:19001234" className="font-bold text-foreground hover:text-primary">
                1900-1234
              </a>
            </p>
          </div>
          {/* Bottom strip */}
          <div
            className="
            h-1.5
            bg-gradient-to-r
            from-red-600 from-0%
            via-red-600 via-15%
            to-primary to-100%
            bg-[length:200%_200%]
            animate-[gradientShift_3s_ease-in-out_infinite]
          "
          />
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
