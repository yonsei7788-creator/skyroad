"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { ReportPage } from "./ReportPage";

/**
 * Usable content height within an A4 page (FIXED at 297mm).
 *
 * Calculation (at 96dpi, 1mm ≈ 3.78px):
 *   A4 height          = 297mm = 1122px
 *   .page padding-top  = 20mm  =   76px
 *   .page padding-bot  = 56px  (calc(32px + 24px))
 *   .pageHeader         ≈ 50px  (text + padding-bottom 12px + margin-bottom 24px)
 *   .pageFooter bottom  = 8mm   =   30px (absolute positioned)
 *
 *   Available = 1122 - 76 - 56 - 50 = 940px → safety margin 40px → 900px
 *
 * ⚠️ 페이지 크기는 A4 고정. 컨텐츠가 넘치면 신규 페이지로 분리됨.
 */
const AVAILABLE_HEIGHT_PX = 900;

/**
 * 측정값과 실제 렌더링 간의 미세 차이를 보정하기 위한 안전 마진 (px).
 * 마지막 슬라이스의 높이에 이 값을 더해 콘텐츠 잘림을 방지합니다.
 */
const LAST_SLICE_PADDING_PX = 40;

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

export const AutoPaginatedSection = ({
  children,
  sectionTitle,
  studentName,
  startPageNumber = 0,
}: AutoPaginatedSectionProps) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const [slices, setSlices] = useState<PageSlice[]>([]);
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;

    const contentHeight = container.scrollHeight;

    if (contentHeight <= AVAILABLE_HEIGHT_PX) {
      // Single page - no splitting needed
      setSlices([{ offsetY: 0, height: contentHeight }]);
      setMeasured(true);
      return;
    }

    // Find split points using direct children as block boundaries
    const childElements = Array.from(container.children) as HTMLElement[];
    const containerTop = container.getBoundingClientRect().top;

    const blockBounds = childElements.map((child) => {
      const rect = child.getBoundingClientRect();
      const style = window.getComputedStyle(child);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      return {
        top: rect.top - containerTop - marginTop,
        height: rect.height + marginTop + marginBottom,
      };
    });

    const pages: PageSlice[] = [];
    let pageStart = 0;
    let pageEnd = 0;

    for (const block of blockBounds) {
      const blockEnd = block.top + block.height;

      if (blockEnd - pageStart > AVAILABLE_HEIGHT_PX && pageEnd > pageStart) {
        // This block overflows - finalize current page
        pages.push({
          offsetY: pageStart,
          height: pageEnd - pageStart,
        });
        pageStart = block.top;
      }
      pageEnd = blockEnd;
    }

    // Final page
    if (pageEnd > pageStart) {
      pages.push({
        offsetY: pageStart,
        height: pageEnd - pageStart,
      });
    }

    setSlices(pages);
    setMeasured(true);
  }, [children]);

  return (
    <>
      {/* Hidden measurement container — matches .page content width */}
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
        slices.map((slice, i) => {
          const isLastSlice = i === slices.length - 1;
          // 마지막 슬라이스는 측정-렌더 차이로 인한 잘림 방지를 위해 여유 높이 추가
          const sliceHeight = isLastSlice
            ? slice.height + LAST_SLICE_PADDING_PX
            : slice.height;
          return (
            <ReportPage
              key={`${sectionTitle}-p${i}`}
              pageNumber={startPageNumber > 0 ? startPageNumber + i : undefined}
              sectionTitle={sectionTitle}
              studentName={studentName}
            >
              <div
                style={{
                  height: `${sliceHeight}px`,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: `-${slice.offsetY}px`,
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {children}
                </div>
              </div>
            </ReportPage>
          );
        })}
    </>
  );
};
