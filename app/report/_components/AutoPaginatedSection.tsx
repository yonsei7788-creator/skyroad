"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ReportPage } from "./ReportPage";

/**
 * A4 페이지 내 가용 콘텐츠 높이 (px).
 *
 * CSS 기준 (96dpi: 1mm ≈ 3.78px):
 *   A4 height          = 297mm ≈ 1122px  (border-box)
 *   .page padding-top  = 20mm  ≈   76px
 *   .page padding-bot  = calc(32px + 24px) = 56px
 *   Content box         = 1122 - 76 - 56 = 990px
 *   .pageHeader         ≈ 57px (overline text + pb 12 + border 1 + mb 24)
 *   .pageFooter         = absolute bottom:8mm → content box 하단과 일치
 *   Safety margin       = 16px
 *   Available           = 990 - 57 - 16 ≈ 916px
 */
const AVAILABLE_HEIGHT_PX = 916;

/**
 * 빈 페이지 방지 임계값.
 * 현재 페이지 콘텐츠가 이 높이 미만이면 페이지를 끊지 않고
 * 다음 블록을 같은 페이지에 포함시킨다.
 * (예: SectionHeader만 남은 ~80px 페이지 방지)
 */
const MIN_PAGE_CONTENT_PX = 150;

/**
 * 페이지 끝 여유 공간 임계값.
 * 현재 블록 뒤 페이지 남은 공간이 이 값 미만이면,
 * 이 블록을 현재 페이지에 넣지 않고 다음 페이지로 넘긴다.
 * (제목만 페이지 끝에 걸리는 것 방지)
 */
const MIN_REMAINING_PX = 200;

/**
 * "제목급" 블록 높이 임계값.
 * MIN_REMAINING_PX 로직은 제목(헤더)만 페이지 하단에 고립되는 것을 방지하기 위한 것이므로,
 * 이 높이 이하인 블록만 "제목급"으로 간주하여 다음 페이지로 넘긴다.
 * 콘텐츠 블록(개선 방향/예시 등)은 이 임계를 초과하므로 현재 페이지에 유지된다.
 */
const MAX_TITLE_BLOCK_HEIGHT_PX = 80;

interface AutoPaginatedSectionProps {
  children: ReactNode;
  sectionTitle: string;
  studentName: string;
  startPageNumber?: number;
}

interface PageSlice {
  offsetY: number;
  height: number;
}

interface BlockBound {
  top: number;
  height: number;
}

/**
 * 요소의 경계를 측정한다.
 */
const measureBound = (el: HTMLElement, containerTop: number): BlockBound => {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const mt = parseFloat(style.marginTop) || 0;
  const mb = parseFloat(style.marginBottom) || 0;
  return {
    top: rect.top - containerTop - mt,
    height: rect.height + mt + mb,
  };
};

/**
 * 재귀적으로 블록 경계를 수집한다.
 * 직접 자식이 maxHeight보다 크면 그 자식의 하위 요소를
 * 탐색하여 더 세밀한 분할 지점을 찾는다.
 *
 * 핵심: 재귀 분해 시 첫 번째 자식(제목)과 두 번째 자식(콘텐츠)을
 * 하나의 블록으로 합쳐서 제목만 분리되는 것을 방지한다.
 */
const collectBlockBounds = (
  element: HTMLElement,
  containerTop: number,
  maxHeight: number
): BlockBound[] => {
  const children = Array.from(element.children) as HTMLElement[];
  if (children.length === 0) {
    return [measureBound(element, containerTop)];
  }

  const bounds: BlockBound[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const bound = measureBound(child, containerTop);

    if (bound.height > maxHeight && child.children.length > 0) {
      const subBounds = collectBlockBounds(child, containerTop, maxHeight);

      // 재귀 분해 결과에서 첫 번째(제목)와 두 번째(콘텐츠)를 합침
      if (subBounds.length >= 2 && subBounds[0].height < MIN_REMAINING_PX) {
        const merged: BlockBound = {
          top: subBounds[0].top,
          height: subBounds[1].top + subBounds[1].height - subBounds[0].top,
        };
        bounds.push(merged);
        bounds.push(...subBounds.slice(2));
      } else {
        bounds.push(...subBounds);
      }
    } else {
      bounds.push(bound);
    }
  }

  return bounds;
};

/**
 * 블록 경계 목록을 페이지 슬라이스로 변환한다.
 *
 * 핵심 규칙:
 * - 블록 단위로만 페이지를 나눈다 (px 단위 강제 분할 없음)
 * - 블록이 페이지보다 커도 잘리지 않고 통째로 배치된다
 * - 현재 페이지 콘텐츠가 MIN_PAGE_CONTENT_PX 미만이면 다음 블록과 합친다
 */
const buildPageSlices = (blockBounds: BlockBound[]): PageSlice[] => {
  const pages: PageSlice[] = [];
  let pageStart = 0;
  let pageEnd = 0;

  for (let i = 0; i < blockBounds.length; i++) {
    const block = blockBounds[i];
    const blockEnd = block.top + block.height;

    // 이 블록을 현재 페이지에 추가하면 넘치는가?
    const wouldOverflow = blockEnd - pageStart > AVAILABLE_HEIGHT_PX;

    if (wouldOverflow && pageEnd > pageStart) {
      const currentPageHeight = pageEnd - pageStart;

      // 빈 페이지 방지: 콘텐츠가 너무 적으면 페이지를 끊지 않고 합침
      if (currentPageHeight < MIN_PAGE_CONTENT_PX) {
        pageEnd = blockEnd;
        continue;
      }

      // 현재 페이지 마감 → 이 블록은 다음 페이지로
      pages.push({
        offsetY: pageStart,
        height: pageEnd - pageStart,
      });
      pageStart = block.top;
    } else if (!wouldOverflow && i + 1 < blockBounds.length) {
      // 이 블록은 들어가지만, 이 블록 뒤 남은 공간이 너무 적으면
      // (다음 블록과 함께 못 들어갈 높이) 이 블록까지 포함하고 페이지를 끊음
      const remainingAfter = AVAILABLE_HEIGHT_PX - (blockEnd - pageStart);
      if (
        remainingAfter < MIN_REMAINING_PX &&
        block.height <= MAX_TITLE_BLOCK_HEIGHT_PX
      ) {
        // 이 블록이 작은 블록(제목 등)이고 뒤에 공간이 부족하면 → 다음 페이지로 넘김
        if (pageEnd > pageStart) {
          pages.push({
            offsetY: pageStart,
            height: pageEnd - pageStart,
          });
        }
        pageStart = block.top;
      }
    }

    pageEnd = blockEnd;
  }

  // 마지막 페이지
  if (pageEnd > pageStart) {
    pages.push({
      offsetY: pageStart,
      height: pageEnd - pageStart,
    });
  }

  return pages;
};

export const AutoPaginatedSection = ({
  children,
  sectionTitle,
  studentName,
  startPageNumber = 0,
}: AutoPaginatedSectionProps) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number>(0);
  const [slices, setSlices] = useState<PageSlice[]>([]);
  const [measured, setMeasured] = useState(false);

  const computeSlices = useCallback(() => {
    const container = measureRef.current;
    if (!container) return;

    const contentHeight = container.scrollHeight;

    if (contentHeight <= AVAILABLE_HEIGHT_PX) {
      setSlices([{ offsetY: 0, height: contentHeight }]);
      setMeasured(true);
      return;
    }

    const containerTop = container.getBoundingClientRect().top;

    const blockBounds = collectBlockBounds(
      container,
      containerTop,
      AVAILABLE_HEIGHT_PX
    );

    const pages = buildPageSlices(blockBounds);

    setSlices(pages);
    setMeasured(true);
  }, []);

  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;

    let cancelled = false;

    const loadFontsAndMeasure = async () => {
      // 측정 컨테이너의 실제 텍스트를 추출하여
      // 해당 문자에 필요한 dynamic-subset 폰트를 명시적으로 로드
      const textContent = container.textContent ?? "";
      if (textContent && document.fonts?.load) {
        await document.fonts.load('16px "Pretendard Variable"', textContent);
      }
      await document.fonts.ready;
      // 폰트 로드 후 reflow 반영을 위해 2프레임 대기
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      if (!cancelled) computeSlices();

      // Safari는 dynamic-subset 폰트 로드가 지연될 수 있으므로
      // 추가 대기 후 높이가 변했으면 재측정
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      if (!cancelled && container.scrollHeight !== prevHeight.current) {
        prevHeight.current = container.scrollHeight;
        computeSlices();
      }
    };

    prevHeight.current = container.scrollHeight;
    loadFontsAndMeasure();

    return () => {
      cancelled = true;
    };
  }, [children, computeSlices]);

  return (
    <>
      {/* Hidden measurement container — A4 content width 고정 */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          visibility: "hidden",
          position: "absolute",
          left: "-9999px",
          width: "174mm", // 210mm page - 18mm×2 horizontal padding
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {children}
      </div>

      {/* Paginated output */}
      {measured &&
        slices.map((slice, i) => (
          <ReportPage
            key={`${sectionTitle}-p${i}`}
            pageNumber={startPageNumber > 0 ? startPageNumber + i : undefined}
            sectionTitle={sectionTitle}
            studentName={studentName}
          >
            <div
              style={{
                height: `${slice.height}px`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: `-${slice.offsetY}px`,
                  left: 0,
                  width: "174mm", // 측정 컨테이너와 동일한 너비로 고정
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {children}
              </div>
            </div>
          </ReportPage>
        ))}
    </>
  );
};
