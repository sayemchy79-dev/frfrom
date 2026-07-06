import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createAdmission } from "@/lib/backend";
import { useAuth } from "@/lib/auth-context";
import { AdmissionForm } from "@/components/admission-form";

export const Route = createFileRoute("/_authenticated/admission")({
  component: NewAdmissionPage,
});

function NewAdmissionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-[calc(100vh-56px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">School Admission Form</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details below. A form number will be generated on submit.
          </p>
        </div>
        <AdmissionForm
          submitLabel="Submit admission"
          onSubmit={async (values) => {
            if (!user) return;
            const rec = await createAdmission(values, user.id);
            toast.success(`Admission submitted · ${rec.id}`);
            navigate({ to: "/student/$id", params: { id: rec.id } });
          }}
        />
      </div>
    </main>
  );
}
