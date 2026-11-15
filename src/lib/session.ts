/**
 * 로그인 상태 (JWT 방식)
 * ------------------------------------------------------------
 * 백엔드 POST /api/auth/login 응답 { accessToken, member } 를 localStorage 에 보관한다.
 *  - token          : Authorization: Bearer 헤더로 보낼 액세스 토큰 (utils/ajax.jsx 가 사용)
 *  - yeobaek.member : 화면에서 쓰는 로그인 회원 정보
 * 로그인 상태 판단은 getSessionUser() 하나로 한다.
 */

export const TOKEN_KEY = 'token';
const MEMBER_KEY = 'yeobaek.member';

/** 백엔드 MemberDTO (memberPassword 는 응답에 포함되지 않음) */
export interface MemberResponse {
  id: number;
  memberEmail?: string | null;
  memberPhone?: string | null;
  memberName?: string | null;
  memberAlias?: string | null;
  memberBio?: string | null;
  memberStatus?: string | null;
  memberRole?: 'admin' | 'member' | null;
  memberLoginVerified?: boolean;
}

/** 화면에서 쓰는 로그인 회원 */
export interface SessionUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  alias?: string;
  bio?: string;
  role?: 'admin' | 'member';
}

function toSessionUser(m: MemberResponse): SessionUser {
  return {
    id: m.id,
    name: m.memberName ?? '',
    email: m.memberEmail ?? undefined,
    phone: m.memberPhone ?? undefined,
    alias: m.memberAlias ?? undefined,
    bio: m.memberBio ?? undefined,
    role: m.memberRole ?? undefined,
  };
}

export function saveSession(accessToken: string, member: MemberResponse) {
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    window.localStorage.setItem(MEMBER_KEY, JSON.stringify(toSessionUser(member)));
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
}

/** 리프레시 토큰으로 재발급된 액세스 토큰 갱신 (ajax 응답 헤더) */
export function setAccessToken(accessToken: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
  } catch {
    /* noop */
  }
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(MEMBER_KEY);
  } catch {
    /* noop */
  }
}

export function getSessionUser(): SessionUser | null {
  try {
    if (!window.localStorage.getItem(TOKEN_KEY)) return null;
    const raw = window.localStorage.getItem(MEMBER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}
