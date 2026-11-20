/**
 * Spring Boot ProfileController(/api/profile) 호출 모음
 *  - 서버 값 → 화면(worldStore Profile) 값으로 바꾸는 toLocalProfile 포함
 *  - 모든 수정 API 는 수정 후의 프로필 전체를 돌려준다
 */
import ajax from '../utils/ajax';
import type { Profile } from '../lib/worldStore';
import { errorReason } from './error';

/** GET /api/profile 응답 (ProfileResponseDTO) */
export interface ServerProfile {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  alias: string | null;
  bio: string | null;
  /** /api/files/{id}, 없으면 null */
  avatarUrl: string | null;
  preferences: string[];
  vibes: string[];
  aliasPublic: boolean;
  phonePublic: boolean;
  noteAutoSave: boolean;
  /** 팔레트 id 또는 #rrggbb */
  themeColor: string | null;
}

export interface SettingsPatch {
  preferences?: string[];
  vibes?: string[];
  aliasPublic?: boolean;
  phonePublic?: boolean;
  noteAutoSave?: boolean;
  themeColor?: string;
}

export type ProfileResult = { ok: true; profile: ServerProfile } | { ok: false; reason: string; message: string | null };

/** 서버 값 → worldStore Profile (화면이 쓰는 모양) */
export function toLocalProfile(p: ServerProfile): Partial<Profile> {
  return {
    nickname: p.alias ?? '',
    intro: p.bio ?? '',
    avatar: p.avatarUrl ?? 'initial',
    tastes: p.preferences ?? [],
    keywords: p.vibes ?? [],
    privacy: { nickname: p.aliasPublic, contact: p.phonePublic, autosave: p.noteAutoSave },
    accent: p.themeColor ?? undefined,
  };
}

async function call(request: () => Promise<{ data: unknown }>): Promise<ProfileResult> {
  try {
    const { data } = await request();
    return { ok: true, profile: data as ServerProfile };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.reason, message: e.message };
  }
}

/** GET /api/profile */
export function fetchProfile(): Promise<ProfileResult> {
  return call(() => ajax.get('/profile'));
}

/** PUT /api/profile — 닉네임 · 소개 */
export function saveProfileInfo(alias: string, bio: string): Promise<ProfileResult> {
  return call(() => ajax.put('/profile', { alias, bio }));
}

/** PATCH /api/profile/settings — 보낸 항목만 바뀐다 */
export function saveSettings(patch: SettingsPatch): Promise<ProfileResult> {
  return call(() => ajax.patch('/profile/settings', patch));
}

/** POST /api/profile/avatar — 사진 파일(또는 data URL·이미지 주소를 바꾼 Blob) 업로드 */
export function uploadAvatar(image: Blob, fileName = 'avatar.jpg'): Promise<ProfileResult> {
  const form = new FormData();
  form.append('file', image, fileName);
  return call(() => ajax.post('/profile/avatar', form));
}

/** DELETE /api/profile/avatar — 닉네임 첫 글자로 돌아감 */
export function deleteAvatar(): Promise<ProfileResult> {
  return call(() => ajax.delete('/profile/avatar'));
}

/** data URL 이나 이미지 주소(번들 이미지 등)를 업로드용 Blob 으로 */
export async function toBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  return res.blob();
}
