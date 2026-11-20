import { MapPin, ShieldCheck, Trophy, X } from 'lucide-react';
import { ModalDetailId } from '../types/club';

interface LinkDetailModalProps {
  modalId: ModalDetailId | null;
  onClose: () => void;
}

export function LinkDetailModal({ modalId, onClose }: LinkDetailModalProps) {
  if (!modalId) return null;

  const contentMap: Record<
    ModalDetailId,
    {
      title: string;
      subtitle: string;
      icon: typeof Trophy;
      rows: { label: string; detail: string }[];
      note: string;
    }
  > = {
    camp: {
      title: 'معسكر بطولة الهواة والأوزان المعتمدة',
      subtitle: 'نظام التصفيات المحلية وفق لوائح اتحاد الهواة للفنون القتالية المختلطة',
      icon: Trophy,
      rows: [
        { label: 'فئة الذبابة والديك', detail: '56.7 كغ · 61.2 كغ · 3 جولات × 3 دقائق' },
        { label: 'فئة الريشة والخفيف', detail: '65.8 كغ · 70.3 كغ · حماية الرأس والساق إلزامية' },
        { label: 'فئة الوسط والمتوسط', detail: '77.1 كغ · 83.9 كغ · فحص طبي دوري قبل النزال' },
        { label: 'موعد الميزان والتسجيل', detail: 'الجمعة الأولى من كل شهر · الساعة 16:00 مساءً' },
      ],
      note: 'يتطلب الانضمام لمعسكر البطولة إتمام 8 أسابيع من التدريب المنتظم وموافقة المدير الفني.',
    },
    rules: {
      title: 'دليل السلامة وتجهيزات التمرين الإلزامية',
      subtitle: 'شروط الدخول إلى البساط والقفص لضمان تدريب آمن خالٍ من الإصابات',
      icon: ShieldCheck,
      rows: [
        { label: 'قفازات القتال والملاكمة', detail: 'قفازات 14–16 أونصة للسبارينغ · قفازات MMA 7 أونصة للهواة' },
        { label: 'واقي الفم والأسنان', detail: 'إلزامي في جميع حصص الالتحام والسبارينغ الموجه' },
        { label: 'واقي الساق والقدم', detail: 'واقي مبطن بالكامل لتدريبات المواي تاي والركلات' },
        { label: 'النظافة والانضباط', detail: 'تقليم الأظافر، ملابس تدريب ضيقة خالية من السحابات، والالتزام بتوجيهات المدرب' },
      ],
      note: 'تتوفر عدة تجربة معقمة للمتدربين الجدد خلال الحصة التجريبية الأولى.',
    },
    location: {
      title: 'موقع الصالة ومواعيد العمل اليومية',
      subtitle: 'قاعة 17 أكتوبر بجانب مكتب التشغيل — ولاية البيض',
      icon: MapPin,
      rows: [
        { label: 'ساعات العمل (السبت – الخميس)', detail: '08:00 صباحاً حتى 10:30 مساءً' },
        { label: 'الجمعة', detail: 'مخصص للاستشفاء، الميزان، والبطولات الشهرية' },
        { label: 'المرافق المتوفرة', detail: 'قفص ثماني قانوني · بساط أولمبي 240 م² · غرف تبديل واستشفاء' },
        { label: 'نقطة الاستدلال', detail: 'قاعة 17 أكتوبر، بجانب مكتب التشغيل، ولاية البيض' },
      ],
      note: 'يفضل الوصول قبل موعد الحصة بـ 15 دقيقة لإتمام التسجيل ولف الأيدي.',
    },
  };

  const info = contentMap[modalId];
  const Icon = info.icon;

  const handleGoToJoin = () => {
    onClose();
    const el = document.getElementById('ufc-join');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-800 bg-[#131316] p-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h3 id="detail-modal-title" className="font-display text-lg font-bold text-white">
                {info.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{info.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 divide-y divide-zinc-800/80 border border-zinc-800 rounded-lg bg-[#0D0D10]">
          {info.rows.map((row) => (
            <div key={row.label} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-semibold text-white">{row.label}</span>
              <span className="text-xs text-zinc-400 tabular-nums">{row.detail}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-400 leading-relaxed">{info.note}</p>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handleGoToJoin}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white transition-colors"
          >
            <span>التسجيل في نادي UFC</span>
          </button>
        </div>
      </div>
    </div>
  );
}
