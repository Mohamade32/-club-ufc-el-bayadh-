import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';

export type AthleteStatus = 'pending' | 'approved' | 'rejected';

export type AthleteDocType =
  | 'birth_certificate'
  | 'medical_certificate'
  | 'national_id'
  | 'parental_consent';

export interface StoredAthleteProfile {
  ownerUid: string;
  athleteCode: string;
  fullName: string;
  birthDate: string;
  ageYears: number;
  gender: 'ذكر' | 'أنثى';
  bloodType: string;
  address: string;
  phone: string;
  photoDataUrl: string;
  status: AthleteStatus;
  reviewNote?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StoredAthleteDocument {
  ownerUid: string;
  docType: AthleteDocType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  previewDataUrl?: string;
  updatedAt?: Timestamp;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  authError: string;
  signingIn: boolean;
  myProfile: StoredAthleteProfile | null;
  myDocuments: Record<string, StoredAthleteDocument>;
  loadingProfile: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'min.nas1207@gmail.com';

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [myProfile, setMyProfile] = useState<StoredAthleteProfile | null>(null);
  const [myDocuments, setMyDocuments] = useState<Record<string, StoredAthleteDocument>>({});
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError('');

      if (!currentUser) {
        setIsAdmin(false);
        setMyProfile(null);
        setMyDocuments({});
        setLoadingProfile(false);
        setAuthReady(true);
        return;
      }

      const isBootstrappedAdmin =
        Boolean(currentUser.emailVerified) &&
        currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL;

      if (isBootstrappedAdmin) {
        setIsAdmin(true);
      } else {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdmin(adminDoc.exists());
        } catch {
          setIsAdmin(false);
        }
      }

      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setMyProfile(null);
      setMyDocuments({});
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const profilePath = `athletes/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'athletes', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setMyProfile(snapshot.data() as StoredAthleteProfile);
        } else {
          setMyProfile(null);
        }
        setLoadingProfile(false);
      },
      (error) => {
        setLoadingProfile(false);
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    const docsPath = `athletes/${user.uid}/documents`;
    const unsubDocs = onSnapshot(
      collection(db, 'athletes', user.uid, 'documents'),
      (snapshot) => {
        const nextDocs: Record<string, StoredAthleteDocument> = {};
        snapshot.forEach((docSnap) => {
          nextDocs[docSnap.id] = docSnap.data() as StoredAthleteDocument;
        });
        setMyDocuments(nextDocs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, docsPath);
      }
    );

    return () => {
      unsubProfile();
      unsubDocs();
    };
  }, [authReady, user]);

  const signInWithGoogle = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      const msg = error instanceof Error ? error.message : String(error);
      const combined = `${code} ${msg}`;

      if (combined.includes('popup-closed-by-user') || combined.includes('cancelled-popup-request')) {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.');
      } else if (combined.includes('popup-blocked')) {
        setAuthError('يرجى السماح بالنوافذ المنبثقة لإكمال تسجيل الدخول بحساب جوجل.');
      } else if (combined.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthError(
          `هذا النطاق (${host}) غير مصرح به بعد في إعدادات Firebase Authentication. أضِف النطاق ضمن Authorized domains ثم أعد المحاولة.`
        );
      } else if (combined.includes('network-request-failed')) {
        setAuthError('تعذر الاتصال بالإنترنت لإكمال تسجيل الدخول. تحقق من الشبكة وحاول مجدداً.');
      } else {
        setAuthError('تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        authError,
        signingIn,
        myProfile,
        myDocuments,
        loadingProfile,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
