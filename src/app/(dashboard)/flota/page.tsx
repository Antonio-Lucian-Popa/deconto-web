'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-client';
import type { Car, CarOverview, FuelKind } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, userDisplayName } from '@/hooks/use-users';
import Link from 'next/link';
import { Car as CarIcon, User, ChevronRight, AlertTriangle, CheckCircle2, MapPin, ExternalLink, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

function formatRON(amount: number) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function FlotaPage() {
  const t = useTranslations('fleet');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: users } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    make: '', model: '', plateNumber: '', year: '', vin: '', mileage: '', color: '',
    vehicleCategory: '', fuelType: 'motorina' as FuelKind,
    fuelConsumptionPer100km: '', assignedUserId: '',
  });
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: fleet, isLoading } = useQuery({
    queryKey: ['fleet', 'overview'],
    queryFn: () => apiFetch<CarOverview[]>('/api/fleet/overview'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiFetch<Car>('/api/cars', {
      method: 'POST',
      body: JSON.stringify({
        make: form.make.trim(),
        model: form.model.trim(),
        plateNumber: form.plateNumber.trim().toUpperCase(),
        year: form.year ? Number(form.year) : undefined,
        vin: form.vin.trim() || undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        color: form.color.trim() || undefined,
        vehicleCategory: form.vehicleCategory.trim() || undefined,
        fuelType: form.fuelType,
        fuelConsumptionPer100km: form.fuelConsumptionPer100km ? Number(form.fuelConsumptionPer100km) : undefined,
        assignedUserId: form.assignedUserId || null,
      }),
    }),
    onSuccess: () => {
      toast.success('Vehicul adăugat în flotă');
      setCreateOpen(false);
      setForm({ make: '', model: '', plateNumber: '', year: '', vin: '', mileage: '', color: '', vehicleCategory: '', fuelType: 'motorina', fuelConsumptionPer100km: '', assignedUserId: '' });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  const expiredCount = fleet?.reduce(
    (n, car) => n + car.documents.filter((d) => d.status === 'expired').length,
    0
  ) ?? 0;
  const soonCount = fleet?.reduce(
    (n, car) => n + car.documents.filter((d) => d.status === 'expires_soon').length,
    0
  ) ?? 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title={t('title')} />
      <div className="app-content space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Vehiculele companiei</h2>
            <p className="mt-1 text-sm text-slate-500">Date tehnice, documente, costuri și poziții GPS.</p>
          </div>
          {canManage && <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Adaugă vehicul</Button>}
        </div>
        {/* Summary bar */}
        {!isLoading && fleet && fleet.length > 0 && (
          <div className="app-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
            <span className="text-slate-600 text-sm">
              <span className="text-slate-950 font-semibold">{fleet.length}</span> mașini în flotă
            </span>
            {expiredCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-400 text-sm">
                <AlertTriangle size={14} />
                {expiredCount} documente expirate
              </span>
            )}
            {soonCount > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-400 text-sm">
                <AlertTriangle size={14} />
                {soonCount} expiră curând
              </span>
            )}
            {expiredCount === 0 && soonCount === 0 && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle2 size={14} />
                Toate documentele valide
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : fleet?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
            <CarIcon size={48} className="opacity-20" />
            <p>Nu există mașini în flotă</p>
            {canManage && <Button className="mt-2" onClick={() => setCreateOpen(true)}><Plus size={16} /> Adaugă primul vehicul</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet?.map((car) => {
              const hasExpired = car.documents.some((d) => d.status === 'expired');
              const hasSoon = car.documents.some((d) => d.status === 'expires_soon');
              const borderColor = hasExpired
                ? 'border-red-500/40'
                : hasSoon
                ? 'border-yellow-500/40'
                : 'border-slate-200';

              return (
                <div
                  key={car.id}
                  className={`app-card ${borderColor} p-5 space-y-4`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-slate-950 font-bold text-lg tracking-wide">{car.plateNumber}</h3>
                      <p className="text-slate-500 text-sm">
                        {car.make} {car.model}{car.year ? ` (${car.year})` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">{formatRON(car.totalCosts12m)}</p>
                      <p className="text-gray-600 text-xs">costuri 12 luni</p>
                    </div>
                  </div>

                  {/* Assigned user */}
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-500" />
                    {car.assignedUser ? (
                      <span className="text-slate-700">
                        {[car.assignedUser.firstName, car.assignedUser.lastName].filter(Boolean).join(' ') || car.assignedUser.email}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic">Neasignat</span>
                    )}
                  </div>

                  {/* GPS */}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={14} className={car.latestLocation ? 'text-green-400' : 'text-gray-600'} />
                        <span className="text-xs font-medium text-slate-500">GPS</span>
                      </div>
                      {car.latestLocation ? (
                        <span className="text-[11px] text-gray-500">
                          {formatDateTime(car.latestLocation.capturedAt)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-600">Fără poziție</span>
                      )}
                    </div>
                    {car.latestLocation && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 tabular-nums">
                            {car.latestLocation.latitude.toFixed(5)}, {car.latestLocation.longitude.toFixed(5)}
                          </p>
                          {car.latestLocation.accuracy != null && (
                            <p className="text-[11px] text-gray-600">
                              Acuratețe {Math.round(car.latestLocation.accuracy)} m
                            </p>
                          )}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${car.latestLocation.latitude},${car.latestLocation.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Hartă <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Documents status */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documente</p>
                    {car.documents.length === 0 ? (
                      <p className="text-gray-600 text-xs">Niciun document înregistrat</p>
                    ) : (
                      <div className="space-y-1">
                        {car.documents.slice(0, 4).map((doc) => (
                          <div key={doc.reminderId} className="flex items-center justify-between">
                            <span className="text-slate-700 text-xs truncate max-w-36">{doc.title}</span>
                            <Badge
                              variant={doc.status === 'expired' ? 'danger' : doc.status === 'expires_soon' ? 'warning' : 'success'}
                            >
                              {doc.status === 'expired'
                                ? 'Expirat'
                                : doc.status === 'expires_soon'
                                ? `${doc.daysLeft}z`
                                : formatDate(doc.expiresAt)}
                            </Badge>
                          </div>
                        ))}
                        {car.documents.length > 4 && (
                          <p className="text-gray-600 text-xs">+{car.documents.length - 4} mai multe</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/flota/${car.id}`}
                    prefetch={false}
                    className="flex items-center justify-end text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    Detalii <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Adaugă vehicul" size="lg">
        <form onSubmit={submitCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Marcă *" required value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} placeholder="Ex. Ford" />
            <Input label="Model *" required value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Ex. Transit" />
            <Input label="Număr de înmatriculare *" required value={form.plateNumber} onChange={(event) => setForm({ ...form, plateNumber: event.target.value })} placeholder="B 123 ABC" />
            <Input label="An fabricație" type="number" min="1900" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
            <Input label="Serie șasiu (VIN)" value={form.vin} onChange={(event) => setForm({ ...form, vin: event.target.value })} />
            <Input label="Kilometraj" type="number" min="0" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: event.target.value })} />
            <Input label="Categorie vehicul" value={form.vehicleCategory} onChange={(event) => setForm({ ...form, vehicleCategory: event.target.value })} placeholder="Ex. Autoutilitară N1" />
            <Input label="Culoare" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
            <Select label="Carburant" value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value as FuelKind })}>
              <option value="motorina">Motorină</option><option value="benzina">Benzină</option><option value="gpl">GPL</option><option value="electric">Electric</option><option value="hybrid">Hibrid</option>
            </Select>
            <Input label="Consum normat (l/100 km)" type="number" min="0.01" step="0.01" value={form.fuelConsumptionPer100km} onChange={(event) => setForm({ ...form, fuelConsumptionPer100km: event.target.value })} />
            <div className="sm:col-span-2">
              <Select label="Șofer responsabil" value={form.assignedUserId} onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}>
                <option value="">Neasignat</option>
                {(users ?? []).filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{userDisplayName(item)}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Anulează</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Adaugă vehiculul</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
