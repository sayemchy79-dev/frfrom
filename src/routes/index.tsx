import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchAdmissions, subscribeToAdmissions, type Admission } from "@/lib/backend";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 5;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: Index,
});

function Index() {
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  // local input mirrors URL, updated on every keystroke; URL updates after debounce
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<Admission[] | null>(q ? null : null);
  const [loading, setLoading] = useState(false);

  // Debounce URL updates
  useEffect(() => {
    if (input === q) return;
    const t = setTimeout(() => {
      navigate({
        search: { q: input, page: 1 },
        replace: true,
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Keep local input in sync if URL changes externally (back button, etc.)
  useEffect(() => {
    setInput(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Run the actual search whenever the URL query changes
  useEffect(() => {
    let cancelled = false;
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    searchAdmissions(q).then((rows) => {
      if (!cancelled) {
        setResults(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const total = results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = results?.slice(start, start + PAGE_SIZE) ?? [];

  function goToPage(next: number) {
    navigate({ search: (prev: { q: string; page: number }) => ({ ...prev, page: next }) });
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background">
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          School Admission Portal
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Search admissions by form number, student name, or mobile number.
        </p>

        <div className="mx-auto mt-8 flex max-w-2xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. ADM-2026-123456 · Rahim · 01712345678"
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          {input && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setInput("");
                navigate({ search: { q: "", page: 1 }, replace: true });
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="mt-4">
          <Link
            to="/admission"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Or fill a new admission form →
          </Link>
        </div>

        {q.trim() && (
          <div className="mx-auto mt-10 max-w-2xl space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                {loading
                  ? "Searching…"
                  : `${total} result${total === 1 ? "" : "s"} for “${q}”`}
              </h2>
              {totalPages > 1 && (
                <span className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
              )}
            </div>

            {!loading && total === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No admissions match “{q}”.
                </CardContent>
              </Card>
            )}

            {pageRows.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer transition hover:border-primary"
                onClick={() =>
                  navigate({ to: "/student/$id", params: { id: a.id } })
                }
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold text-foreground">{a.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.id} · Class {a.classApplyingFor} · {a.mobile}
                    </p>
                  </div>
                  <span className="text-sm text-primary">View →</span>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => goToPage(safePage - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => goToPage(safePage + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
