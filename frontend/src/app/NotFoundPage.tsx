import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Link to="/dashboard"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
