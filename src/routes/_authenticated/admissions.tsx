import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { deleteAdmission, listAdmissions, type Admission } from "@/lib/backend";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admissions")({
  component: AdmissionsList,
});

function AdmissionsList() {
  const [rows, setRows] = useState<Admission[] | null>(null);
  const navigate = useNavigate();

  async function refresh() {
    setRows(await listAdmissions());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onDelete(id: string) {
    try {
      await deleteAdmission(id);
      toast.success("Admission deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground">All Admissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every submitted admission record.</p>

        <div className="mt-6 space-y-3">
          {rows === null && <p className="text-muted-foreground">Loading…</p>}
          {rows && rows.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No admissions yet.{" "}
                <Link
                  to="/admission"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Create the first one
                </Link>
                .
              </CardContent>
            </Card>
          )}
          {rows?.map((a) => (
            <Card key={a.id} className="transition hover:border-primary">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/student/$id", params: { id: a.id } })}
                  className="flex-1 text-left"
                >
                  <p className="font-semibold text-foreground">{a.studentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.id} · Class {a.classApplyingFor} · {a.mobile}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      navigate({
                        to: "/admission/$id/edit",
                        params: { id: a.id },
                      })
                    }
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteButton onConfirm={() => onDelete(a.id)} label={a.studentName} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export function DeleteButton({
  onConfirm,
  label,
}: {
  onConfirm: () => void | Promise<void>;
  label: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this admission?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {label}'s admission record. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
