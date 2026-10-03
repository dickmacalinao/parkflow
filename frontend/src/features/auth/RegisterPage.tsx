import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "../../lib/apiClient";
import { registerSchema, type RegisterInput } from "./auth.schemas";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { FormError } from "../../components/ui/FormError";
import { Alert } from "../../components/ui/Alert";
import { Select } from "../../components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["available-properties"],
    queryFn: async () =>
      (await apiClient.get("/properties/available")).data as Array<{
        id: string;
        name: string;
        city: string;
        state: string;
      }>,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/register", { ...data, role: "TENANT" });
      setDone(true);
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Could not create your account."));
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a verification link. Click it to activate your account,
              then log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            For tenants, residents, and visitors reserving parking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {serverError && <Alert tone="destructive">{serverError}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...register("firstName")} />
                <FormError message={errors.firstName?.message} />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...register("lastName")} />
                <FormError message={errors.lastName?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              <FormError message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="propertyId">Property</Label>
              <Select
                id="propertyId"
                disabled={propertiesLoading}
                {...register("propertyId")}
              >
                <option value="">
                  {propertiesLoading
                    ? "Loading properties..."
                    : "Choose your property"}
                </option>
                {properties?.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}, {property.city}, {property.state}
                  </option>
                ))}
              </Select>
              <FormError message={errors.propertyId?.message} />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              <FormError message={errors.password?.message} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
              />
              <FormError message={errors.confirmPassword?.message} />
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
