import type { Route } from './navigation';

/** 백엔드가 보내 주는 ?oauthError=<reason> 별 안내 문구 (OAuthLoginService) */
const OAUTH_ERRORS: Record<string, string> = {
  no_email: '소셜 계정에서 이메일을 받지 못했어요. 이메일 제공에 동의한 뒤 다시 시도해 주세요.',
  unavailable: '이용할 수 없는 계정이에요. 고객센터에 문의해 주세요.',
  failed: '소셜 로그인을 완료하지 못했어요. 다시 시도해 주세요.',
};

/**
 * 백엔드가 redirect 한 주소로 들어왔을 때 첫 화면을 고른다.
 *   /member/join    → signup (Mobile 02)
 *   /member/login   → login  (Mobile 03)
 *                     ?rememberEmail= 이 있으면 이메일 칸을 채우고, ?oauthError= 가 있으면 안내 문구를 보여 준다
 *   /oauth/callback → 소셜 로그인 완료 (OAuthCallback)
 * 그 외 경로는 null (기존처럼 splash 부터 시작)
 */
export function routeFromLocation(): Route | null {
  const path = window.location.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search);

  switch (path) {
    case '/member/join':
      return { name: 'signup' };
    case '/member/login': {
      const email = params.get('rememberEmail');
      const oauthError = params.get('oauthError');
      const error = oauthError ? OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.failed : undefined;
      if (oauthError) clearAddress();
      return email ? { name: 'login', method: 'email', contact: email, error } : { name: 'login', error };
    }
    case '/oauth/callback':
      // 새로고침해도 콜백이 다시 돌지 않도록 주소를 / 로 바꿔 둔다
      clearAddress();
      return { name: 'oauthCallback' };
    default:
      return null;
  }
}

function clearAddress() {
  try {
    window.history.replaceState(window.history.state, '', '/');
  } catch {
    /* 주소를 바꿀 수 없는 환경이면 그대로 둔다 */
  }
}
