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
import { useProperties } from "../properties/properties.hooks";
import { ProfileFields } from "./profile.hooks";
import { type StoredUser } from "../../lib/authStorage";

export function ProfilePage({
  userProfile,
  isLoading,
}: {
  userProfile?: StoredUser;
  isLoading: boolean;
}) {
  const { user, setUser } = useAuth();
  const { data: properties } = useProperties();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const assignedProperty = properties?.find(
    (property) => property.id === user?.propertyId,
  );
  const showCondoAddress =
    ["TENANT", "PROPERTY_OWNER"].includes(
      userProfile?.role ?? user?.role ?? "",
    ) && assignedProperty?.type === "RESIDENTIAL_CONDOMINIUM";
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileFields>();

  useEffect(() => {
    if (!isLoading) {
      reset({
        firstName:
          (userProfile ? userProfile?.firstName : user?.firstName) ?? "",
        lastName: (userProfile ? userProfile?.lastName : user?.lastName) ?? "",
        phone: (userProfile ? userProfile?.phone : user?.phone) ?? "",
        avatarUrl:
          (userProfile ? userProfile?.avatarUrl : user?.avatarUrl) ?? "",
        buildingNo:
          (userProfile ? userProfile?.buildingNo : user?.buildingNo) ?? "",
        floorNo: (userProfile ? userProfile?.floorNo : user?.floorNo) ?? "",
        unitNo: (userProfile ? userProfile.unitNo : user?.unitNo) ?? "",
      });
    }
  }, [user, reset, userProfile, isLoading]);

  const onSubmit = async (fields: ProfileFields) => {
    setError(null);
    setSuccess(false);
    try {
      const profileUpdate = {
        firstName: fields.firstName,
        lastName: fields.lastName,
        phone: fields.phone.trim() || null,
        avatarUrl: fields.avatarUrl.trim() || null,
        ...(showCondoAddress && {
          buildingNo: fields.buildingNo.trim() || null,
          floorNo: fields.floorNo.trim() || null,
          unitNo: fields.unitNo.trim() || null,
        }),
      };
      if (!userProfile) {
        const { data } = await apiClient.patch("/users/me", profileUpdate);
        setUser(data);
      }
      setSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">
          {userProfile ? "User Profile" : "My Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <Alert tone="destructive">{error}</Alert>}
            {success && <Alert tone="success">Profile updated.</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  required
                  {...register("firstName", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
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
            {showCondoAddress && (
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="font-medium">Property address</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="buildingNo">Building No.</Label>
                    <Input
                      id="buildingNo"
                      required
                      {...register("buildingNo", { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="floorNo">Floor No.</Label>
                    <Input
                      id="floorNo"
                      required
                      {...register("floorNo", { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitNo">Unit No.</Label>
                    <Input
                      id="unitNo"
                      required
                      {...register("unitNo", { required: true })}
                    />
                  </div>
                </div>
              </div>
            )}
            {!userProfile && (
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSubmitting}>
                  Save Profile
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
