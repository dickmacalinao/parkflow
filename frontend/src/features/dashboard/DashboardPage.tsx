import { Building2, CalendarCheck, CarFront, Clock3 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { useProperties, useReservationCounts } from "./dashboard.hooks";
import { Spinner } from "../../components/ui/Spinner";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const { data: counts, isLoading: loadingCounts } = useReservationCounts();

  const isStaff = [
    "SUPER_ADMIN",
    "PROPERTY_OWNER",
    "PROPERTY_MANAGER",
  ].includes(user?.role ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening across your parking operations.
        </p>
      </div>

      {loadingCounts ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isStaff && (
            <StatCard
              icon={Building2}
              label="Properties"
              value={properties?.length ?? 0}
            />
          )}
          <StatCard
            icon={Clock3}
            label="Pending reservations"
            value={counts?.pending ?? 0}
          />
          <StatCard
            icon={CalendarCheck}
            label="Approved reservations"
            value={counts?.approved ?? 0}
          />
          <StatCard
            icon={CarFront}
            label="Currently parked"
            value={counts?.checkedIn ?? 0}
          />
        </div>
      )}

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Your properties</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProperties ? (
              <Spinner />
            ) : properties && properties.length > 0 ? (
              <ul className="divide-y divide-border">
                {properties.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm capitalize text-muted-foreground">
                      {p.status.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No properties yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
