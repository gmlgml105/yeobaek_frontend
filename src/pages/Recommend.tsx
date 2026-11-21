
import { useEffect } from 'react';
import { ScreenShell } from '../components/ScreenShell';
import { BellButton, BottomNav } from '../components/TripParts';
import { MapStop, MiniMap } from '../components/WorldParts';
import { useAppState } from '../lib/appState';
import { formatMDW } from '../lib/dates';
import { Route, useNav } from '../lib/navigation';
import { isDemoArea } from '../lib/nearby';
import { useRecommend } from '../hooks/useRecommend';

/** 기존 일정 핀 위치 — 실제 좌표가 아닌 예시 좌표 */
const STOP_POS: [number, number][] = [
  [44, 86],
  [70, 66],
  [80, 30],
  [40, 34],
  [22, 58],
  [56, 14],
  [30, 12],
  [62, 50],
];

/** Mobile 13 · 오늘의 동선 / AI 추천 진입 */
export function Recommend({
  route,
}: {
  route: Extract<Route, { name: 'nearby' }>;
}) {
  const { back, canGoBack, reset, push } = useNav();
  const { showToast } = useAppState();

  const n = useRecommend(route.tripId, route.day);

  useEffect(() => {
    if (!n.trip) {
      reset({ name: 'schedules' });
    }
  }, [n.trip, reset]);

  if (!n.trip) return null;

  const trip = n.trip;
  const city = trip.destination?.city ?? '여행지';

  // 기존 여행 일정만 지도에 표시
  const stops: MapStop[] = [
    ...n.activities
      .slice(0, STOP_POS.length)
      .map((a, i) => ({
        id: a.id,
        x: STOP_POS[i][0],
        y: STOP_POS[i][1],
        label:
          a.place.length > 9
            ? `${a.place.slice(0, 9)}…`
            : a.place,
        kind: 'stop' as const,
        num: i + 1,
      })),
    {
      id: 'me',
      x: 66,
      y: 46,
      label: '여백 시작 위치',
      kind: 'me' as const,
    },
  ];

  // AI 추천 페이지 이동
  const goToAIRecommend = () => {
    push({
      name: 'suggestions',
      tripId: trip.id,
      day: route.day,
    });
  };

  return (
    <ScreenShell
      frame="Mobile 13 AI Nearby Recommendations"
      tone="brand"
      title="근처 AI 추천"
      subtitle="오늘의 여행 동선을 확인해 보세요"
      onBack={
        canGoBack
          ? back
          : () => reset({ name: 'schedules' })
      }
      trailing={<BellButton />}
      contentClassName="nearby-content"
      bottomNav={<BottomNav active="schedule" />}
    >
      {/* 1. 여행 동선 지도 */}
      <div>
        <h2 className="nearby-place-title">
          {city} · {formatMDW(route.day)}
        </h2>

        <p className="nearby-place-sub">
          오늘의 여행 동선
        </p>
      </div>

      <MiniMap
        stops={stops}
        route
        labels={[
          {
            x: 6,
            y: 4,
            text: isDemoArea(trip)
              ? '예시 지도'
              : '우다가와초',
            tone: 'blue',
          },
          {
            x: 62,
            y: 6,
            text: '미야시타 공원',
            tone: 'blue',
          },
          {
            x: 78,
            y: 86,
            text: '시부야역',
            tone: 'blue',
          },
          {
            x: 4,
            y: 90,
            text: '도보 추천 경로',
          },
        ]}
        onLocate={() =>
          showToast(
            '현재 위치는 위치 권한·지도 API 연결이 필요해요. 지금은 예시 지도예요.'
          )
        }
        caption="지도 모양 예시 · 실제 지도 아님"
      />

      {/* 2. 오늘 일정 미리보기 */}
      <section
        className="preview-card"
        aria-labelledby="preview-title"
      >
        <div className="section-row">
          <h2 id="preview-title">
            오늘 일정 미리보기
          </h2>
        </div>

        <ol>
          {n.activities.map((a) => (
            <li key={a.id}>
              <span className="preview-time">
                {a.time}
              </span>

              <span>
                <strong>{a.place}</strong>

                <small>
                  {a.source === 'ai'
                    ? 'AI 추천 · 좋아요로 추가됨'
                    : a.memo || '직접 작성한 일정'}
                </small>
              </span>
            </li>
          ))}

          {n.activities.length === 0 && (
            <li className="preview-empty">
              아직 이 날의 일정이 없어요.
            </li>
          )}
        </ol>
      </section>

      {/* 3. AI 추천 버튼 */}
      <section className="nearby-ai-entry">
        <div className="nearby-ai-entry-heading">
          <span
            className="nearby-ai-entry-icon"
            aria-hidden="true"
          >
            ✦
          </span>

          <h2>빈 여백을 AI가 채워줘요</h2>
        </div>

        <p className="nearby-ai-entry-description">
          오늘 일정의 빈 시간에 들를 만한
          근처 장소를 추천받아 보세요.
        </p>

        <button
          type="button"
          className="nearby-ai-entry-button"
          onClick={goToAIRecommend}
        >
          AI 추천받기
        </button>
      </section>
    </ScreenShell>
  );
}
