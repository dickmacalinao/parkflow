import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../../lib/apiClient';
import { resetPasswordSchema, type ResetPasswordInput } from './auth.schemas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { FormError } from '../../components/ui/FormError';
import { Alert } from '../../components/ui/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, password: data.password });
      navigate('/login', { state: { resetSuccess: true } });
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'This reset link may have expired.'));
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Alert tone="destructive">Missing reset token. Request a new reset link.</Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>This will sign you out of every device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && <Alert tone="destructive">{serverError}</Alert>}
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...register('password')} />
              <FormError message={errors.password?.message} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              <FormError message={errors.confirmPassword?.message} />
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>Reset password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
