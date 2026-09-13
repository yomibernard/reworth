"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Input } from "@reworth/ui-web";
import { adminFetch, ApiError } from "../../lib/api";
import {
  ActionButton,
  PageHeader,
  SimpleTable,
  StatusLine,
} from "../../components/AdminUi";

type EstatePartnerRow = {
  id: string;
  companyName: string;
  contactEmail: string;
  communityId: string;
  communityName?: string;
  status: string;
  apiKeyPrefix?: string | null;
  createdAt?: string;
};

type CircularPartnerRow = {
  id: string;
  name: string;
  kind: string;
  city: string;
  verified: boolean;
  active: boolean;
  acceptedCategories?: string[];
  contactEmail?: string | null;
};

type IssuedKey = { apiKey?: string; webhookSecret?: string; id?: string };

export default function AdminPartnersPage() {
  const [estate, setEstate] = useState<EstatePartnerRow[]>([]);
  const [circular, setCircular] = useState<CircularPartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [selectedEstate, setSelectedEstate] = useState<EstatePartnerRow | null>(
    null,
  );

  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [communityId, setCommunityId] = useState("");

  const [circName, setCircName] = useState("");
  const [circKind, setCircKind] = useState("CHARITY");
  const [circCity, setCircCity] = useState("Lagos");
  const [circCats, setCircCats] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eRes, cRes] = await Promise.all([
        adminFetch<{ items: EstatePartnerRow[] } | EstatePartnerRow[]>(
          "/admin/partners",
        ),
        adminFetch<{ items: CircularPartnerRow[] } | CircularPartnerRow[]>(
          "/admin/circular-partners",
        ).catch(() => [] as CircularPartnerRow[]),
      ]);
      setEstate(Array.isArray(eRes) ? eRes : eRes.items ?? []);
      setCircular(Array.isArray(cRes) ? cRes : cRes.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
      setEstate([]);
      setCircular([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEstate(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim() || !communityId.trim()) {
      setError("Company, email, and communityId required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch<EstatePartnerRow & IssuedKey>(
        "/admin/partners",
        {
          method: "POST",
          body: {
            companyName: companyName.trim(),
            contactEmail: contactEmail.trim(),
            communityId: communityId.trim(),
          },
        },
      );
      setIssued({
        apiKey: res.apiKey,
        webhookSecret: res.webhookSecret,
        id: res.id,
      });
      setCompanyName("");
      setContactEmail("");
      setCommunityId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setEstateStatus(id: string, action: "activate" | "suspend" | "revoke") {
    setBusy(true);
    try {
      await adminFetch(`/admin/partners/${id}/${action}`, {
        method: "POST",
        body: {},
      });
      setSelectedEstate(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function createCircular(e: FormEvent) {
    e.preventDefault();
    if (!circName.trim()) {
      setError("Circular partner name required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/admin/circular-partners", {
        method: "POST",
        body: {
          name: circName.trim(),
          kind: circKind,
          city: circCity.trim() || "Lagos",
          acceptedCategories: circCats
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          verified: true,
          active: true,
        },
      });
      setCircName("");
      setCircCats("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCircular(id: string, active: boolean) {
    setBusy(true);
    try {
      await adminFetch(`/admin/circular-partners/${id}`, {
        method: "PATCH",
        body: { active },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const estateRows = estate.map((p) => ({
    id: p.id,
    company: p.companyName,
    community: p.communityName || p.communityId.slice(0, 8),
    email: p.contactEmail,
    status: p.status,
    key: p.apiKeyPrefix ? `${p.apiKeyPrefix}…` : "—",
  }));

  const circularRows = circular.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    city: p.city,
    verified: p.verified ? "Yes" : "No",
    active: p.active ? "Yes" : "No",
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div>
        <PageHeader
          title="Estate partners"
          description="Issue API keys and manage estate system integrations."
          actions={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          }
        />
        <StatusLine
          loading={loading}
          error={error}
          empty={!loading && !error && !estateRows.length}
        />

        {issued?.apiKey ? (
          <div
            className="mb-6 rounded border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] p-4 text-sm"
            role="status"
          >
            <p className="font-semibold">API key issued (copy now — shown once)</p>
            <p className="mt-2 break-all font-mono text-xs">{issued.apiKey}</p>
            {issued.webhookSecret ? (
              <p className="mt-2 break-all font-mono text-xs">
                Webhook secret: {issued.webhookSecret}
              </p>
            ) : null}
            <Button
              className="mt-3"
              size="sm"
              variant="ghost"
              onClick={() => setIssued(null)}
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        <form
          onSubmit={createEstate}
          className="mb-6 grid gap-3 rounded border border-[var(--rw-border)] p-4 sm:grid-cols-2"
        >
          <Input
            label="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={busy}
          />
          <Input
            label="Contact email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={busy}
          />
          <Input
            label="Community ID"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            disabled={busy}
            hint="UUID of the estate community"
          />
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={busy}>
              Create & issue key
            </Button>
          </div>
        </form>

        {estateRows.length ? (
          <SimpleTable
            columns={[
              { key: "company", label: "Company" },
              { key: "community", label: "Community" },
              { key: "email", label: "Email" },
              { key: "status", label: "Status" },
              { key: "key", label: "Key prefix" },
            ]}
            rows={estateRows}
            onRowClick={(row) => {
              setSelectedEstate(estate.find((p) => p.id === row.id) ?? null);
            }}
            expandedId={selectedEstate?.id ?? null}
            renderExpanded={() =>
              selectedEstate ? (
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    label="Activate"
                    onClick={() => setEstateStatus(selectedEstate.id, "activate")}
                  />
                  <ActionButton
                    label="Suspend"
                    onClick={() => setEstateStatus(selectedEstate.id, "suspend")}
                  />
                  <ActionButton
                    label="Revoke"
                    onClick={() => setEstateStatus(selectedEstate.id, "revoke")}
                  />
                </div>
              ) : (
                <p>Select a partner.</p>
              )
            }
          />
        ) : null}
      </div>

      <div>
        <PageHeader
          title="Circular partners"
          description="Charities and recyclers for donate-if-unsold hand-offs."
        />
        <form
          onSubmit={createCircular}
          className="mb-6 grid gap-3 rounded border border-[var(--rw-border)] p-4 sm:grid-cols-2"
        >
          <Input
            label="Name"
            value={circName}
            onChange={(e) => setCircName(e.target.value)}
            disabled={busy}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Kind
            <select
              className="rounded border border-[var(--rw-border)] bg-[var(--rw-bg-elevated)] px-3 py-2.5"
              value={circKind}
              onChange={(e) => setCircKind(e.target.value)}
              disabled={busy}
            >
              <option value="CHARITY">Charity</option>
              <option value="RECYCLER">Recycler</option>
            </select>
          </label>
          <Input
            label="City"
            value={circCity}
            onChange={(e) => setCircCity(e.target.value)}
            disabled={busy}
          />
          <Input
            label="Accepted categories (comma-separated)"
            value={circCats}
            onChange={(e) => setCircCats(e.target.value)}
            disabled={busy}
          />
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={busy}>
              Add circular partner
            </Button>
          </div>
        </form>

        {circularRows.length ? (
          <SimpleTable
            columns={[
              { key: "name", label: "Name" },
              { key: "kind", label: "Kind" },
              { key: "city", label: "City" },
              { key: "verified", label: "Verified" },
              { key: "active", label: "Active" },
            ]}
            rows={circularRows}
            onRowClick={(row) => {
              const found = circular.find((p) => p.id === row.id);
              if (!found) return;
              void toggleCircular(found.id, !found.active);
            }}
          />
        ) : (
          !loading && (
            <p className="text-sm text-[var(--rw-ink-muted)]">
              No circular partners yet. Click a row later to toggle active.
            </p>
          )
        )}
      </div>
    </div>
  );
}
