'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUpload } from '@/lib/api-client';
import type { Car, Reminder, Document, Cost, ReminderStatus } from '@/lib/api-types';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Lightbox } from '@/components/ui/lightbox';
import { toast } from 'sonner';
import { use, useRef, useState } from 'react';
import {
  ArrowLeft, Upload, Trash2, RefreshCw, FileText,
  Image as ImageIcon, DollarSign, Bell, MapPin, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

function formatRON(amount: number, currency = 'RON') {
  if (currency === 'RON')
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
  return `${amount.toFixed(2)} ${currency}`;
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

const REMINDER_STATUS_VARIANTS: Record<ReminderStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  ACTIVE: 'success',
  DUE_SOON: 'warning',
  OVERDUE: 'danger',
  COMPLETED: 'gray',
};
const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  ACTIVE: 'Activ',
  DUE_SOON: 'Expiră curând',
  OVERDUE: 'Expirat',
  COMPLETED: 'Finalizat',
};

const COST_CATEGORY_LABELS: Record<string, string> = {
  FUEL: 'Combustibil',
  SERVICE: 'Service',
  INSURANCE: 'Asigurare',
  TAX: 'Taxe',
  TIRE: 'Anvelope',
  WASH: 'Spălătorie',
  OTHER: 'Altele',
};

type Tab = 'documents' | 'reminders' | 'costs';

export default function CarDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [renewModal, setRenewModal] = useState<Reminder | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Queries
  const { data: car, isLoading: carLoading } = useQuery({
    queryKey: ['car', id],
    queryFn: () => apiFetch<Car>(`/api/cars/${id}`),
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => apiFetch<Document[]>(`/api/documents?carId=${id}`),
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders', id],
    queryFn: () => apiFetch<Reminder[]>(`/api/reminders/car/${id}`),
  });

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ['costs', id],
    queryFn: () => apiFetch<Cost[]>(`/api/costs?carId=${id}`),
  });

  // Delete document
  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiFetch(`/api/documents/${docId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Document șters');
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Renew reminder
  const renewMutation = useMutation({
    mutationFn: ({ reminderId, expiresAt }: { reminderId: string; expiresAt: string }) =>
      apiFetch(`/api/reminders/${reminderId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ expiresAt: new Date(expiresAt).toISOString() }),
      }),
    onSuccess: () => {
      toast.success('Reminder reînnoit');
      setRenewModal(null);
      setRenewDate('');
      queryClient.invalidateQueries({ queryKey: ['reminders', id] });
      queryClient.invalidateQueries({ queryKey: ['fleet', 'overview'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Upload document
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('carId', id);
      formData.append('type', 'OTHER');
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      await apiUpload<Document>('/api/documents', formData);
      toast.success('Document încărcat');
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Încărcare eșuată');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const totalCosts = (costs ?? []).reduce((s, c) => s + c.amount, 0);

  if (carLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <Header title="Detaliu mașină" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!car) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'documents', label: 'Documente', icon: <FileText size={15} /> },
    { key: 'reminders', label: 'Remindere', icon: <Bell size={15} /> },
    { key: 'costs', label: 'Costuri', icon: <DollarSign size={15} /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Header title="Detaliu mașină" />
      <div className="flex-1 p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/flota" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-xl font-bold text-white">{car.plateNumber}</h2>
          <span className="text-gray-400 text-sm">{car.make} {car.model}</span>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Marcă / Model', value: `${car.make} ${car.model}` },
            { label: 'An fabricație', value: car.year ?? '—' },
            { label: 'Kilometraj', value: car.mileage ? `${car.mileage.toLocaleString('ro-RO')} km` : '—' },
            { label: 'Culoare', value: car.color ?? '—' },
          ].map((item) => (
            <div key={item.label} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-white font-medium">{String(item.value)}</p>
            </div>
          ))}
        </div>

        {/* GPS */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} className={car.latestLocation ? 'text-green-400' : 'text-gray-600'} />
                <h3 className="text-white font-semibold">Poziție GPS</h3>
              </div>
              {car.latestLocation ? (
                <div className="space-y-1">
                  <p className="text-gray-300 text-sm tabular-nums">
                    {car.latestLocation.latitude.toFixed(5)}, {car.latestLocation.longitude.toFixed(5)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Actualizat {formatDateTime(car.latestLocation.capturedAt)}
                    {car.latestLocation.accuracy != null
                      ? ` · acuratețe ${Math.round(car.latestLocation.accuracy)} m`
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nu există încă o poziție GPS pentru această mașină.</p>
              )}
            </div>
            {car.latestLocation && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${car.latestLocation.latitude},${car.latestLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-white/10 transition-colors"
              >
                Deschide harta <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'documents' && documents && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{documents.length}</span>
              )}
              {tab.key === 'reminders' && reminders && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{reminders.length}</span>
              )}
              {tab.key === 'costs' && costs && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{costs.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                isLoading={uploadingDoc}
                variant="secondary"
              >
                <Upload size={16} /> Încarcă document
              </Button>
            </div>

            {docsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : documents?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
                <FileText size={40} className="opacity-20" />
                <p className="text-sm">Niciun document încărcat</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {documents?.map((doc) => {
                  const isPdf = doc.imageUrl.endsWith('.pdf');
                  return (
                    <div
                      key={doc.id}
                      className="relative group bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden"
                    >
                      {isPdf ? (
                        <div className="h-36 flex items-center justify-center bg-white/5">
                          <FileText size={40} className="text-gray-400" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setLightboxSrc(doc.imageUrl)}
                          className="w-full h-36 block overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.imageUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 h-36 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon size={24} className="text-white" />
                          </div>
                        </button>
                      )}
                      <div className="p-3">
                        <p className="text-white text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-gray-500 text-xs">{formatDate(doc.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Șterge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── REMINDERS TAB ── */}
        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {remindersLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : reminders?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
                <Bell size={40} className="opacity-20" />
                <p className="text-sm">Niciun reminder înregistrat</p>
              </div>
            ) : (
              reminders?.map((r) => {
                const daysLeft = Math.ceil(
                  (new Date(r.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-white/10 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant={REMINDER_STATUS_VARIANTS[r.status]}>
                        {REMINDER_STATUS_LABELS[r.status]}
                      </Badge>
                      <div>
                        <p className="text-white font-medium">{r.title}</p>
                        <p className="text-gray-400 text-sm">
                          Expiră: {formatDate(r.expiresAt)}
                          {daysLeft > 0
                            ? ` (în ${daysLeft} zile)`
                            : daysLeft === 0
                            ? ' (azi!)'
                            : ` (acum ${Math.abs(daysLeft)} zile)`}
                        </p>
                        {r.notes && <p className="text-gray-500 text-xs mt-0.5">{r.notes}</p>}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRenewModal(r);
                        setRenewDate(r.expiresAt.slice(0, 10));
                      }}
                    >
                      <RefreshCw size={14} /> Reînnoire
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── COSTS TAB ── */}
        {activeTab === 'costs' && (
          <div className="space-y-4">
            {/* Summary */}
            {!costsLoading && costs && costs.length > 0 && (
              <div className="flex items-center gap-6 px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm">
                <span className="text-gray-400">
                  <span className="text-white font-semibold">{costs.length}</span> intrări
                </span>
                <span className="text-gray-400">
                  Total: <span className="text-white font-semibold">{formatRON(totalCosts)}</span>
                </span>
              </div>
            )}

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Data', 'Categorie', 'Furnizor', 'Note', 'Sumă'].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {costsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-white/5">
                          {[1, 2, 3, 4, 5].map((j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    ) : costs?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 py-12 text-sm">
                          Niciun cost înregistrat
                        </td>
                      </tr>
                    ) : (
                      costs?.map((cost) => (
                        <tr key={cost.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 text-gray-300 text-sm whitespace-nowrap">{formatDate(cost.date)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="gray">{COST_CATEGORY_LABELS[cost.category] ?? cost.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{cost.vendor ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm max-w-40">
                            <p className="truncate">{cost.notes ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-white font-medium text-sm">{formatRON(cost.amount, cost.currency)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Renew reminder modal */}
      <Modal
        open={renewModal !== null}
        onClose={() => setRenewModal(null)}
        title={`Reînnoire: ${renewModal?.title ?? ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Selectează noua dată de expirare pentru documentul <span className="text-white">{renewModal?.title}</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nouă dată expirare</label>
            <input
              type="date"
              value={renewDate}
              onChange={(e) => setRenewDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRenewModal(null)}>Anulează</Button>
            <Button
              disabled={!renewDate}
              isLoading={renewMutation.isPending}
              onClick={() => renewModal && renewMutation.mutate({ reminderId: renewModal.id, expiresAt: renewDate })}
            >
              <RefreshCw size={15} /> Reînnoire
            </Button>
          </div>
        </div>
      </Modal>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
