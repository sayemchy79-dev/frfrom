import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import type { Admission } from "@/lib/backend";
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

export const admissionSchema = z.object({
  studentName: z.string().trim().min(2, "Student name must be at least 2 characters").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], { message: "Select a gender" }),
  bloodGroup: z.string().max(10).optional().or(z.literal("")),
  religion: z.string().max(40).optional().or(z.literal("")),
  nationality: z.string().max(40).optional().or(z.literal("")),
  previousSchool: z.string().max(120).optional().or(z.literal("")),
  classApplyingFor: z.string().trim().min(1, "Class is required").max(20),
  fatherName: z.string().trim().min(2, "Father's name is required").max(100),
  motherName: z.string().trim().min(2, "Mother's name is required").max(100),
  guardianName: z.string().max(100).optional().or(z.literal("")),
  mobile: z
    .string()
    .trim()
    .min(6, "Mobile number must be at least 6 digits")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Mobile number contains invalid characters"),
  alternateMobile: z
    .string()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Alternate mobile contains invalid characters")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().min(3, "Address is required").max(300),
  city: z.string().max(60).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AdmissionFormValues = Omit<Admission, "id" | "createdAt" | "createdBy">;

const empty: AdmissionFormValues = {
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

type Errors = Partial<Record<keyof AdmissionFormValues, string>>;

export function AdmissionForm({
  initial,
  submitLabel = "Submit admission",
  onSubmit,
  onCancel,
}: {
  initial?: AdmissionFormValues;
  submitLabel?: string;
  onSubmit: (values: AdmissionFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<AdmissionFormValues>(initial ?? empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof AdmissionFormValues>(k: K, v: AdmissionFormValues[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = admissionSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AdmissionFormValues | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data as AdmissionFormValues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Student full name" required error={errors.studentName}>
            <Input
              value={form.studentName}
              onChange={(e) => set("studentName", e.target.value)}
              aria-invalid={!!errors.studentName}
            />
          </Field>
          <Field label="Date of birth" required error={errors.dateOfBirth}>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              aria-invalid={!!errors.dateOfBirth}
            />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <Select
              value={form.gender}
              onValueChange={(v) => set("gender", v as AdmissionFormValues["gender"])}
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
          <Field label="Class applying for" required error={errors.classApplyingFor}>
            <Input
              value={form.classApplyingFor}
              onChange={(e) => set("classApplyingFor", e.target.value)}
              placeholder="e.g. Class 6"
              aria-invalid={!!errors.classApplyingFor}
            />
          </Field>
          <Field label="Blood group" error={errors.bloodGroup}>
            <Input value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} />
          </Field>
          <Field label="Religion" error={errors.religion}>
            <Input value={form.religion} onChange={(e) => set("religion", e.target.value)} />
          </Field>
          <Field label="Nationality" error={errors.nationality}>
            <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </Field>
          <Field label="Previous school" error={errors.previousSchool}>
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
          <Field label="Father's name" required error={errors.fatherName}>
            <Input
              value={form.fatherName}
              onChange={(e) => set("fatherName", e.target.value)}
              aria-invalid={!!errors.fatherName}
            />
          </Field>
          <Field label="Mother's name" required error={errors.motherName}>
            <Input
              value={form.motherName}
              onChange={(e) => set("motherName", e.target.value)}
              aria-invalid={!!errors.motherName}
            />
          </Field>
          <Field label="Guardian (if different)" error={errors.guardianName}>
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
          <Field label="Mobile number" required error={errors.mobile}>
            <Input
              type="tel"
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              aria-invalid={!!errors.mobile}
            />
          </Field>
          <Field label="Alternate mobile" error={errors.alternateMobile}>
            <Input
              type="tel"
              value={form.alternateMobile}
              onChange={(e) => set("alternateMobile", e.target.value)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="City" error={errors.city}>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Postal code" error={errors.postalCode}>
            <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Full address" required error={errors.address}>
              <Textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                rows={3}
                aria-invalid={!!errors.address}
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
          <Field label="Notes" error={errors.notes}>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="Anything else the school should know…"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
