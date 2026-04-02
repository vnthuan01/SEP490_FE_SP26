import { toast } from 'sonner';

export function handleHookError(error: unknown, vietnameseMessage: string) {
  console.error(error);
  toast.error(vietnameseMessage);
}
