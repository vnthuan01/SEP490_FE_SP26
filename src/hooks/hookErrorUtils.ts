import { toast } from 'sonner';
import { parseApiError } from '@/lib/apiErrors';

export function handleHookError(error: unknown, vietnameseMessage: string) {
  console.error(error);
  const parsed = parseApiError(error, vietnameseMessage);
  toast.error(parsed.message);
}
