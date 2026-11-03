import { Button } from '@/components/ui/button';

export function SectionError({
  message,
  onRetry,
  pending,
}: {
  message: string;
  onRetry: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-lg border p-4 text-center">
      <p role="alert" className="text-sm">
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={pending}>
        {pending ? '불러오는 중…' : '다시 불러오기'}
      </Button>
    </div>
  );
}

export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-lg border p-5 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
