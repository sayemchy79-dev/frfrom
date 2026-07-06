import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createAdmission, type Admission } from "@/lib/backend";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admission")({
  component: AdmissionForm,
});

const schema = z.object({
  studentName: z.string().trim().min(2, "Student name is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z.string().max(10).optional(),
  religion: z.string().max(40).optional(),
  nationality: z.string().max(40).optional(),
  previousSchool: z.string().max(120).optional(),
  classApplyingFor: z.string().trim().min(1, "Class is required").max(20),
  fatherName: z.string().trim().min(2, "Father's name is required").max(100),
  motherName: z.string().trim().min(2, "Mother's name is required").max(100),
  guardianName: z.string().max(100).optional(),
  mobile: z
    .string()
    .trim()
    .min(6, "Mobile number is required")
    .max(20),
  alternateMobile: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  address: z.string().trim().min(3, "Address is required").max(300),
  city: z.string().max(60).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

type FormState = Omit<Admission, "id" | "createdAt" | "createdBy">;

const empty: FormState = {
  studentName: "",
  dateOfBirth: "",
  gender: "male",
  bloodGroup: "",
  religion: "",
  nationality: "",
  previousSchool: "",
  classApplyingFor: "",
  fatherName: "",
  motherName: "",
  guardianName: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

function AdmissionForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const rec = await createAdmission(parsed.data as FormState, user.id);
      toast.success(`Admission submitted · ${rec.id}`);
      navigate({ to: "/student/$id", params: { id: rec.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            School Admission Form
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details below. A form number will be generated on submit.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Student full name" required>
                <Input
                  value={form.studentName}
                  onChange={(e) => set("studentName", e.target.value)}
                  required
                />
              </Field>
              <Field label="Date of birth" required>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  required
                />
              </Field>
              <Field label="Gender" required>
                <Select
                  value={form.gender}
                  onValueChange={(v) => set("gender", v as FormState["gender"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Class applying for" required>
                <Input
                  value={form.classApplyingFor}
                  onChange={(e) => set("classApplyingFor", e.target.value)}
                  placeholder="e.g. Class 6"
                  required
                />
              </Field>
              <Field label="Blood group">
                <Input
                  value={form.bloodGroup}
                  onChange={(e) => set("bloodGroup", e.target.value)}
                />
              </Field>
              <Field label="Religion">
                <Input
                  value={form.religion}
                  onChange={(e) => set("religion", e.target.value)}
                />
              </Field>
              <Field label="Nationality">
                <Input
                  value={form.nationality}
                  onChange={(e) => set("nationality", e.target.value)}
                />
              </Field>
              <Field label="Previous school">
                <Input
                  value={form.previousSchool}
                  onChange={(e) => set("previousSchool", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parents / Guardian</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Father's name" required>
                <Input
                  value={form.fatherName}
                  onChange={(e) => set("fatherName", e.target.value)}
                  required
                />
              </Field>
              <Field label="Mother's name" required>
                <Input
                  value={form.motherName}
                  onChange={(e) => set("motherName", e.target.value)}
                  required
                />
              </Field>
              <Field label="Guardian (if different)">
                <Input
                  value={form.guardianName}
                  onChange={(e) => set("guardianName", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number" required>
                <Input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                  required
                />
              </Field>
              <Field label="Alternate mobile">
                <Input
                  type="tel"
                  value={form.alternateMobile}
                  onChange={(e) => set("alternateMobile", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Postal code">
                <Input
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Full address" required>
                  <Textarea
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    required
                    rows={3}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={4}
                placeholder="Anything else the school should know…"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(empty)}
            >
              Reset
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit admission"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
