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
 *   .pageHeader         ≈ 58px
 *   Available           = 990 - 58 = 932px
 *
 * ⚠️ 여유 마진 132px 적용 → 실측이 아닌 측정 기반이므로
 *    미리보기-PDF 간 너비 차이에 의한 높이 편차를 충분히 흡수해야 함.
 */
const AVAILABLE_HEIGHT_PX = 800;

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
 * 단일 블록이 여전히 페이지 높이를 초과하면 강제 분할한다.
 */
const buildPageSlices = (blockBounds: BlockBound[]): PageSlice[] => {
  const pages: PageSlice[] = [];
  let pageStart = 0;
  let pageEnd = 0;

  for (const block of blockBounds) {
    const blockEnd = block.top + block.height;

    // 단일 블록이 페이지 높이를 초과하는 경우 강제 분할
    if (block.height > AVAILABLE_HEIGHT_PX) {
      if (pageEnd > pageStart) {
        pages.push({
          offsetY: pageStart,
          height: pageEnd - pageStart,
        });
      }

      let cursor = block.top;
      while (cursor < blockEnd) {
        const remaining = blockEnd - cursor;
        if (remaining <= AVAILABLE_HEIGHT_PX) {
          pageStart = cursor;
          pageEnd = blockEnd;
          break;
        }
        pages.push({
          offsetY: cursor,
          height: AVAILABLE_HEIGHT_PX,
        });
        cursor += AVAILABLE_HEIGHT_PX;
      }
      continue;
    }

    if (blockEnd - pageStart > AVAILABLE_HEIGHT_PX && pageEnd > pageStart) {
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
      computeSlices();
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
