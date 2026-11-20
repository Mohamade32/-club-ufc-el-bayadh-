export enum LinkCategory {
  All = 'all',
  Registration = 'registration',
  Training = 'training',
  Tournaments = 'tournaments',
  Community = 'community',
}

export enum LinkActionType {
  External = 'external',
  Scroll = 'scroll',
  Modal = 'modal',
}

export type ModalDetailId = 'camp' | 'location' | 'rules';

export interface ClubLink {
  id: string;
  title: string;
  subtitle: string;
  category: LinkCategory;
  categoryLabel: string;
  actionType: LinkActionType;
  url?: string;
  targetSectionId?: string;
  modalId?: ModalDetailId;
  featured?: boolean;
  active: boolean;
  clicks: number;
  iconKey: 'join' | 'calendar' | 'trophy' | 'video' | 'message' | 'instagram' | 'map' | 'shield';
}

export interface CombatProgram {
  id: string;
  index: string;
  title: string;
  discipline: string;
  summary: string;
  metrics: string;
  image?: string;
  imageAlt?: string;
  featured?: boolean;
}

export interface TrainingSession {
  id: string;
  day: string;
  time: string;
  discipline: string;
  level: string;
  coach: string;
  matArea: string;
}

export interface CoachInfo {
  name: string;
  role: string;
  credentials: string;
  bio: string;
  recordSummary: string;
  image: string;
}
