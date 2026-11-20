/**
 * Spring Boot AuthController(/api/auth) 호출 모음
 *  login · logout · 인증코드 발송/확인 · 비밀번호 재설정
 */
import { postData } from '../utils/ajax';
import { clearSession, MemberResponse, saveSession, SessionUser, getSessionUser } from '../lib/session';
import { ContactMethod, normalizeContact } from '../lib/validation';
import { errorReason } from './error';

export type CodePurpose = 'signup' | 'reset';

/** 백엔드 VerificationService 와 같은 규칙 */
export const CODE_LENGTH = 4;

export interface SentCode {
  expiresAt: number;
  resendAvailableAt: number;
  /** 백엔드 verification.expose-code=true(개발용)일 때만 내려온다 */
  testCode?: string | null;
}

type Fail<R extends string> = { ok: false; reason: R | 'network' | 'error'; message: string | null };

// ---------------------------------------------------------------------------
// 로그인 · 로그아웃
// ---------------------------------------------------------------------------

export type LoginResult = { ok: true; user: SessionUser } | Fail<'invalid'>;

/** POST /api/auth/login → { accessToken, member } 를 localStorage 에 저장 */
export async function login(method: ContactMethod, contact: string, password: string): Promise<LoginResult> {
  try {
    const { data } = await postData('/auth/login', {
      loginId: normalizeContact(method, contact),
      memberPassword: password,
    });
    const { accessToken, member } = data as { accessToken: string; member: MemberResponse };
    saveSession(accessToken, member);
    return { ok: true, user: getSessionUser() as SessionUser };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.status === 401 ? 'invalid' : (e.reason as 'network' | 'error'), message: e.message };
  }
}

/** POST /api/auth/refresh — 리프레시 토큰 쿠키로 { accessToken, member } 를 받아 저장 (소셜 로그인 콜백) */
export async function refreshSession(): Promise<LoginResult> {
  try {
    const { data } = await postData('/auth/refresh');
    const { accessToken, member } = data as { accessToken: string; member: MemberResponse };
    saveSession(accessToken, member);
    return { ok: true, user: getSessionUser() as SessionUser };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.status === 401 ? 'invalid' : (e.reason as 'network' | 'error'), message: e.message };
  }
}

/** POST /api/auth/logout (토큰 쿠키 삭제) + localStorage 정리. 서버 오류가 나도 화면은 로그아웃한다 */
export async function logout(): Promise<void> {
  try {
    await postData('/auth/logout');
  } catch {
    /* 서버가 꺼져 있어도 로그아웃은 진행 */
  }
  clearSession();
}

// ---------------------------------------------------------------------------
// 인증코드
// ---------------------------------------------------------------------------

const sentCache = new Map<string, SentCode>();
const cacheKey = (purpose: CodePurpose, method: ContactMethod, contact: string) =>
  `${purpose}:${method}:${normalizeContact(method, contact)}`;

type SendFailReason = 'duplicate' | 'not_found' | 'cooldown' | 'send_failed';
export type SendResult = { ok: true; sent: SentCode } | Fail<SendFailReason>;

/** POST /api/auth/code/send — 가입이면 중복(409 duplicate), 재설정이면 없는 계정(404 not_found) */
export async function sendCode(purpose: CodePurpose, method: ContactMethod, contact: string): Promise<SendResult> {
  try {
    const { data } = await postData('/auth/code/send', {
      purpose,
      method,
      contact: normalizeContact(method, contact),
    });
    const sent = data as SentCode;
    sentCache.set(cacheKey(purpose, method, contact), sent);
    return { ok: true, sent };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.reason as SendFailReason, message: e.message };
  }
}

/** 마지막으로 받은 발송 정보 (화면 이동 후 타이머 복원용, 이 탭의 메모리에만 있음) */
export function peekCode(purpose: CodePurpose, method: ContactMethod, contact: string): SentCode | null {
  return sentCache.get(cacheKey(purpose, method, contact)) ?? null;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'mismatch'; attemptsLeft: number }
  | { ok: false; reason: 'expired' | 'too_many' | 'no_code' | 'network' | 'error'; message?: string | null };

/** POST /api/auth/code/verify → { ok, reason?, attemptsLeft? } */
export async function verifyCode(
  purpose: CodePurpose,
  method: ContactMethod,
  contact: string,
  code: string,
): Promise<VerifyResult> {
  try {
    const { data } = await postData('/auth/code/verify', {
      purpose,
      method,
      contact: normalizeContact(method, contact),
      code,
    });
    const r = data as { ok: boolean; reason?: string; attemptsLeft?: number };
    if (r.ok) {
      sentCache.delete(cacheKey(purpose, method, contact));
      return { ok: true };
    }
    if (r.reason === 'mismatch') return { ok: false, reason: 'mismatch', attemptsLeft: r.attemptsLeft ?? 0 };
    return { ok: false, reason: (r.reason ?? 'error') as 'expired' | 'too_many' | 'no_code' | 'error' };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.reason === 'network' ? 'network' : 'error', message: e.message };
  }
}

// ---------------------------------------------------------------------------
// 비밀번호 재설정
// ---------------------------------------------------------------------------

type ResetFailReason = 'not_found' | 'same_as_before' | 'not_verified';
export type ResetResult = { ok: true } | Fail<ResetFailReason>;

/** POST /api/auth/password/reset (reset 인증코드 확인 후) */
export async function resetPassword(method: ContactMethod, contact: string, newPassword: string): Promise<ResetResult> {
  try {
    await postData('/auth/password/reset', { method, contact: normalizeContact(method, contact), newPassword });
    return { ok: true };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.reason as ResetFailReason, message: e.message };
  }
}
