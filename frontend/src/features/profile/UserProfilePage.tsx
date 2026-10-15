import { ProfilePage } from "./ProfilePage";
import { useParams } from "react-router-dom";
import { useProfile } from "./profile.hooks";

export function UserProfilePage() {
  const { userId } = useParams();
  const { data: userProfile, isLoading } = useProfile(userId);

  return <ProfilePage userProfile={userProfile} isLoading={isLoading} />;
}
