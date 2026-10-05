import { useState } from "react";
import { useForm } from "react-hook-form";
import { useProperties } from "../properties/properties.hooks";
import {
  useCreateVisitorPass,
  useVisitorPasses,
  type CreateVisitorPassInput,
} from "./visitors.hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { getApiErrorMessage } from "../../lib/apiClient";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";

export function VisitorPassesPage() {
  const { data: properties } = useProperties({ status: "ACTIVE" });
  const [page, setPage] = useState(1);
  const { data, isLoading } = useVisitorPasses({ page });
  const passes = data?.rows;
  const create = useCreateVisitorPass();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateVisitorPassInput>();

  const onSubmit = async (data: CreateVisitorPassInput) => {
    setError(null);
    try {
      await create.mutateAsync({
        ...data,
        validFrom: new Date(data.validFrom).toISOString(),
        validTo: new Date(data.validTo).toISOString(),
      });
      reset();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Visitor Passes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invite a guest</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-3 md:grid-cols-2"
          >
            {error && (
              <Alert tone="destructive" className="md:col-span-2">
                {error}
              </Alert>
            )}
            <div>
              <Label htmlFor="propertyId">Property</Label>
              <Select
                id="propertyId"
                {...register("propertyId", { required: true })}
              >
                <option value="">Select a property</option>
                {properties?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="visitorName">Visitor name</Label>
              <Input
                id="visitorName"
                {...register("visitorName", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="visitorPhone">Visitor phone</Label>
              <Input id="visitorPhone" {...register("visitorPhone")} />
            </div>
            <div>
              <Label htmlFor="plateNumber">Plate number</Label>
              <Input id="plateNumber" {...register("plateNumber")} />
            </div>
            <div>
              <Label htmlFor="validFrom">Valid from</Label>
              <Input
                id="validFrom"
                type="datetime-local"
                {...register("validFrom", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="validTo">Valid to</Label>
              <Input
                id="validTo"
                type="datetime-local"
                {...register("validTo", { required: true })}
              />
            </div>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="md:col-span-2"
            >
              Issue pass
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isLoading && passes && (
        <Table>
          <THead>
            <TR>
              <TH>Visitor</TH>
              <TH>Valid window</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {passes.map((p) => (
              <TR key={p.id}>
                <TD>{p.visitorName}</TD>
                <TD className="text-xs">
                  {new Date(p.validFrom).toLocaleString()} -&gt;{" "}
                  {new Date(p.validTo).toLocaleString()}
                </TD>
                <TD>
                  <Badge tone={p.usedAt ? "muted" : "success"}>
                    {p.usedAt ? "used" : "active"}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {!isLoading && data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
