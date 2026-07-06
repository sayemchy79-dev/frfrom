import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAdmission, updateAdmission, type Admission } from "@/lib/backend";
import { AdmissionForm, type AdmissionFormValues } from "@/components/admission-form";

export const Route = createFileRoute("/_authenticated/admission/$id/edit")({
  component: EditAdmissionPage,
});

function EditAdmissionPage() {
  const { id } = useParams({ from: "/_authenticated/admission/$id/edit" });
  const navigate = useNavigate();
  const [record, setRecord] = useState<Admission | null | undefined>(undefined);

  useEffect(() => {
    getAdmission(id).then(setRecord);
  }, [id]);

  if (record === undefined) {
    return (
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center text-muted-foreground">
        Loading…
      </main>
    );
  }
  if (record === null) {
    return (
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center text-muted-foreground">
        Record not found.
      </main>
    );
  }

  const initial: AdmissionFormValues = {
    studentName: record.studentName,
    dateOfBirth: record.dateOfBirth,
    gender: record.gender,
    bloodGroup: record.bloodGroup ?? "",
    religion: record.religion ?? "",
    nationality: record.nationality ?? "",
    previousSchool: record.previousSchool ?? "",
    classApplyingFor: record.classApplyingFor,
    fatherName: record.fatherName,
    motherName: record.motherName,
    guardianName: record.guardianName ?? "",
    mobile: record.mobile,
    alternateMobile: record.alternateMobile ?? "",
    email: record.email ?? "",
    address: record.address,
    city: record.city ?? "",
    postalCode: record.postalCode ?? "",
    notes: record.notes ?? "",
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Editing {record.id}</p>
          <h1 className="text-3xl font-bold text-foreground">Update Admission</h1>
        </div>
        <AdmissionForm
          initial={initial}
          submitLabel="Save changes"
          onCancel={() => navigate({ to: "/student/$id", params: { id: record.id } })}
          onSubmit={async (values) => {
            await updateAdmission(record.id, values);
            toast.success("Admission updated");
            navigate({ to: "/student/$id", params: { id: record.id } });
          }}
        />
      </div>
    </main>
  );
}
