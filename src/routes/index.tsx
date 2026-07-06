import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { searchAdmissions, type Admission } from "@/lib/backend";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Admission[] | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const rows = await searchAdmissions(query);
      setResults(rows);
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-2xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. ADM-2026-123456 · Rahim · 01712345678"
              className="pl-9 h-11"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>

        <div className="mt-4">
          <Link
            to="/admission"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Or fill a new admission form →
          </Link>
        </div>

        {results !== null && (
          <div className="mx-auto mt-10 max-w-2xl space-y-3 text-left">
            <h2 className="text-sm font-medium text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </h2>
            {results.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No admissions match “{query}”.
                </CardContent>
              </Card>
            )}
            {results.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer transition hover:border-primary"
                onClick={() =>
                  navigate({ to: "/student/$id", params: { id: a.id } })
                }
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {a.studentName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.id} · Class {a.classApplyingFor} · {a.mobile}
                    </p>
                  </div>
                  <span className="text-sm text-primary">View →</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
