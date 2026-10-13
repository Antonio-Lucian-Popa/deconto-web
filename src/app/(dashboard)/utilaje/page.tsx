'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import { apiFetch } from '@/lib/api-client';
import type { FuelKind, Utilaj, UtilajType } from '@/lib/api-types';
import { Pencil, Plus, Search, Trash2, Tractor, UserRound, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS: Record<UtilajType, string> = {
  EXCAVATOR: 'Excavator',
  DRAGLINA: 'Draglină',
  MOTOFIERASTRAU: 'Motofierăstrău',
  GENERATOR: 'Generator',
  COMPRESOR: 'Compresor',
  BULDOZER: 'Buldozer',
  INCARCATOR: 'Încărcător',
  ALTELE: 'Altele',
};

const FUEL_LABELS: Record<FuelKind, string> = {
  benzina: 'Benzină',
  motorina: 'Motorină',
  gpl: 'GPL',
  electric: 'Electric',
  hybrid: 'Hibrid',
};

type EquipmentForm = {
  name: string;
  type: UtilajType;
  inventoryNumber: string;
  fuelType: FuelKind;
  fuelConsumptionPerHour: string;
  assignedUserId: string;
  notes: string;
};

const EMPTY_FORM: EquipmentForm = {
  name: '',
  type: 'EXCAVATOR',
  inventoryNumber: '',
  fuelType: 'motorina',
  fuelConsumptionPerHour: '',
  assignedUserId: '',
  notes: '',
};

export default function UtilajePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: users } = useUsers();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Utilaj | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Utilaj | null>(null);
  const [form, setForm] = useState<EquipmentForm>(EMPTY_FORM);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: utilaje, isLoading, isError, refetch } = useQuery({
    queryKey: ['utilaje'],
    queryFn: () => apiFetch<Utilaj[]>('/api/utilaje'),
  });

  const userById = useMemo(
    () => new Map((users ?? []).map((item) => [item.id, item])),
    [users]
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ro');
    if (!needle) return utilaje ?? [];
    return (utilaje ?? []).filter((item) =>
      [item.name, item.inventoryNumber, TYPE_LABELS[item.type], item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('ro').includes(needle))
    );
  }, [search, utilaje]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        inventoryNumber: form.inventoryNumber.trim() || undefined,
        fuelType: form.fuelType,
        fuelConsumptionPerHour: form.fuelConsumptionPerHour
          ? Number(form.fuelConsumptionPerHour)
          : undefined,
        assignedUserId: form.assignedUserId || null,
        notes: form.notes.trim() || undefined,
      };
      return apiFetch<Utilaj>(editing ? `/api/utilaje/${editing.id}` : '/api/utilaje', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'Utilaj actualizat' : 'Utilaj adăugat');
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['utilaje'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/utilaje/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Utilaj șters');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['utilaje'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: Utilaj) {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      inventoryNumber: item.inventoryNumber ?? '',
      fuelType: item.fuelType,
      fuelConsumptionPerHour:
        item.fuelConsumptionPerHour != null ? String(item.fuelConsumptionPerHour) : '',
      assignedUserId: item.assignedUserId ?? '',
      notes: item.notes ?? '',
    });
    setFormOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Completează denumirea utilajului');
    saveMutation.mutate();
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <Header title="Utilaje" />
      <div className="app-content space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Registrul utilajelor</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gestionează utilajele, normele de consum și persoanele responsabile.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate}><Plus size={16} /> Adaugă utilaj</Button>
          )}
        </div>

        <div className="app-filter-bar">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="app-input w-full pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută denumire sau număr inventar..."
            />
          </div>
          <span className="text-sm text-slate-500 sm:ml-auto">
            <strong className="text-slate-900">{filtered.length}</strong> utilaje
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56" />)}
          </div>
        ) : isError ? (
          <div className="app-panel p-8 text-center">
            <p className="font-semibold text-slate-900">Utilajele nu au putut fi încărcate.</p>
            <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>Reîncearcă</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="app-panel flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Tractor size={27} />
            </div>
            <h3 className="font-semibold text-slate-950">Niciun utilaj găsit</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {search ? 'Schimbă termenul de căutare.' : 'Adaugă primul utilaj pentru a putea întocmi bonurile de consum.'}
            </p>
            {canManage && !search && <Button className="mt-5" onClick={openCreate}><Plus size={16} /> Adaugă utilaj</Button>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const assigned = item.assignedUserId ? userById.get(item.assignedUserId) : undefined;
              return (
                <article key={item.id} className="app-card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Tractor size={21} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-950">{item.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.inventoryNumber ? `Inventar ${item.inventoryNumber}` : 'Fără număr de inventar'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="info">{TYPE_LABELS[item.type]}</Badge>
                  </div>

                  <div className="my-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Carburant</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{FUEL_LABELS[item.fuelType]}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Normă consum</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {item.fuelConsumptionPerHour != null ? `${item.fuelConsumptionPerHour} l/oră` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><UserRound size={15} className="text-slate-400" /> {assigned ? userDisplayName(assigned) : 'Neasignat'}</p>
                    {item.notes && <p className="flex items-start gap-2"><Wrench size={15} className="mt-0.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{item.notes}</span></p>}
                  </div>

                  {canManage && (
                    <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(item)}><Pencil size={14} /> Editează</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteTarget(item)}><Trash2 size={14} /> Șterge</Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editează utilajul' : 'Adaugă utilaj'} size="lg">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Denumire *" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex. Excavator CAT 320" />
            <Select label="Tip utilaj *" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as UtilajType })}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Input label="Număr de inventar" value={form.inventoryNumber} onChange={(event) => setForm({ ...form, inventoryNumber: event.target.value })} placeholder="Ex. UT-001" />
            <Select label="Carburant *" value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value as FuelKind })}>
              {Object.entries(FUEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Input label="Consum normat (litri/oră)" type="number" min="0.01" step="0.01" value={form.fuelConsumptionPerHour} onChange={(event) => setForm({ ...form, fuelConsumptionPerHour: event.target.value })} placeholder="Ex. 12.5" />
            <Select label="Responsabil" value={form.assignedUserId} onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}>
              <option value="">Neasignat</option>
              {(users ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{userDisplayName(item)}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Observații</label>
            <textarea className="app-input min-h-24 w-full resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Detalii utile despre utilaj..." />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Anulează</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>{editing ? 'Salvează modificările' : 'Adaugă utilajul'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Șterge utilajul" size="sm">
        <p className="text-sm leading-6 text-slate-600">Sigur vrei să ștergi <strong className="text-slate-950">{deleteTarget?.name}</strong>? Bonurile de consum asociate pot fi afectate.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Anulează</Button>
          <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Șterge</Button>
        </div>
      </Modal>
    </div>
  );
}
