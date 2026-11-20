import { useEffect, useRef } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { refreshSession } from '../api/auth';
import { useNav } from '../lib/navigation';

/**
 * 소셜 로그인 콜백 (/oauth/callback)
 * 백엔드 OAuth2SuccessHandler 가 토큰을 HttpOnly 쿠키로 내려준 뒤 이 화면으로 보낸다.
 * POST /api/auth/refresh 로 액세스 토큰과 회원 정보를 받아 localStorage 에 저장하고 홈으로 간다.
 */
export function OAuthCallback() {
  const { reset } = useNav();
  const started = useRef(false);

  useEffect(() => {
    // StrictMode 에서 effect 가 두 번 실행돼도 한 번만 요청
    if (started.current) return;
    started.current = true;
    void refreshSession().then((result) => {
      if (result.ok) reset({ name: 'home', welcome: 'login' });
      else reset({ name: 'login', error: '소셜 로그인을 완료하지 못했어요. 다시 시도해 주세요.' });
    });
  }, [reset]);

  return (
    <ScreenShell frame="OAuth Callback" tone="brand" title="소셜 로그인">
      <div className="intro">
        <p className="intro-title">로그인하고 있어요</p>
        <p className="intro-sub">잠시만 기다려 주세요.</p>
      </div>
    </ScreenShell>
  );
}
