import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, X } from 'lucide-react';
import { CLUB_PROFILE } from '../data/clubData';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareQrModal({ isOpen, onClose }: ShareQrModalProps) {
  const [qrTarget, setQrTarget] = useState<'join' | 'hub'>('join');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const activeUrl =
    qrTarget === 'join'
      ? `${origin}#ufc-join`
      : `${origin}#links-hub`;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    QRCode.toString(activeUrl, {
      type: 'svg',
      margin: 2,
      width: 220,
      color: {
        dark: '#09090B',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (!cancelled) {
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ufc-amateur-${qrTarget}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleJumpToJoin = () => {
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
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-[#131316] p-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h3 id="qr-modal-title" className="font-display text-lg font-bold text-white">
              مشاركة رابط نادي UFC ورمز QR
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {CLUB_PROFILE.fullName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المشاركة"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setQrTarget('join')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              qrTarget === 'join'
                ? 'bg-[#DC2626] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            رابط التسجيل في نادي UFC
          </button>
          <button
            type="button"
            onClick={() => setQrTarget('hub')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              qrTarget === 'hub'
                ? 'bg-[#DC2626] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            منصة الروابط الكاملة
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-xl bg-white p-3 border border-zinc-700">
            {svgMarkup ? (
              <div
                className="w-[200px] h-[200px] [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-zinc-600">
                جاري تجهيز الرمز...
              </div>
            )}
          </div>
          <p
            dir="ltr"
            className="mt-3 font-mono text-xs text-zinc-400 text-center break-all max-w-full px-2"
          >
            {activeUrl}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>تحميل QR</span>
          </button>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleJumpToJoin}
            className="min-h-[40px] w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <span>الانتقال إلى استمارة الانضمام الخاصة بالنادي</span>
          </button>
        </div>
      </div>
    </div>
  );
}
