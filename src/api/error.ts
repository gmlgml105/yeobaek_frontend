/** 백엔드 오류 응답 { reason, message } 에서 reason 을 꺼낸다. 응답이 없으면(서버 꺼짐 등) 'network' */
export function errorReason(error: unknown): { status: number | null; reason: string; message: string | null } {
  const res = (error as { response?: { status?: number; data?: { reason?: string; message?: string } } })?.response;
  if (!res) return { status: null, reason: 'network', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' };
  return {
    status: res.status ?? null,
    reason: res.data?.reason ?? 'error',
    message: res.data?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  };
}
