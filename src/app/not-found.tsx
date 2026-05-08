import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4">
      <div className="text-center">
        <div className="font-display text-7xl font-bold gradient-text">404</div>
        <p className="mt-3 text-muted">This square doesn't exist on the board.</p>
        <Link href="/" className="inline-block mt-6">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
