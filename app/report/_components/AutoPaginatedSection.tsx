"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { ReportPage } from "./ReportPage";

/**
 * Usable content height within an A4 page.
 *
 * Calculation (at 96dpi, 1mm ≈ 3.78px):
 *   A4 height          = 297mm = 1122px
 *   .page padding-top  = 20mm  =   76px
 *   .page padding-bot  = 56px  (calc(32px + 24px))
 *   .pageHeader         ≈ 50px  (text + padding-bottom 12px + margin-bottom 24px)
 *   .pageFooter bottom  = 15mm  =   57px (absolute, overlap with padding-bottom)
 *
 *   Available = 1122 - 76 - 56 - 50 = 940px → safety margin 20px → 920px
 */
const AVAILABLE_HEIGHT_PX = 920;

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
          return (
            <ReportPage
              key={`${sectionTitle}-p${i}`}
              pageNumber={startPageNumber > 0 ? startPageNumber + i : undefined}
              sectionTitle={sectionTitle}
              studentName={studentName}
            >
              <div
                style={{
                  // 마지막 페이지는 height 제한 없음 (잘림 방지)
                  // 중간 페이지는 다음 페이지 콘텐츠가 보이지 않도록 제한
                  height: isLastSlice ? undefined : `${slice.height}px`,
                  minHeight: isLastSlice ? `${slice.height}px` : undefined,
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
