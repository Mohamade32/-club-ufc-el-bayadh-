import { useEffect, useState } from 'react';
import { ArrowUpLeft, QrCode } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { AdminAthletesPanel } from './components/AdminAthletesPanel';
import { Header } from './components/Header';
import { LinkDetailModal } from './components/LinkDetailModal';
import { LinkHubSection } from './components/LinkHubSection';
import { ResilientImage } from './components/ResilientImage';
import { ScheduleAndBooking } from './components/ScheduleAndBooking';
import { ShareQrModal } from './components/ShareQrModal';
import { useFirebase } from './contexts/FirebaseContext';
import { CLUB_PROFILE, INITIAL_CLUB_LINKS } from './data/clubData';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ClubLink, ModalDetailId } from './types/club';

interface FirestoreClubLinkDoc extends Omit<ClubLink, 'id' | 'clicks'> {
  sortOrder: number;
}

export default function App() {
  const { authReady, isAdmin } = useFirebase();
  const [links, setLinks] = useState<ClubLink[]>(INITIAL_CLUB_LINKS);
  const [hasCloudLinks, setHasCloudLinks] = useState(false);

  const [activeModal, setActiveModal] = useState<ModalDetailId | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;

    const q = isAdmin
      ? query(collection(db, 'clubLinks'))
      : query(collection(db, 'clubLinks'), where('active', '==', true));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setHasCloudLinks(false);
          setLinks(INITIAL_CLUB_LINKS);
          return;
        }
        const loaded: (ClubLink & { sortOrder: number })[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as FirestoreClubLinkDoc;
          loaded.push({
            id: docSnap.id,
            title: d.title,
            subtitle: d.subtitle,
            category: d.category,
            categoryLabel: d.categoryLabel,
            actionType: d.actionType,
            url: d.url,
            targetSectionId: d.targetSectionId,
            modalId: d.modalId,
            featured: d.featured,
            active: d.active,
            clicks: 0,
            iconKey: d.iconKey,
            sortOrder: d.sortOrder ?? 0,
          });
        });
        loaded.sort((a, b) => a.sortOrder - b.sortOrder);
        setHasCloudLinks(true);
        setLinks(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'clubLinks');
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  const seedDefaultLinksIfNeeded = async (currentList: ClubLink[]) => {
    if (hasCloudLinks) return;
    const batch = writeBatch(db);
    currentList.forEach((item, idx) => {
      const payload: Record<string, unknown> = {
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        categoryLabel: item.categoryLabel,
        actionType: item.actionType,
        active: item.active,
        sortOrder: idx,
        iconKey: item.iconKey,
        updatedAt: serverTimestamp(),
      };
      if (item.url) payload.url = item.url;
      if (item.targetSectionId) payload.targetSectionId = item.targetSectionId;
      if (item.modalId) payload.modalId = item.modalId;
      if (typeof item.featured === 'boolean') payload.featured = item.featured;
      batch.set(doc(db, 'clubLinks', item.id), payload);
    });
    await batch.commit();
  };

  const handleAddLink = async (newLink: Omit<ClubLink, 'id' | 'clicks'>) => {
    if (!isAdmin) return;
    const newId = `custom-${Date.now()}`;
    try {
      await seedDefaultLinksIfNeeded(links);
      const payload: Record<string, unknown> = {
        title: newLink.title.slice(0, 120),
        subtitle: newLink.subtitle.slice(0, 240),
        category: newLink.category,
        categoryLabel: newLink.categoryLabel.slice(0, 60),
        actionType: newLink.actionType,
        active: newLink.active,
        sortOrder: 0,
        iconKey: newLink.iconKey,
        updatedAt: serverTimestamp(),
      };
      if (newLink.url) payload.url = newLink.url.slice(0, 500);
      await setDoc(doc(db, 'clubLinks', newId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `clubLinks/${newId}`);
    }
  };

  const handleToggleActive = async (id: string) => {
    if (!isAdmin) return;
    const target = links.find((l) => l.id === id);
    if (!target) return;
    try {
      await seedDefaultLinksIfNeeded(links);
      await updateDoc(doc(db, 'clubLinks', id), {
        active: !target.active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clubLinks/${id}`);
    }
  };

  const handleMoveLink = async (id: string, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const idx = links.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;

    const reordered = [...links];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    try {
      await seedDefaultLinksIfNeeded(links);
      const batch = writeBatch(db);
      reordered.forEach((item, orderIdx) => {
        batch.update(doc(db, 'clubLinks', item.id), {
          sortOrder: orderIdx,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clubLinks');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!isAdmin) return;
    try {
      await seedDefaultLinksIfNeeded(links);
      await deleteDoc(doc(db, 'clubLinks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clubLinks/${id}`);
    }
  };

  const handleResetLinks = async () => {
    if (!isAdmin) return;
    try {
      const batch = writeBatch(db);
      links.forEach((item) => {
        batch.delete(doc(db, 'clubLinks', item.id));
      });
      INITIAL_CLUB_LINKS.forEach((item, idx) => {
        const payload: Record<string, unknown> = {
          title: item.title,
          subtitle: item.subtitle,
          category: item.category,
          categoryLabel: item.categoryLabel,
          actionType: item.actionType,
          active: item.active,
          sortOrder: idx,
          iconKey: item.iconKey,
          updatedAt: serverTimestamp(),
        };
        if (item.url) payload.url = item.url;
        if (item.targetSectionId) payload.targetSectionId = item.targetSectionId;
        if (item.modalId) payload.modalId = item.modalId;
        if (typeof item.featured === 'boolean') payload.featured = item.featured;
        batch.set(doc(db, 'clubLinks', item.id), payload);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clubLinks');
    }
  };

  const handleTrackClick = (id: string) => {
    setLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, clicks: item.clicks + 1 } : item))
    );
  };

  return (
    <div id="top" className="min-h-screen bg-[#09090B] text-[#F4F4F5] flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="py-10 sm:py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 flex flex-col justify-center">
                <p className="text-xs sm:text-sm text-zinc-400">
                  {CLUB_PROFILE.metadataLine}
                </p>

                <h1 className="font-display text-[clamp(2rem,3.6vw,3.25rem)] font-extrabold text-white leading-[1.2] tracking-tight mt-3 text-balance">
                  {CLUB_PROFILE.fullName}
                </h1>

                <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
                  {CLUB_PROFILE.tagline}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#ufc-join"
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-sm font-bold text-white transition-colors whitespace-nowrap"
                  >
                    <span>التسجيل في نادي UFC</span>
                    <ArrowUpLeft className="w-4 h-4" />
                  </a>

                  <a
                    href="#links-hub"
                    className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm font-semibold text-zinc-200 transition-colors whitespace-nowrap"
                  >
                    استعراض الروابط الرسمية
                  </a>

                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-[#131316] hover:border-zinc-700 text-sm font-medium text-zinc-300 transition-colors whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR المشاركة</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0D0D10]">
                  <ResilientImage
                    src={CLUB_PROFILE.heroImage}
                    alt="ملصق نادي UFC ولاية البيض وأوقات التدريب"
                    className="w-full h-auto max-h-[540px] object-contain mx-auto block"
                    fallbackTitle={CLUB_PROFILE.fullName}
                  />
                  <div className="p-4 border-t border-zinc-800 bg-[#131316]">
                    <p className="font-display text-sm sm:text-base font-bold text-white">
                      قاعة 17 أكتوبر بجانب مكتب التشغيل — ولاية البيض
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                      للاستفسار والتواصل: <span dir="ltr" className="font-mono text-zinc-200">0777309104</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CLUB_PROFILE.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-800 bg-[#131316] p-4 sm:p-5"
                >
                  <p className="font-mono text-2xl sm:text-3xl font-semibold text-white tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LinkHubSection
          links={links}
          onAddLink={handleAddLink}
          onToggleActive={handleToggleActive}
          onMoveLink={handleMoveLink}
          onDeleteLink={handleDeleteLink}
          onResetLinks={handleResetLinks}
          onTrackClick={handleTrackClick}
          onOpenModal={(id) => setActiveModal(id)}
          onOpenQr={() => setQrOpen(true)}
        />

        <ScheduleAndBooking />

        <AdminAthletesPanel />
      </main>

      <footer className="border-t border-zinc-800/80 bg-[#09090B] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-400">
          <div>
            <p className="font-display text-sm font-bold text-white">
              {CLUB_PROFILE.fullName}
            </p>
            <p className="mt-1">
              منصة الروابط الرسمية · جميع الحقوق محفوظة © {new Date().getFullYear()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a href="#links-hub" className="hover:text-white transition-colors">
              الروابط الرسمية
            </a>
            <a
              href="#ufc-join"
              className="text-red-400 hover:text-red-300 font-semibold transition-colors"
            >
              بوابة تسجيل الرياضيين
            </a>
            {isAdmin ? (
              <a href="#admin-athletes" className="hover:text-white transition-colors">
                لوحة الإدارة
              </a>
            ) : null}
          </div>
        </div>
      </footer>

      <LinkDetailModal modalId={activeModal} onClose={() => setActiveModal(null)} />
      <ShareQrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
