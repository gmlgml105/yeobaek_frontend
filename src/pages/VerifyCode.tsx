import { SafeForm } from '../components/SafeForm';
import { FormEvent, useEffect, useState } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { CodeInput, GuidanceCard, TestModeNotice } from '../components/AuthParts';
import { PrimaryButton } from '../components/FormControls';
import { help } from '../components/icons';
import { useAppState } from '../lib/appState';
import { Route, useNav } from '../lib/navigation';
import { useAppMenu } from '../lib/useAppMenu';
import { formatMMSS, useCountdown } from '../lib/useCountdown';
import { CODE_LENGTH, login, peekCode, sendCode, SentCode, verifyCode } from '../api/auth';
import { join } from '../api/member';
import { displayContact, normalizeContact } from '../lib/validation';

type Status = 'idle' | 'checking' | 'error' | 'success';

/**
 * Mobile 06 Verify Code · 인증코드
 *  - purpose "signup": 이메일/휴대폰 가입 인증 → POST /api/member/join → 자동 로그인 → Mobile 08 Home
 *  - purpose "reset" : 비밀번호 재설정 인증 → Mobile 07 New Password
 */
export function VerifyCode({ route }: { route: Extract<Route, { name: 'verify' }> }) {
  const { back, replace, reset } = useNav();
  const menu = useAppMenu();
  const { signupDraft, clearSignupDraft, showToast } = useAppState();
  const { purpose, method, contact } = route;
  const isEmail = method === 'email';

  const [sent, setSent] = useState<SentCode | null>(() => peekCode(purpose, method, contact));
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [resending, setResending] = useState(false);

  const remaining = useCountdown(sent?.expiresAt ?? null);
  const cooldown = useCountdown(sent?.resendAvailableAt ?? null);
  const expired = Boolean(sent) && remaining <= 0;

  useEffect(() => {
    if (sent) return;
    void sendCode(purpose, method, contact).then((r) => {
      if (r.ok) setSent(r.sent);
      else showToast(r.message ?? '인증코드를 보내지 못했어요.', 'info');
    });
  }, [sent, purpose, method, contact, showToast]);

  useEffect(() => {
    if (expired && status !== 'success') {
      setStatus('error');
      setMessage('유효시간이 지났어요. 인증코드를 다시 받아 주세요.');
    }
  }, [expired, status]);

  const onChangeCode = (v: string) => {
    setCode(v);
    if (status === 'error' && !expired && !locked) {
      setStatus('idle');
      setMessage(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'checking' || status === 'success') return;
    if (code.length < CODE_LENGTH) {
      setStatus('error');
      setMessage('인증코드 4자리를 모두 입력해 주세요.');
      return;
    }
    setStatus('checking');
    const result = await verifyCode(purpose, method, contact, code);
    if (!result.ok) {
      setStatus('error');
      if (result.reason === 'mismatch') {
        setMessage(`인증코드가 일치하지 않아요. (남은 시도 ${result.attemptsLeft}회)`);
      } else if (result.reason === 'expired' || result.reason === 'no_code') {
        setMessage('유효시간이 지났어요. 인증코드를 다시 받아 주세요.');
      } else if (result.reason === 'network' || result.reason === 'error') {
        setMessage(result.message ?? '인증코드를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } else {
        setLocked(true);
        setMessage('입력 횟수를 초과했어요. 인증코드를 다시 받아 주세요.');
      }
      return;
    }

    setStatus('success');
    setMessage('인증이 완료되었어요.');

    if (purpose === 'reset') {
      window.setTimeout(() => replace({ name: 'newPassword', method, contact }), 700);
      return;
    }

    // 인증 완료 → 백엔드에 회원 저장
    const normalized = normalizeContact(method, contact);
    const joined = await join({
      memberName: signupDraft.name.trim(),
      memberPassword: signupDraft.password,
      ...(isEmail ? { memberEmail: normalized } : { memberPhone: normalized }),
    });
    if (!joined.ok) {
      setStatus('error');
      setMessage(
        joined.reason === 'duplicate'
          ? '이미 가입된 계정이에요. 로그인 화면에서 로그인해 주세요.'
          : joined.message ?? '회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
      return;
    }

    // 가입한 정보로 바로 로그인 (JWT 를 localStorage 에 저장)
    const signedIn = await login(method, contact, signupDraft.password);
    clearSignupDraft();
    if (!signedIn.ok) {
      reset({ name: 'login', method, contact, notice: '가입이 완료되었어요. 로그인해 주세요.' });
      return;
    }
    window.setTimeout(() => reset({ name: 'home', welcome: 'signup' }), 800);
  };

  const resend = async () => {
    setResending(true);
    const next = await sendCode(purpose, method, contact);
    setResending(false);
    if (!next.ok) {
      showToast(next.message ?? '인증코드를 보내지 못했어요.', 'info');
      return;
    }
    setSent(next.sent);
    setCode('');
    setLocked(false);
    setStatus('idle');
    setMessage(null);
    showToast(`새 인증코드를 ${isEmail ? '메일' : '문자'}로 보냈어요.`, 'success');
  };

  const codeStatus = status === 'success' ? 'success' : status === 'error' ? 'error' : 'default';
  const disabled = status === 'checking' || status === 'success' || expired || locked;

  return (
    <ScreenShell
      frame="Mobile 06 Verify Code"
      tone="slate"
      surface="mist"
      title="본인 확인"
      onBack={back}
      menu={menu}
    >
      <div className="intro">
        <p className="intro-title">인증코드를 입력해 주세요</p>
        <p className="intro-sub">
          {displayContact(method, contact)}
          {isEmail ? '으로' : ' 으로'} 받은 코드를 입력해 주세요.
        </p>
      </div>

      <TestModeNotice code={expired || locked ? null : sent?.testCode ?? null} channel={method} />

      <SafeForm className="stack-18" onSubmit={onSubmit} noValidate>
        <div className="verify-input">
          <p className="verify-label" id="code-label">
            인증코드 · 영문·숫자 4자리
          </p>
          <CodeInput
            value={code}
            onChange={onChangeCode}
            status={codeStatus}
            disabled={disabled}
            describedBy={message ? 'code-message' : 'code-label'}
          />
          {message && (
            <p
              id="code-message"
              className={`verify-message ${status === 'success' ? 'is-success' : 'is-error'}`}
              role={status === 'success' ? 'status' : 'alert'}
            >
              {message}
            </p>
          )}
          <div className="verify-timer">
            <span className={expired ? 'is-expired' : undefined}>
              {expired ? '유효시간 만료' : `남은 시간 ${formatMMSS(remaining)}`}
            </span>
            <button
              type="button"
              className="link-button link-plain"
              onClick={resend}
              disabled={cooldown > 0 || resending || status === 'success'}
            >
              {resending
                ? '다시 보내는 중…'
                : cooldown > 0
                  ? `다시 보내기 · ${formatMMSS(cooldown)} 후`
                  : '인증코드 다시 보내기'}
            </button>
          </div>
        </div>

        <PrimaryButton loading={status === 'checking'} loadingText="확인 중…" disabled={disabled && status !== 'checking'}>
          {status === 'success' ? '인증 완료' : '인증 확인'}
        </PrimaryButton>
      </SafeForm>

      <GuidanceCard icon={help} title="코드를 다시 확인해 주세요">
        코드가 일치하지 않으면 {isEmail ? '메일' : '문자'}의 영문과 숫자를 확인해 주세요.
        <br />
        유효시간이 지나면 새 코드를 받을 수 있어요.
      </GuidanceCard>

      <button
        type="button"
        className="link-button link-center"
        onClick={() => back(purpose === 'signup' ? 2 : 1)}
      >
        {isEmail ? '이메일 주소 변경하기' : '휴대폰 번호 변경하기'}
      </button>
    </ScreenShell>
  );
}
