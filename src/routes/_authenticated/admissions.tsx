import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAdmissions, type Admission } from "@/lib/backend";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admissions")({
  component: AdmissionsList,
});

function AdmissionsList() {
  const [rows, setRows] = useState<Admission[] | null>(null);

  useEffect(() => {
    listAdmissions().then(setRows);
  }, []);

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground">All Admissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every submitted admission record.
        </p>

        <div className="mt-6 space-y-3">
          {rows === null && (
            <p className="text-muted-foreground">Loading…</p>
          )}
          {rows && rows.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No admissions yet.{" "}
                <Link to="/admission" className="text-primary underline-offset-4 hover:underline">
                  Create the first one
                </Link>
                .
              </CardContent>
            </Card>
          )}
          {rows?.map((a) => (
            <Link
              key={a.id}
              to="/student/$id"
              params={{ id: a.id }}
              className="block"
            >
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {a.studentName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.id} · Class {a.classApplyingFor} · {a.mobile}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
