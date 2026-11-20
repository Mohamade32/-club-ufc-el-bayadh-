import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Search,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AthleteStatus,
  StoredAthleteDocument,
  StoredAthleteProfile,
  useFirebase,
} from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatFileSize } from '../utils/fileHelpers';

const DOC_LABELS: Record<string, string> = {
  birth_certificate: 'شهادة الميلاد',
  medical_certificate: 'الشهادة الطبية',
  national_id: 'بطاقة التعريف الوطني',
  parental_consent: 'تصريح أبوي',
};

const STATUS_LABELS: Record<AthleteStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'يحتاج استكمال',
};

export function AdminAthletesPanel() {
  const { authReady, user, isAdmin } = useFirebase();
  const [athletes, setAthletes] = useState<StoredAthleteProfile[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | AthleteStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAthlete, setSelectedAthlete] = useState<StoredAthleteProfile | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<StoredAthleteDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) {
      setAthletes([]);
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    const q = query(collection(db, 'athletes'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: StoredAthleteProfile[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as StoredAthleteProfile);
        });
        setAthletes(items);
        setLoadingList(false);
      },
      (error) => {
        setLoadingList(false);
        handleFirestoreError(error, OperationType.LIST, 'athletes');
      }
    );

    return () => unsub();
  }, [authReady, user, isAdmin]);

  if (!authReady || !user || !isAdmin) {
    return null;
  }

  const handleInspectAthlete = async (athlete: StoredAthleteProfile) => {
    setSelectedAthlete(athlete);
    setReviewNote(athlete.reviewNote || '');
    setSelectedDocs([]);
    setLoadingDocs(true);

    const path = `athletes/${athlete.ownerUid}/documents`;
    try {
      const docsSnap = await getDocs(collection(db, 'athletes', athlete.ownerUid, 'documents'));
      const list: StoredAthleteDocument[] = [];
      docsSnap.forEach((d) => list.push(d.data() as StoredAthleteDocument));
      setSelectedDocs(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDecision = async (nextStatus: AthleteStatus) => {
    if (!selectedAthlete) return;
    setUpdatingStatus(true);
    const path = `athletes/${selectedAthlete.ownerUid}`;
    try {
      await updateDoc(doc(db, 'athletes', selectedAthlete.ownerUid), {
        status: nextStatus,
        reviewNote: reviewNote.trim().slice(0, 300),
        updatedAt: serverTimestamp(),
      });
      setSelectedAthlete((prev) =>
        prev ? { ...prev, status: nextStatus, reviewNote: reviewNote.trim() } : null
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteAthlete = async (athleteUid: string) => {
    const path = `athletes/${athleteUid}`;
    try {
      await deleteDoc(doc(db, 'athletes', athleteUid));
      if (selectedAthlete?.ownerUid === athleteUid) {
        setSelectedAthlete(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filtered = athletes.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      item.fullName.toLowerCase().includes(term) ||
      item.athleteCode.toLowerCase().includes(term) ||
      item.phone.toLowerCase().includes(term)
    );
  });

  return (
    <section id="admin-athletes" className="py-12 border-t border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <p className="text-xs font-medium text-red-400">لوحة إدارة النادي</p>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
              سجل الرياضيين المسجلين ({athletes.length})
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              مراجعة ملفات الرياضيين والوثائق المرفقة واعتماد العضويات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم أو الرمز أو الهاتف..."
                className="min-h-[40px] pr-9 pl-3 py-2 rounded-lg bg-[#131316] border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#131316] border border-zinc-800">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'pending', label: 'قيد المراجعة' },
                  { id: 'approved', label: 'معتمد' },
                  { id: 'rejected', label: 'يحتاج استكمال' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-[#DC2626] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingList ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-[#131316] p-8 text-center text-sm text-zinc-400">
            جاري تحميل سجل الرياضيين من قاعدة البيانات...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-[#131316] p-8 text-center text-sm text-zinc-400">
            لا توجد ملفات مطابقة لمعايير البحث الحالية.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800 bg-[#131316]">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">الرياضي</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">الرمز</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">العمر والجنس</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">فصيلة الدم</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">الهاتف</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">الحالة</th>
                  <th className="py-3.5 px-4 font-semibold whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 text-sm">
                {filtered.map((athlete) => (
                  <tr key={athlete.ownerUid} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0 flex items-center justify-center">
                          {athlete.photoDataUrl ? (
                            <img
                              src={athlete.photoDataUrl}
                              alt={athlete.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[180px]">
                            {athlete.fullName}
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-[180px]">
                            {athlete.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      dir="ltr"
                      className="py-3.5 px-4 font-mono text-xs text-zinc-300 tabular-nums text-right whitespace-nowrap"
                    >
                      {athlete.athleteCode}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-300 whitespace-nowrap tabular-nums">
                      {athlete.ageYears} سنة · {athlete.gender}
                    </td>
                    <td
                      dir="ltr"
                      className="py-3.5 px-4 font-mono text-xs text-red-400 font-semibold text-right whitespace-nowrap"
                    >
                      {athlete.bloodType}
                    </td>
                    <td
                      dir="ltr"
                      className="py-3.5 px-4 font-mono text-xs text-zinc-300 text-right whitespace-nowrap tabular-nums"
                    >
                      {athlete.phone}
                    </td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          athlete.status === 'approved'
                            ? 'text-emerald-400'
                            : athlete.status === 'rejected'
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                        }`}
                      >
                        {athlete.status === 'approved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : athlete.status === 'rejected' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>{STATUS_LABELS[athlete.status]}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectAthlete(athlete)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مراجعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAthlete(athlete.ownerUid)}
                          aria-label={`حذف ملف ${athlete.fullName}`}
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAthlete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-[#131316] p-6 text-zinc-100 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                  <img
                    src={selectedAthlete.photoDataUrl}
                    alt={selectedAthlete.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {selectedAthlete.fullName}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {selectedAthlete.athleteCode} · {selectedAthlete.ageYears} سنة ·{' '}
                    {selectedAthlete.gender} · فصيلة {selectedAthlete.bloodType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAthlete(null)}
                aria-label="إغلاق نافذة المراجعة"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3">
                <p className="text-zinc-500">تاريخ الميلاد</p>
                <p dir="ltr" className="font-mono text-white mt-1 text-right">
                  {selectedAthlete.birthDate}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3">
                <p className="text-zinc-500">رقم الهاتف</p>
                <p dir="ltr" className="font-mono text-white mt-1 text-right">
                  {selectedAthlete.phone}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3">
                <p className="text-zinc-500">العنوان</p>
                <p className="text-white mt-1">{selectedAthlete.address}</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">الوثائق المرفقة</h4>
              {loadingDocs ? (
                <p className="text-xs text-zinc-400">جاري تحميل الوثائق...</p>
              ) : selectedDocs.length === 0 ? (
                <p className="text-xs text-zinc-500">لا توجد وثائق مسجلة.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedDocs.map((docItem) => (
                    <div
                      key={docItem.docType}
                      className="rounded-lg border border-zinc-800 bg-[#09090B] p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{DOC_LABELS[docItem.docType] || docItem.docType}</span>
                        </div>
                        <p dir="ltr" className="font-mono text-[11px] text-zinc-400 truncate mt-1">
                          {docItem.fileName} · {formatFileSize(docItem.sizeBytes)}
                        </p>
                      </div>
                      {docItem.previewDataUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              title: DOC_LABELS[docItem.docType] || docItem.fileName,
                              url: docItem.previewDataUrl!,
                            })
                          }
                          className="min-h-[34px] px-2.5 py-1 rounded-md border border-zinc-700 text-xs text-zinc-200 hover:text-white shrink-0"
                        >
                          معاينة
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800 space-y-3">
              <div>
                <label htmlFor="admin-review-note" className="block text-xs text-zinc-400 mb-1.5">
                  ملاحظة الإدارة للرياضي (اختياري)
                </label>
                <input
                  id="admin-review-note"
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="مثال: الملف مكتمل ومقبول، أو يرجى إعادة رفع شهادة طبية أوضح"
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#09090B] border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDecision('rejected')}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-amber-600/50 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 disabled:opacity-50 transition-colors"
                >
                  طلب استكمال / تعديل
                </button>
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleDecision('approved')}
                  className="min-h-[40px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-50 transition-colors"
                >
                  اعتماد ملف الرياضي
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-xl w-full rounded-xl border border-zinc-800 bg-[#131316] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-white">{previewImage.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="w-full max-h-[70vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
