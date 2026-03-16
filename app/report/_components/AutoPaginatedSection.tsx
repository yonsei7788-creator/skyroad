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
 *   .pageHeader         ≈ 52px (text + pb + mb)
 *   .pageFooter area    ≈ 40px (absolute bottom:8mm)
 *   Safety margin       = 48px
 *   Available           = 990 - 52 - 40 - 48 = 850px
 */
const AVAILABLE_HEIGHT_PX = 850;

/**
 * 빈 페이지 방지 임계값.
 * 현재 페이지 콘텐츠가 이 높이 미만이면 페이지를 끊지 않고
 * 다음 블록을 같은 페이지에 포함시킨다.
 * (예: SectionHeader만 남은 ~80px 페이지 방지)
 */
const MIN_PAGE_CONTENT_PX = 150;

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
 * 재귀적으로 블록 경계를 수집한다.
 * 직접 자식이 maxHeight보다 크면 그 자식의 하위 요소를
 * 탐색하여 더 세밀한 분할 지점을 찾는다.
 */
const collectBlockBounds = (
  element: HTMLElement,
  containerTop: number,
  maxHeight: number
): BlockBound[] => {
  const children = Array.from(element.children) as HTMLElement[];
  if (children.length === 0) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    return [
      {
        top: rect.top - containerTop - marginTop,
        height: rect.height + marginTop + marginBottom,
      },
    ];
  }

  const bounds: BlockBound[] = [];

  for (const child of children) {
    const rect = child.getBoundingClientRect();
    const style = window.getComputedStyle(child);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    const top = rect.top - containerTop - marginTop;
    const height = rect.height + marginTop + marginBottom;

    if (height > maxHeight && child.children.length > 0) {
      bounds.push(...collectBlockBounds(child, containerTop, maxHeight));
    } else {
      bounds.push({ top, height });
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

  for (const block of blockBounds) {
    const blockEnd = block.top + block.height;

    // 이 블록을 현재 페이지에 추가하면 넘치는가?
    const wouldOverflow = blockEnd - pageStart > AVAILABLE_HEIGHT_PX;

    if (wouldOverflow && pageEnd > pageStart) {
      const currentPageHeight = pageEnd - pageStart;

      // 빈 페이지 방지: 콘텐츠가 너무 적으면 페이지를 끊지 않고 합침
      if (currentPageHeight < MIN_PAGE_CONTENT_PX) {
        // 현재 블록을 합쳐서 계속 진행 (블록을 통째로 포함)
        pageEnd = blockEnd;
        continue;
      }

      // 현재 페이지 마감 → 이 블록은 다음 페이지로
      pages.push({
        offsetY: pageStart,
        height: pageEnd - pageStart,
      });
      pageStart = block.top;
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
    // 폰트 로딩 완료 후 측정하여 높이 오차 방지
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(computeSlices);
      });
    } else {
      requestAnimationFrame(computeSlices);
    }
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
