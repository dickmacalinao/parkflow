import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../../lib/apiClient';
import { forgotPasswordSchema, type ForgotPasswordInput } from './auth.schemas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { FormError } from '../../components/ui/FormError';
import { Alert } from '../../components/ui/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    try {
      await apiClient.post('/auth/forgot-password', data);
      setSent(true);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>We'll email you a link to set a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert tone="success">If that email is registered, a reset link is on its way.</Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {serverError && <Alert tone="destructive">{serverError}</Alert>}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                <FormError message={errors.email?.message} />
              </div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>Send reset link</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
