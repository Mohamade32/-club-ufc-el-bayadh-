import { CLUB_PROFILE } from '../data/clubData';
import { useFirebase } from '../contexts/FirebaseContext';

export function Header() {
  const { user, isAdmin, signInWithGoogle } = useFirebase();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          {CLUB_PROFILE.shortBrand}
        </a>

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400"
        >
          <a
            href="#links-hub"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1"
          >
            الروابط الرسمية
          </a>
          <a
            href="#ufc-join"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1"
          >
            بيانات الرياضي
          </a>
          {isAdmin ? (
            <a
              href="#admin-athletes"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1"
            >
              لوحة الإدارة
            </a>
          ) : null}
        </nav>

        <div className="flex items-center shrink-0">
          {user ? (
            <a
              href="#ufc-join"
              className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
            >
              ملف الرياضي
            </a>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
            >
              دخول / تسجيل الرياضي
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
