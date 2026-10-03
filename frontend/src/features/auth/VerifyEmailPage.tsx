import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../../lib/apiClient';
import { Alert } from '../../components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    apiClient
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(getApiErrorMessage(err, 'This link may have expired.'));
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && <Spinner className="mx-auto" />}
          {status === 'success' && (
            <>
              <Alert tone="success">Your email is verified. You can log in now.</Alert>
              <Link to="/login" className="text-sm text-primary hover:underline">Go to login</Link>
            </>
          )}
          {status === 'error' && <Alert tone="destructive">{message}</Alert>}
        </CardContent>
      </Card>
    </div>
  );
}
