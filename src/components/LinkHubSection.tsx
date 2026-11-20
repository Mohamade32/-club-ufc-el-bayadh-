import { FormEvent, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpLeft,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Instagram,
  Link2,
  MapPin,
  MessageSquare,
  Plus,
  QrCode,
  RotateCcw,
  Shield,
  Trash2,
  Trophy,
  Video,
} from 'lucide-react';
import { CLUB_PROFILE } from '../data/clubData';
import { useFirebase } from '../contexts/FirebaseContext';
import {
  ClubLink,
  LinkActionType,
  LinkCategory,
  ModalDetailId,
} from '../types/club';
import { ResilientImage } from './ResilientImage';

interface LinkHubSectionProps {
  links: ClubLink[];
  onAddLink: (newLink: Omit<ClubLink, 'id' | 'clicks'>) => void;
  onToggleActive: (id: string) => void;
  onMoveLink: (id: string, direction: 'up' | 'down') => void;
  onDeleteLink: (id: string) => void;
  onResetLinks: () => void;
  onTrackClick: (id: string) => void;
  onOpenModal: (modalId: ModalDetailId) => void;
  onOpenQr: () => void;
}

const CATEGORY_TABS: { id: LinkCategory; label: string }[] = [
  { id: LinkCategory.All, label: 'الكل' },
  { id: LinkCategory.Registration, label: 'التسجيل والعضوية' },
  { id: LinkCategory.Training, label: 'التدريب والجدول' },
  { id: LinkCategory.Tournaments, label: 'البطولات والنتائج' },
  { id: LinkCategory.Community, label: 'التواصل والموقع' },
];

function renderLinkIcon(iconKey: ClubLink['iconKey']) {
  const iconClass = 'w-5 h-5 text-zinc-200';
  switch (iconKey) {
    case 'join':
      return <Link2 className="w-5 h-5 text-white" />;
    case 'calendar':
      return <Calendar className={iconClass} />;
    case 'trophy':
      return <Trophy className={iconClass} />;
    case 'video':
      return <Video className={iconClass} />;
    case 'message':
      return <MessageSquare className={iconClass} />;
    case 'instagram':
      return <Instagram className={iconClass} />;
    case 'map':
      return <MapPin className={iconClass} />;
    case 'shield':
    default:
      return <Shield className={iconClass} />;
  }
}

export function LinkHubSection({
  links,
  onAddLink,
  onToggleActive,
  onMoveLink,
  onDeleteLink,
  onResetLinks,
  onTrackClick,
  onOpenModal,
  onOpenQr,
}: LinkHubSectionProps) {
  const { isAdmin } = useFirebase();
  const [workspaceMode, setWorkspaceMode] = useState<'visitor' | 'editor'>('visitor');
  const effectiveMode = isAdmin ? workspaceMode : 'visitor';
  const [activeCategory, setActiveCategory] = useState<LinkCategory>(LinkCategory.All);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<LinkCategory>(LinkCategory.Community);
  const [formError, setFormError] = useState('');

  const clubJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#${CLUB_PROFILE.joinSectionId}`
      : `#${CLUB_PROFILE.joinSectionId}`;

  const visibleLinks = links.filter((item) => {
    if (effectiveMode === 'visitor' && !item.active) return false;
    if (activeCategory === LinkCategory.All) return true;
    return item.category === activeCategory;
  });

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const handleScrollTo = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateLink = (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedTitle) {
      setFormError('يرجى إدخال عنوان الرابط.');
      return;
    }
    if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
      setFormError('يرجى إدخال رابط صحيح يبدأ بـ https:// أو http://');
      return;
    }

    const categoryLabels: Record<LinkCategory, string> = {
      [LinkCategory.All]: 'عام',
      [LinkCategory.Registration]: 'التسجيل والعضوية',
      [LinkCategory.Training]: 'التدريب والجدول',
      [LinkCategory.Tournaments]: 'البطولات والنتائج',
      [LinkCategory.Community]: 'التواصل والموقع',
    };

    onAddLink({
      title: trimmedTitle,
      subtitle: newSubtitle.trim() || 'رابط مضاف من إدارة نادي UFC الرياضي الهاوي',
      category: newCategory,
      categoryLabel: categoryLabels[newCategory],
      actionType: LinkActionType.External,
      url: trimmedUrl,
      active: true,
      iconKey: 'join',
    });

    setNewTitle('');
    setNewSubtitle('');
    setNewUrl('');
    setFormError('');
  };

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <section id="links-hub" className="py-12 border-t border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-zinc-800/80">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-[#131316]">
              <ResilientImage
                src={CLUB_PROFILE.avatarImage}
                alt={`شعار ${CLUB_PROFILE.fullName}`}
                className="w-full h-full object-cover"
                fallbackTitle="UFC"
              />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                منصة الروابط الخاصة بنادي UFC ولاية البيض
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400">
                <span dir="ltr" className="font-mono text-zinc-300">
                  {CLUB_PROFILE.handle}
                </span>
                <span aria-hidden="true">·</span>
                <span>بوابة رابط المرسل الموحدة للنادي</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{totalClicks.toLocaleString('en-US')} نقرة مسجلة</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin ? (
              <div
                className="flex items-center gap-1 p-1 rounded-lg bg-[#131316] border border-zinc-800"
                role="group"
                aria-label="وضع العرض"
              >
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('visitor')}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    effectiveMode === 'visitor'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  عرض الزائر
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('editor')}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    effectiveMode === 'editor'
                      ? 'bg-[#DC2626] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  إدارة الروابط
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => handleCopyUrl('hub-join', clubJoinUrl)}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-[#131316] hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors whitespace-nowrap"
            >
              {copiedId === 'hub-join' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedId === 'hub-join' ? 'تم نسخ رابط نادي UFC' : 'نسخ رابط نادي UFC'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenQr}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-[#131316] hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-4 h-4" />
              <span>رمز QR</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#131316] border border-zinc-800">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-[#DC2626] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {effectiveMode === 'editor' ? (
            <button
              type="button"
              onClick={onResetLinks}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الروابط الافتراضية</span>
            </button>
          ) : null}
        </div>

        {effectiveMode === 'editor' ? (
          <form
            onSubmit={handleCreateLink}
            className="mt-6 rounded-xl border border-zinc-800 bg-[#131316] p-5"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="font-display text-base font-bold text-white">
                إضافة رابط جديد إلى منصة نادي UFC
              </h3>
              <span className="text-xs text-zinc-400">يتم الحفظ تلقائياً في المتصفح</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label htmlFor="new-link-title" className="block text-xs text-zinc-400 mb-1.5">
                  عنوان الرابط
                </label>
                <input
                  id="new-link-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: جدول بطولة الهواة الشهرية"
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="md:col-span-4">
                <label htmlFor="new-link-url" className="block text-xs text-zinc-400 mb-1.5">
                  عنوان URL
                </label>
                <input
                  id="new-link-url"
                  type="url"
                  dir="ltr"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://ufc-amateur.club/..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#09090B] border border-zinc-800 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="new-link-cat" className="block text-xs text-zinc-400 mb-1.5">
                  التصنيف
                </label>
                <select
                  id="new-link-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as LinkCategory)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#09090B] border border-zinc-800 text-sm text-white focus:outline-none focus:border-[#DC2626]"
                >
                  <option value={LinkCategory.Registration}>التسجيل والعضوية</option>
                  <option value={LinkCategory.Training}>التدريب والجدول</option>
                  <option value={LinkCategory.Tournaments}>البطولات والنتائج</option>
                  <option value={LinkCategory.Community}>التواصل والموقع</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة رابط</span>
                </button>
              </div>

              <div className="md:col-span-12">
                <label htmlFor="new-link-sub" className="block text-xs text-zinc-400 mb-1.5">
                  وصف مختصر (اختياري)
                </label>
                <input
                  id="new-link-sub"
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="توضيح موجز يظهر أسفل عنوان الرابط للزوار"
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#09090B] border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#DC2626]"
                />
              </div>
            </div>

            {formError ? (
              <p className="mt-3 text-xs text-red-400 font-medium" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-3">
            {visibleLinks.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-[#131316] p-8 text-center">
                <p className="text-sm text-zinc-400">
                  لا توجد روابط مفعّلة في هذا التصنيف حالياً.
                </p>
              </div>
            ) : (
              visibleLinks.map((link, index) => {
                const isFeatured = Boolean(link.featured && effectiveMode === 'visitor');

                const cardInner = (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isFeatured
                            ? 'bg-[#DC2626] text-white'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                        }`}
                      >
                        {renderLinkIcon(link.iconKey)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-1">
                          <span className={isFeatured ? 'text-red-400 font-semibold' : ''}>
                            {link.categoryLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {link.clicks.toLocaleString('en-US')} زيارة
                          </span>
                          {!link.active ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-400">مخفي عن الزوار</span>
                            </>
                          ) : null}
                        </div>

                        <h3 className="font-display text-base font-bold text-white truncate">
                          {link.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {link.subtitle}
                        </p>
                      </div>
                    </div>

                    {effectiveMode === 'visitor' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {link.url ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyUrl(link.id, link.url!);
                            }}
                            aria-label={`نسخ رابط ${link.title}`}
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-[#09090B] text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        ) : null}
                        <span className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                          {link.actionType === LinkActionType.External ? (
                            <ExternalLink className="w-4 h-4" />
                          ) : (
                            <ArrowUpLeft className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onMoveLink(link.id, 'up')}
                          disabled={index === 0}
                          aria-label="تحريك للأعلى"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveLink(link.id, 'down')}
                          disabled={index === visibleLinks.length - 1}
                          aria-label="تحريك للأسفل"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleActive(link.id)}
                          aria-label={link.active ? 'إخفاء الرابط' : 'إظهار الرابط'}
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                        >
                          {link.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLink(link.id)}
                          aria-label="حذف الرابط"
                          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );

                if (effectiveMode === 'editor') {
                  return (
                    <div
                      key={link.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        link.active
                          ? 'border-zinc-800 bg-[#131316]'
                          : 'border-zinc-800/60 bg-[#0D0D10] opacity-75'
                      }`}
                    >
                      {cardInner}
                    </div>
                  );
                }

                if (link.actionType === LinkActionType.External && link.url) {
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onTrackClick(link.id)}
                      className={`block rounded-xl border p-4 transition-transform duration-150 hover:-translate-y-0.5 ${
                        isFeatured
                          ? 'border-[#DC2626]/60 bg-gradient-to-l from-[#1C1214] to-[#131316] hover:border-[#DC2626]'
                          : 'border-zinc-800 bg-[#131316] hover:border-zinc-600'
                      }`}
                    >
                      {cardInner}
                    </a>
                  );
                }

                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => {
                      onTrackClick(link.id);
                      if (link.actionType === LinkActionType.Scroll && link.targetSectionId) {
                        handleScrollTo(link.targetSectionId);
                      } else if (link.actionType === LinkActionType.Modal && link.modalId) {
                        onOpenModal(link.modalId);
                      }
                    }}
                    className={`w-full text-right block rounded-xl border p-4 transition-transform duration-150 hover:-translate-y-0.5 ${
                      isFeatured
                        ? 'border-[#DC2626]/60 bg-gradient-to-l from-[#1C1214] to-[#131316] hover:border-[#DC2626]'
                        : 'border-zinc-800 bg-[#131316] hover:border-zinc-600'
                    }`}
                  >
                    {cardInner}
                  </button>
                );
              })
            )}
          </div>

          <aside className="lg:col-span-4 rounded-xl border border-zinc-800 bg-[#131316] p-6 space-y-5">
            <div>
              <p className="text-xs font-medium text-zinc-400">الرابط الخاص بالنادي</p>
              <h3 className="font-display text-xl font-bold text-white mt-1">
                بوابة عضوية نادي UFC ولاية البيض
              </h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                أكمل تسجيلك مباشرة عبر الرابط الخاص بالنادي دون وسطاء خارجيين، واحصل فوراً على رقم عضوية المتدرب في النادي.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-[#09090B] p-3.5">
              <p className="text-xs text-zinc-500 mb-1">رابط التسجيل الخاص بالنادي</p>
              <p dir="ltr" className="font-mono text-xs text-zinc-200 break-all">
                {clubJoinUrl}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleScrollTo(CLUB_PROFILE.joinSectionId)}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-sm font-bold text-white transition-colors"
              >
                <span>فتح استمارة الانضمام الخاصة بالنادي</span>
                <ArrowUpLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleCopyUrl('sidebar-join', clubJoinUrl)}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-[#09090B] hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                {copiedId === 'sidebar-join' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copiedId === 'sidebar-join' ? 'تم نسخ رابط النادي' : 'نسخ رابط التسجيل للمشاركة'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenQr}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-[#09090B] hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>عرض وتحميل رمز الاستجابة السريعة</span>
              </button>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span>أوقات الاستقبال</span>
                <span className="text-zinc-200 tabular-nums">08:00 – 22:30</span>
              </div>
              <div className="flex items-center justify-between">
                <span>الفئات العمرية</span>
                <span className="text-zinc-200">ناشئين (12+) · كبار</span>
              </div>
              <div className="flex items-center justify-between">
                <span>التسجيل المباشر</span>
                <span className="text-zinc-200">بوابة النادي الخاصة</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
