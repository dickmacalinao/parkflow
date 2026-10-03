import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { useAuth } from "../../context/AuthContext";
import { apiClient, getApiErrorMessage } from "../../lib/apiClient";

interface ProfileFields {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileFields>();

  useEffect(() => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
      avatarUrl: user?.avatarUrl ?? "",
    });
  }, [user, reset]);

  const onSubmit = async (fields: ProfileFields) => {
    setError(null);
    setSuccess(false);
    try {
      const { data } = await apiClient.patch("/users/me", {
        firstName: fields.firstName,
        lastName: fields.lastName,
        phone: fields.phone.trim() || null,
        avatarUrl: fields.avatarUrl.trim() || null,
      });
      setUser(data);
      setSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <Alert tone="destructive">{error}</Alert>}
            {success && <Alert tone="success">Profile updated.</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  required
                  {...register("firstName", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  required
                  {...register("lastName", { required: true })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register("phone")}
              />
            </div>
            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" type="url" {...register("avatarUrl")} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
