"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { ReportPage } from "./ReportPage";

/**
 * Usable content height within an A4 page.
 * A4 = 297mm, padding-top 20mm, padding-bottom ~15mm + footer ~12mm + header ~10mm
 * Available ≈ 240mm ≈ 907px → generous safety margin → 860px
 * (reduced from 890px to prevent PDF page overflow / clipping)
 */
const AVAILABLE_HEIGHT_PX = 860;

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
        ))}
    </>
  );
};
