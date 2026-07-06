import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdmission, type Admission } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/student/$id")({
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = useParams({ from: "/student/$id" });
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
      <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Record not found</h1>
        <p className="text-muted-foreground">No admission matches “{id}”.</p>
        <Link to="/">
          <Button>Back to search</Button>
        </Link>
      </main>
    );
  }

  const r = record;
  return (
    <main className="min-h-[calc(100vh-56px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admission form</p>
            <h1 className="text-3xl font-bold text-foreground">
              {r.studentName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {r.id} · Submitted{" "}
              {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        <Section title="Student Information">
          <Row k="Name" v={r.studentName} />
          <Row k="Date of birth" v={r.dateOfBirth} />
          <Row k="Gender" v={r.gender} />
          <Row k="Class applying for" v={r.classApplyingFor} />
          <Row k="Blood group" v={r.bloodGroup} />
          <Row k="Religion" v={r.religion} />
          <Row k="Nationality" v={r.nationality} />
          <Row k="Previous school" v={r.previousSchool} />
        </Section>

        <Section title="Parents / Guardian">
          <Row k="Father" v={r.fatherName} />
          <Row k="Mother" v={r.motherName} />
          <Row k="Guardian" v={r.guardianName} />
        </Section>

        <Section title="Contact & Address">
          <Row k="Mobile" v={r.mobile} />
          <Row k="Alternate mobile" v={r.alternateMobile} />
          <Row k="Email" v={r.email} />
          <Row k="Address" v={r.address} />
          <Row k="City" v={r.city} />
          <Row k="Postal code" v={r.postalCode} />
        </Section>

        {r.notes && (
          <Section title="Notes">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {r.notes}
            </p>
          </Section>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {k}
      </span>
      <span className="text-sm text-foreground">{v}</span>
    </div>
  );
}
