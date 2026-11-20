import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileText,
  LogIn,
  LogOut,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  AthleteDocType,
  StoredAthleteDocument,
  useFirebase,
} from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  compressImageToDataUrl,
  computeFileSha256,
  formatFileSize,
} from '../utils/fileHelpers';

interface PendingUpload {
  file: File;
  name: string;
  sizeLabel: string;
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const DOC_META: { key: AthleteDocType; label: string }[] = [
  { key: 'birth_certificate', label: 'شهادة الميلاد' },
  { key: 'medical_certificate', label: 'الشهادة الطبية' },
  { key: 'national_id', label: 'بطاقة التعريف الوطني' },
  { key: 'parental_consent', label: 'تصريح أبوي' },
];

function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const dob = new Date(birthDateStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 5 && age <= 95 ? age : null;
}

export function AthleteRegistrationForm() {
  const {
    user,
    authReady,
    authError,
    signingIn,
    myProfile,
    myDocuments,
    loadingProfile,
    signInWithGoogle,
    signOutUser,
  } = useFirebase();

  const [isEditing, setIsEditing] = useState(false);

  const [photoFile, setPhotoFile] = useState<PendingUpload | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [bloodType, setBloodType] = useState('O+');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const [birthCert, setBirthCert] = useState<PendingUpload | null>(null);
  const [medicalCert, setMedicalCert] = useState<PendingUpload | null>(null);
  const [nationalIdDoc, setNationalIdDoc] = useState<PendingUpload | null>(null);
  const [parentalConsent, setParentalConsent] = useState<PendingUpload | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ title: string; url: string } | null>(null);

  const calculatedAge = calculateAge(birthDate);
  const isMinor = calculatedAge !== null && calculatedAge < 18;
  const isAdult = calculatedAge !== null && calculatedAge >= 18;

  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const startEditingExisting = () => {
    if (!myProfile) return;
    setFullName(myProfile.fullName);
    setBirthDate(myProfile.birthDate);
    setGender(myProfile.gender);
    setBloodType(myProfile.bloodType);
    setAddress(myProfile.address);
    setPhone(myProfile.phone);
    setPhotoPreviewUrl(myProfile.photoDataUrl);
    setPhotoFile(null);
    setBirthCert(null);
    setMedicalCert(null);
    setNationalIdDoc(null);
    setParentalConsent(null);
    setErrorMsg('');
    setIsEditing(true);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WEBP) للصورة الشخصية.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الصورة الشخصية يجب ألا يتجاوز 5 ميغابايت.');
      return;
    }

    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(nextUrl);
    setPhotoFile({
      file,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
    });
    setErrorMsg('');
  };

  const handleDocumentChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (docItem: PendingUpload | null) => void,
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`حجم ملف ${label} يجب ألا يتجاوز 10 ميغابايت.`);
      return;
    }
    setter({
      file,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
    });
    setErrorMsg('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!user.emailVerified) {
      setErrorMsg('يجب أن يكون البريد الإلكتروني للحساب موثقاً لإتمام التسجيل.');
      return;
    }

    const hasPhoto = Boolean(photoFile || (isEditing && myProfile?.photoDataUrl));
    if (!hasPhoto) {
      setErrorMsg('يرجى رفع الصورة الشخصية للرياضي.');
      return;
    }

    const cleanedName = fullName.trim();
    if (cleanedName.length < 3 || cleanedName.length > 120) {
      setErrorMsg('يجب أن يكون الاسم الكامل بين 3 و 120 حرفاً.');
      return;
    }

    if (calculatedAge === null || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(birthDate)) {
      setErrorMsg('يرجى تحديد تاريخ ميلاد صحيح (العمر بين 5 و 95 سنة).');
      return;
    }

    const cleanedAddress = address.trim();
    if (cleanedAddress.length < 4 || cleanedAddress.length > 240) {
      setErrorMsg('يرجى إدخال العنوان السكني الكامل (بين 4 و 240 حرفاً).');
      return;
    }

    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(cleanedPhone)) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح مكون من 8 إلى 15 رقماً.');
      return;
    }

    const hasBirthCert = Boolean(birthCert || (isEditing && myDocuments['birth_certificate']));
    const hasMedicalCert = Boolean(medicalCert || (isEditing && myDocuments['medical_certificate']));
    const hasNationalId = Boolean(nationalIdDoc || (isEditing && myDocuments['national_id']));
    const hasParental = Boolean(parentalConsent || (isEditing && myDocuments['parental_consent']));

    if (!hasBirthCert) {
      setErrorMsg('يرجى رفع شهادة الميلاد.');
      return;
    }
    if (!hasMedicalCert) {
      setErrorMsg('يرجى رفع الشهادة الطبية.');
      return;
    }
    if (isAdult && !hasNationalId) {
      setErrorMsg('الرياضي بالغ (18 سنة فأكثر): يرجى رفع بطاقة التعريف الوطني للمتابعة.');
      return;
    }
    if (isMinor && !hasParental) {
      setErrorMsg('الرياضي أقل من 18 سنة: يرجى رفع التصريح الأبوي للمتابعة.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const compressedPhotoDataUrl = photoFile
        ? await compressImageToDataUrl(photoFile.file, 320, 0.78, 250000)
        : myProfile!.photoDataUrl;

      const batch = writeBatch(db);
      const athleteRef = doc(db, 'athletes', user.uid);
      const isCreate = !myProfile;
      const athleteCode =
        myProfile?.athleteCode || `UFC-ATH-${Math.floor(1000 + Math.random() * 9000)}`;

      if (isCreate) {
        batch.set(athleteRef, {
          ownerUid: user.uid,
          athleteCode,
          fullName: cleanedName,
          birthDate,
          ageYears: calculatedAge,
          gender,
          bloodType,
          address: cleanedAddress,
          phone: cleanedPhone,
          photoDataUrl: compressedPhotoDataUrl,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(athleteRef, {
          fullName: cleanedName,
          birthDate,
          ageYears: calculatedAge,
          gender,
          bloodType,
          address: cleanedAddress,
          phone: cleanedPhone,
          photoDataUrl: compressedPhotoDataUrl,
          status: 'pending',
          updatedAt: serverTimestamp(),
        });
      }

      const pendingDocsToWrite: { key: AthleteDocType; upload: PendingUpload }[] = [];
      if (birthCert) pendingDocsToWrite.push({ key: 'birth_certificate', upload: birthCert });
      if (medicalCert) pendingDocsToWrite.push({ key: 'medical_certificate', upload: medicalCert });
      if (nationalIdDoc) pendingDocsToWrite.push({ key: 'national_id', upload: nationalIdDoc });
      if (parentalConsent) {
        pendingDocsToWrite.push({ key: 'parental_consent', upload: parentalConsent });
      }

      for (const item of pendingDocsToWrite) {
        const sha256 = await computeFileSha256(item.upload.file);
        let previewDataUrl: string | undefined;
        if (item.upload.file.type.startsWith('image/')) {
          try {
            previewDataUrl = await compressImageToDataUrl(item.upload.file, 800, 0.68, 300000);
          } catch {
            previewDataUrl = undefined;
          }
        }

        const docRef = doc(db, 'athletes', user.uid, 'documents', item.key);
        const payload: Omit<StoredAthleteDocument, 'updatedAt'> & {
          updatedAt: ReturnType<typeof serverTimestamp>;
        } = {
          ownerUid: user.uid,
          docType: item.key,
          fileName: item.upload.name.slice(0, 180),
          mimeType: (item.upload.file.type || 'application/octet-stream').slice(0, 80),
          sizeBytes: item.upload.file.size,
          sha256,
          updatedAt: serverTimestamp(),
        };
        if (previewDataUrl) {
          payload.previewDataUrl = previewDataUrl;
        }
        batch.set(docRef, payload);
      }

      try {
        await batch.commit();
        setIsEditing(false);
      } catch (fsError) {
        handleFirestoreError(
          fsError,
          isCreate ? OperationType.CREATE : OperationType.UPDATE,
          `athletes/${user.uid}`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('{')) {
        throw err;
      }
      setErrorMsg(
        err instanceof Error ? err.message : 'تعذر حفظ بيانات الرياضي. يرجى المحاولة مجدداً.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRecord = async () => {
    if (!myProfile) return;
    const text = [
      `ملف الرياضي - النادي الرياضي الهاوي UFC`,
      `الرمز: ${myProfile.athleteCode}`,
      `الاسم الكامل: ${myProfile.fullName}`,
      `تاريخ الميلاد: ${myProfile.birthDate} (${myProfile.ageYears} سنة)`,
      `الجنس: ${myProfile.gender}`,
      `فصيلة الدم: ${myProfile.bloodType}`,
      `العنوان: ${myProfile.address}`,
      `الهاتف: ${myProfile.phone}`,
    ].join(' | ');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  if (!authReady || loadingProfile) {
    return (
      <div
        id="ufc-join"
        className="rounded-xl border border-zinc-800 bg-[#131316] p-8 text-center text-sm text-zinc-400"
      >
        جاري التحقق من حالة الحساب وتحميل بوابة الرياضي...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        id="ufc-join"
        className="rounded-xl border border-zinc-800 bg-[#131316] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
      >
        <div className="lg:col-span-7 space-y-3">
          <p className="text-xs font-medium text-zinc-400">01. بوابة دخول وتسجيل الرياضي</p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
            ادخل وسجّل ملفك الرياضي في نادي UFC ولاية البيض
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">
            سجّل الدخول بحساب جوجل لفتح استمارة بيانات الرياضي (الصورة، الاسم الكامل، تاريخ الميلاد، الجنس، فصيلة الدم، العنوان ورقم الهاتف) ورفع وثائقك الرسمية ليتم حفظها ومتابعة اعتمادها في النادي.
          </p>

          {authError ? (
            <p className="text-xs text-red-400 font-medium pt-1" role="alert">
              {authError}
            </p>
          ) : null}
        </div>

        <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-[#09090B] p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-white">
            حساب الرياضي الشخصي
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            يتيح لك الدخول عرض بطاقة تسجيلك، تحديث وثائقك عند الحاجة، ومتابعة حالة القبول في النادي من أي جهاز.
          </p>
          <button
            type="button"
            disabled={signingIn}
            onClick={signInWithGoogle}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-sm font-bold text-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>{signingIn ? 'جاري فتح نافذة الدخول...' : 'الدخول بحساب جوجل للتسجيل'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (myProfile && !isEditing) {
    const statusText =
      myProfile.status === 'approved'
        ? 'ملف معتمد من إدارة النادي'
        : myProfile.status === 'rejected'
          ? 'مطلوب تعديل أو استكمال الوثائق'
          : 'قيد المراجعة لدى إدارة النادي';

    return (
      <div
        id="ufc-join"
        className="rounded-xl border border-zinc-800 bg-[#131316] p-6 sm:p-10 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>الحساب المسجل:</span>
            <span className="text-white font-semibold">{user.displayName || user.email}</span>
            <span aria-hidden="true">·</span>
            <span dir="ltr" className="font-mono">
              {user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {myProfile.status === 'approved' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : myProfile.status === 'rejected' ? (
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
            ) : (
              <Clock className="w-6 h-6 text-zinc-300 shrink-0" />
            )}
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                {statusText}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                ملف الرياضي المحفوظ في قاعدة بيانات النادي الرياضي الهاوي UFC
              </p>
            </div>
          </div>
          <span dir="ltr" className="font-mono text-base font-semibold text-red-400 tabular-nums">
            {myProfile.athleteCode}
          </span>
        </div>

        {myProfile.reviewNote ? (
          <div className="rounded-lg border border-zinc-700 bg-[#09090B] p-4 text-xs text-zinc-200">
            <span className="font-semibold text-white">ملاحظة إدارة النادي: </span>
            {myProfile.reviewNote}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 flex flex-col items-center rounded-xl border border-zinc-800 bg-[#09090B] p-6 text-center">
            <div className="w-32 h-32 rounded-xl overflow-hidden border border-zinc-700 bg-[#131316] flex items-center justify-center">
              {myProfile.photoDataUrl ? (
                <img
                  src={myProfile.photoDataUrl}
                  alt={myProfile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-zinc-500" />
              )}
            </div>
            <h3 className="font-display text-lg font-bold text-white mt-4">
              {myProfile.fullName}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 tabular-nums">
              {myProfile.gender} · {myProfile.ageYears} سنة · فصيلة الدم{' '}
              <span dir="ltr" className="font-mono text-red-400 font-semibold">
                {myProfile.bloodType}
              </span>
            </p>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3.5">
                <p className="text-xs text-zinc-500">تاريخ الميلاد</p>
                <p dir="ltr" className="font-mono text-sm text-white mt-1 text-right tabular-nums">
                  {myProfile.birthDate}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3.5">
                <p className="text-xs text-zinc-500">رقم الهاتف</p>
                <p dir="ltr" className="font-mono text-sm text-white mt-1 text-right tabular-nums">
                  {myProfile.phone}
                </p>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-zinc-800 bg-[#09090B] p-3.5">
                <p className="text-xs text-zinc-500">العنوان</p>
                <p className="text-sm text-white mt-1">{myProfile.address}</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-2.5">الوثائق المحفوظة</p>
              <ul className="space-y-2.5 text-xs text-zinc-200">
                {DOC_META.map(({ key, label }) => {
                  const docItem = myDocuments[key];
                  if (!docItem) return null;
                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-2 pb-2 last:pb-0 border-b last:border-b-0 border-zinc-800/70"
                    >
                      <span>{label}</span>
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="font-mono text-zinc-400 truncate max-w-[200px]">
                          {docItem.fileName}
                        </span>
                        {docItem.previewDataUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModal({ title: label, url: docItem.previewDataUrl! })
                            }
                            className="px-2 py-1 rounded border border-zinc-700 text-[11px] text-zinc-200 hover:text-white"
                          >
                            معاينة
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopyRecord}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white transition-colors"
              >
                {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSummary ? 'تم نسخ بيانات الرياضي' : 'نسخ ملخص ملف الرياضي'}</span>
              </button>

              {myProfile.status !== 'approved' ? (
                <button
                  type="button"
                  onClick={startEditingExisting}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-200 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل البيانات أو تحديث الوثائق</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {previewModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewModal(null)}
          >
            <div
              className="max-w-lg w-full rounded-xl border border-zinc-800 bg-[#131316] p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-bold text-white">{previewModal.title}</h4>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="w-full max-h-[70vh] object-contain rounded-lg bg-black"
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div id="ufc-join" className="rounded-xl border border-zinc-800 bg-[#131316] p-6 sm:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>الحساب النشط:</span>
          <span className="text-white font-semibold">{user.displayName || user.email}</span>
          <span aria-hidden="true">·</span>
          <span dir="ltr" className="font-mono">
            {user.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            >
              إلغاء التعديل
            </button>
          ) : null}
          <button
            type="button"
            onClick={signOutUser}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl pt-6 pb-6 border-b border-zinc-800">
        <p className="text-xs font-medium text-zinc-400">01. ملف الرياضي الرسمي</p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1.5">
          {isEditing ? 'تحديث بيانات الرياضي والوثائق' : 'استمارة بيانات الرياضي والوثائق'}
        </h2>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          يرجى تعبئة البيانات الشخصية للرياضي وإرفاق الصورة، شهادة الميلاد، الشهادة الطبية، بطاقة التعريف الوطني للكبار، والتصريح الأبوي لمن هم دون 18 سنة.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-[#09090B] p-5 flex flex-col items-center text-center">
            <div className="w-36 h-36 rounded-xl overflow-hidden border border-zinc-700 bg-[#131316] flex items-center justify-center">
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="معاينة الصورة الشخصية للرياضي"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-zinc-600" strokeWidth={1.5} />
              )}
            </div>

            <p className="text-xs font-semibold text-white mt-4">الصورة الشخصية للرياضي</p>
            <p className="text-xs text-zinc-500 mt-1">JPG أو PNG أو WEBP · حد أقصى 5 MB</p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full">
              <label
                htmlFor="athlete-photo-upload"
                className="min-h-[42px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>{photoPreviewUrl ? 'تغيير الصورة' : 'رفع الصورة'}</span>
              </label>
              <input
                id="athlete-photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="sr-only"
              />

              {photoFile ? (
                <button
                  type="button"
                  onClick={() => {
                    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(photoPreviewUrl);
                    }
                    setPhotoPreviewUrl(isEditing && myProfile ? myProfile.photoDataUrl : null);
                    setPhotoFile(null);
                  }}
                  aria-label="حذف الصورة الشخصية"
                  className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {photoFile ? (
              <p dir="ltr" className="mt-2.5 font-mono text-[11px] text-zinc-400 truncate max-w-full">
                {photoFile.name} · {photoFile.sizeLabel}
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="athlete-full-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
                الاسم الكامل
              </label>
              <input
                id="athlete-full-name"
                type="text"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم واللقب كما في شهادة الميلاد"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div>
              <label htmlFor="athlete-birth-date" className="block text-xs font-medium text-zinc-300 mb-1.5">
                تاريخ الميلاد
                {calculatedAge !== null ? (
                  <span className="text-zinc-400 mr-2 tabular-nums">
                    ({calculatedAge} سنة · {isMinor ? 'قاصر' : 'بالغ'})
                  </span>
                ) : null}
              </label>
              <input
                id="athlete-birth-date"
                type="date"
                required
                dir="ltr"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090B] border border-zinc-800 text-sm font-mono text-white focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-300 mb-1.5">الجنس</span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#09090B] border border-zinc-800">
                {(['ذكر', 'أنثى'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGender(option)}
                    className={`min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
                      gender === option
                        ? 'bg-[#DC2626] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="athlete-blood-type" className="block text-xs font-medium text-zinc-300 mb-1.5">
                فصيلة الدم
              </label>
              <select
                id="athlete-blood-type"
                dir="ltr"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090B] border border-zinc-800 text-sm font-mono text-white focus:outline-none focus:border-[#DC2626]"
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="athlete-phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                رقم الهاتف
              </label>
              <input
                id="athlete-phone"
                type="tel"
                dir="ltr"
                required
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+213 5XX XXX XXX"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="athlete-address" className="block text-xs font-medium text-zinc-300 mb-1.5">
                العنوان
              </label>
              <input
                id="athlete-address"
                type="text"
                required
                maxLength={240}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="الحي، الشارع، المدينة"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <h3 className="font-display text-base font-bold text-white">رفع الوثائق الرسمية</h3>
          <p className="text-xs text-zinc-400 mt-1">
            تقبل الصيغ التالية: PDF أو JPG أو PNG بحد أقصى 10 ميغابايت للملف.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DocumentUploadBox
              id="doc-birth-cert"
              title="شهادة الميلاد"
              requirementText="إلزامية لجميع الرياضيين"
              doc={birthCert}
              existingFileName={isEditing ? myDocuments['birth_certificate']?.fileName : undefined}
              onChange={(e) => handleDocumentChange(e, setBirthCert, 'شهادة الميلاد')}
              onClear={() => setBirthCert(null)}
            />

            <DocumentUploadBox
              id="doc-medical-cert"
              title="الشهادة الطبية"
              requirementText="تثبت اللياقة لممارسة الفنون القتالية"
              doc={medicalCert}
              existingFileName={
                isEditing ? myDocuments['medical_certificate']?.fileName : undefined
              }
              onChange={(e) => handleDocumentChange(e, setMedicalCert, 'الشهادة الطبية')}
              onClear={() => setMedicalCert(null)}
            />

            <DocumentUploadBox
              id="doc-national-id"
              title="بطاقة التعريف الوطني"
              requirementText={
                isAdult
                  ? 'إلزامية · الرياضي بالغ (18+ سنة)'
                  : 'مطلوبة فقط للكبار (18 سنة فأكثر)'
              }
              highlightRequired={isAdult}
              doc={nationalIdDoc}
              existingFileName={isEditing ? myDocuments['national_id']?.fileName : undefined}
              onChange={(e) =>
                handleDocumentChange(e, setNationalIdDoc, 'بطاقة التعريف الوطني')
              }
              onClear={() => setNationalIdDoc(null)}
            />

            <DocumentUploadBox
              id="doc-parental-consent"
              title="تصريح أبوي"
              requirementText={
                isMinor ? 'إلزامي · الرياضي أقل من 18 سنة' : 'مطلوب فقط لمن هم دون 18 سنة'
              }
              highlightRequired={isMinor}
              doc={parentalConsent}
              existingFileName={isEditing ? myDocuments['parental_consent']?.fileName : undefined}
              onChange={(e) => handleDocumentChange(e, setParentalConsent, 'التصريح الأبوي')}
              onClear={() => setParentalConsent(null)}
            />
          </div>
        </div>

        {errorMsg ? (
          <p className="text-xs text-red-400 font-medium" role="alert">
            {errorMsg}
          </p>
        ) : null}

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-7 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-sm font-bold text-white transition-colors whitespace-nowrap"
          >
            {submitting
              ? 'جاري الحفظ في قاعدة البيانات...'
              : isEditing
                ? 'حفظ التعديلات وإعادة الإرسال'
                : 'حفظ واعتماد بيانات الرياضي'}
          </button>
          <span className="text-xs text-zinc-500">
            تُحفظ البيانات والوثائق مباشرة في قاعدة بيانات نادي UFC ولاية البيض
          </span>
        </div>
      </form>
    </div>
  );
}

interface DocumentUploadBoxProps {
  id: string;
  title: string;
  requirementText: string;
  highlightRequired?: boolean;
  doc: PendingUpload | null;
  existingFileName?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function DocumentUploadBox({
  id,
  title,
  requirementText,
  highlightRequired = false,
  doc,
  existingFileName,
  onChange,
  onClear,
}: DocumentUploadBoxProps) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
        highlightRequired && !doc && !existingFileName
          ? 'border-[#DC2626]/70 bg-[#1A1113]'
          : 'border-zinc-800 bg-[#09090B]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold text-white">{title}</span>
          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
        </div>
        <p
          className={`text-xs mt-1 ${
            highlightRequired ? 'text-red-400 font-medium' : 'text-zinc-400'
          }`}
        >
          {requirementText}
        </p>
      </div>

      {doc ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#131316] px-3 py-2">
          <div className="min-w-0">
            <p dir="ltr" className="font-mono text-xs text-zinc-200 truncate">
              {doc.name}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">{doc.sizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`إزالة ${title}`}
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {existingFileName ? (
            <p dir="ltr" className="font-mono text-[11px] text-emerald-400 truncate">
              المحفوظ: {existingFileName}
            </p>
          ) : null}
          <label
            htmlFor={id}
            className="min-h-[42px] w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-200 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{existingFileName ? 'استبدال الملف' : 'اختيار ملف'}</span>
          </label>
          <input
            id={id}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={onChange}
            className="sr-only"
          />
        </div>
      )}
    </div>
  );
}
