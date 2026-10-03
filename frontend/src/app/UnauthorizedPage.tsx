import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">403</h1>
      <p className="text-muted-foreground">You don't have permission to view this page.</p>
      <Link to="/dashboard"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
