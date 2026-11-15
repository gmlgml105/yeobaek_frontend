import type { Route } from './navigation';

/**
 * Spring Boot MemberController 가 redirect 한 주소로 들어왔을 때 첫 화면을 고른다.
 *   /member/join  → signup (Mobile 02)
 *   /member/login → login  (Mobile 03), ?rememberEmail= 이 있으면 이메일 칸을 채운다
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
      return email ? { name: 'login', method: 'email', contact: email } : { name: 'login' };
    }
    default:
      return null;
  }
}
