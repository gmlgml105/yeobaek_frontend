// Spring Boot MemberAPIController(/api/member) 호출 모음
// utils/ajax.jsx 의 baseURL 이 '/api' 이므로 경로는 '/member/...' 로 쓴다 (→ /api/member/...)
import { postData } from '../utils/ajax';
import { errorReason } from './error';

/** 백엔드 MemberDTO 와 같은 필드 이름 */
export interface JoinRequest {
  memberEmail?: string;
  memberPhone?: string;
  memberPassword: string;
  memberName?: string;
  memberAlias?: string;
  memberBio?: string;
}

export type JoinResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'not_verified' | 'invalid' | 'network' | 'error'; message: string | null };

/** POST /api/member/join → { message: '회원가입 성공' } (signup 인증코드 확인을 마친 연락처만 가입 가능) */
export async function join(member: JoinRequest): Promise<JoinResult> {
  try {
    await postData('/member/join', member);
    return { ok: true };
  } catch (error) {
    const e = errorReason(error);
    return { ok: false, reason: e.reason as 'duplicate' | 'not_verified' | 'invalid' | 'network' | 'error', message: e.message };
  }
}
