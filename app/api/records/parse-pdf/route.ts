import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// pdfjs-dist worker를 직접 import하여 fake worker 오류 방지
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { createClient } from "@/libs/supabase/server";
import { createAdminClient } from "@/libs/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

interface Line {
  y: number;
  pageNum: number;
  items: TextItem[];
}

interface GlobalLine extends Line {
  globalY: number;
}

// ─── PDF Text Extraction ────────────────────────────────────────────────────

/**
 * Page noise threshold: items with localY >= 670 are page footers/watermarks/
 * page info bars. These MUST be filtered out before any parsing.
 *
 * Verified facts (Y measured from top of page, viewport height ~842):
 * - localY=683: "반", "번호", "성명", student info (page info bar)
 * - localY=685: School name, date, page number
 * - localY=824: "◆ 본 문서는 '나이스 민원서류 검증' 앱을..." (footer watermark)
 * - Content never exceeds localY=650
 */
const NOISE_Y_MAX = 670;
const Y_TOLERANCE = 3;

const extractAllLines = async (
  pdfBuffer: ArrayBuffer
): Promise<GlobalLine[]> => {
  const data = new Uint8Array(pdfBuffer);
  const loadingTask = getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const allLines: GlobalLine[] = [];
  let yOffset = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const rawItems = textContent.items as unknown as {
      str: string;
      transform: number[];
      width: number;
    }[];

    const items: TextItem[] = rawItems
      .filter((item) => item.str && item.str.trim() !== "")
      .map((item) => {
        const tx = item.transform;
        return {
          text: item.str.trim(),
          x: Math.round(tx[4]),
          y: Math.round(viewport.height - tx[5]),
          width: Math.round(item.width),
          fontSize: Math.round(tx[0]),
        };
      })
      // CRITICAL: Filter out page noise (footers, watermarks, page info bars)
      .filter((item) => item.y < NOISE_Y_MAX);

    // Group by Y with tolerance
    const used = new Set<number>();
    const sortedByY = [...items].sort((a, b) => a.y - b.y);
    const pageLines: Line[] = [];

    for (let i = 0; i < sortedByY.length; i++) {
      if (used.has(i)) continue;
      const lineY = sortedByY[i].y;
      const lineItems: TextItem[] = [];

      for (let j = i; j < sortedByY.length; j++) {
        if (used.has(j)) continue;
        if (Math.abs(sortedByY[j].y - lineY) <= Y_TOLERANCE) {
          lineItems.push(sortedByY[j]);
          used.add(j);
        }
      }

      lineItems.sort((a, b) => a.x - b.x);
      const avgY = Math.round(
        lineItems.reduce((sum, it) => sum + it.y, 0) / lineItems.length
      );
      pageLines.push({ y: avgY, pageNum, items: lineItems });
    }

    pageLines.sort((a, b) => a.y - b.y);

    for (const line of pageLines) {
      allLines.push({
        ...line,
        globalY: yOffset + line.y,
      });
    }

    yOffset += viewport.height;
  }

  await pdf.destroy();
  return allLines;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalizeText = (text: string): string => text.replace(/\s+/g, "");

const lineText = (line: GlobalLine): string =>
  line.items.map((it) => it.text).join(" ");

const lineTextNormalized = (line: GlobalLine): string =>
  normalizeText(lineText(line));

/** Find the nearest sub-header X position for a given data cell X */
const findNearestColumn = (
  cellX: number,
  headerPositions: { x: number; label: string }[],
  tolerance: number = 20
): string | null => {
  let nearest: { x: number; label: string } | null = null;
  let minDist = Infinity;

  for (const pos of headerPositions) {
    const dist = Math.abs(cellX - pos.x);
    if (dist < minDist && dist <= tolerance) {
      minDist = dist;
      nearest = pos;
    }
  }

  return nearest ? nearest.label : null;
};

/** Parse a number from text, returning null for "." or empty */
const parseNum = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "." || trimmed === "" || trimmed === "-") return null;
  const num = Number(trimmed);
  return isNaN(num) ? null : num;
};

/** Check if a line is a repeated table header (for multi-page tables) */
const isRepeatedTableHeader = (line: GlobalLine, patterns: RegExp[]): boolean =>
  patterns.some((p) => p.test(lineTextNormalized(line)));

// ─── Section Identification ─────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  attendance: /출\s*결\s*상\s*황/,
  awards: /수\s*상\s*경\s*력/,
  certifications: /자\s*격\s*증/,
  creativeActivities: /창\s*의\s*적\s*체\s*험\s*활\s*동/,
  volunteerActivities: /봉\s*사\s*활\s*동\s*실\s*적/,
  grades: /교\s*과\s*학\s*습\s*발\s*달\s*상\s*황/,
  readingActivities: /독\s*서\s*활\s*동\s*상\s*황/,
  behavioralAssessments: /행\s*동\s*특\s*성\s*및\s*종\s*합\s*의\s*견/,
};

/** Numbered section headers like "2. 출결상황", "3. 수상경력" */
const NUMBERED_SECTION = /^\d+\./;

interface SectionRange {
  name: string;
  startIdx: number;
  endIdx: number;
}

const findSections = (lines: GlobalLine[]): SectionRange[] => {
  const sectionStarts: { name: string; idx: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const normalized = lineTextNormalized(lines[i]);
    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(normalized)) {
        // Prefer numbered section headers (e.g., "2. 출결상황")
        const hasNumber = NUMBERED_SECTION.test(normalized);
        const existing = sectionStarts.find((s) => s.name === name);
        if (!existing || hasNumber) {
          if (existing) {
            existing.idx = i;
          } else {
            sectionStarts.push({ name, idx: i });
          }
        }
        break;
      }
    }
  }

  sectionStarts.sort((a, b) => a.idx - b.idx);

  const sections: SectionRange[] = [];
  for (let i = 0; i < sectionStarts.length; i++) {
    const endIdx =
      i + 1 < sectionStarts.length ? sectionStarts[i + 1].idx : lines.length;
    sections.push({
      name: sectionStarts[i].name,
      startIdx: sectionStarts[i].idx,
      endIdx,
    });
  }

  return sections;
};

// ─── Attendance Parser ──────────────────────────────────────────────────────

interface AttendanceRow {
  id: string;
  year: number;
  totalDays: number | null;
  absenceIllness: number | null;
  absenceUnauthorized: number | null;
  absenceOther: number | null;
  latenessIllness: number | null;
  latenessUnauthorized: number | null;
  latenessOther: number | null;
  earlyLeaveIllness: number | null;
  earlyLeaveUnauthorized: number | null;
  earlyLeaveOther: number | null;
  classMissedIllness: number | null;
  classMissedUnauthorized: number | null;
  classMissedOther: number | null;
  note: string;
}

const ATTENDANCE_GROUPS = [
  "absence",
  "lateness",
  "earlyLeave",
  "classMissed",
] as const;
const ATTENDANCE_SUBTYPES = ["Illness", "Unauthorized", "Other"] as const;

const parseAttendance = (sectionLines: GlobalLine[]): AttendanceRow[] => {
  // Find the sub-header line that has "질병", "미인정", "기타" repeated 4 times
  let subHeaderLine: GlobalLine | null = null;
  let subHeaderIdx = -1;

  for (let i = 0; i < Math.min(sectionLines.length, 15); i++) {
    const line = sectionLines[i];
    const texts = line.items.map((it) => it.text);
    const illnessCount = texts.filter((t) => t === "질병").length;
    const unauthCount = texts.filter((t) => t === "미인정").length;
    if (illnessCount >= 4 && unauthCount >= 4) {
      subHeaderLine = line;
      subHeaderIdx = i;
      break;
    }
  }

  if (!subHeaderLine) {
    console.warn("[parse-pdf] Attendance sub-header not found");
    return [];
  }

  // Extract column positions from the sub-header
  const illnessItems = subHeaderLine.items.filter((it) => it.text === "질병");
  const unauthItems = subHeaderLine.items.filter((it) => it.text === "미인정");
  const otherItems = subHeaderLine.items.filter((it) => it.text === "기타");

  if (
    illnessItems.length < 4 ||
    unauthItems.length < 4 ||
    otherItems.length < 4
  ) {
    console.warn("[parse-pdf] Attendance sub-header incomplete");
    return [];
  }

  illnessItems.sort((a, b) => a.x - b.x);
  unauthItems.sort((a, b) => a.x - b.x);
  otherItems.sort((a, b) => a.x - b.x);

  const columnMap: { x: number; label: string }[] = [];
  for (let g = 0; g < 4; g++) {
    const group = ATTENDANCE_GROUPS[g];
    columnMap.push({
      x: illnessItems[g].x,
      label: `${group}${ATTENDANCE_SUBTYPES[0]}`,
    });
    columnMap.push({
      x: unauthItems[g].x,
      label: `${group}${ATTENDANCE_SUBTYPES[1]}`,
    });
    columnMap.push({
      x: otherItems[g].x,
      label: `${group}${ATTENDANCE_SUBTYPES[2]}`,
    });
  }

  let yearX = 0;
  let totalDaysX = 0;
  let noteX = 0;

  for (let i = 0; i < subHeaderIdx; i++) {
    for (const item of sectionLines[i].items) {
      if (item.text === "학년") yearX = item.x;
      if (item.text === "수업일수") totalDaysX = item.x;
      if (item.text === "특기사항") noteX = item.x;
    }
  }

  const rows: AttendanceRow[] = [];
  const dataRowYs: { year: number; globalY: number; idx: number }[] = [];

  // Pass 1: Parse data rows
  for (let i = subHeaderIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;

    const yearItem = items.find(
      (it) => Math.abs(it.x - yearX) <= 15 && /^[1-3]$/.test(it.text)
    );

    if (!yearItem) continue;

    const year = parseInt(yearItem.text, 10);
    const totalDaysItem = items.find(
      (it) =>
        it !== yearItem &&
        Math.abs(it.x - totalDaysX) <= 25 &&
        /^\d+$/.test(it.text)
    );
    const totalDays = totalDaysItem ? parseInt(totalDaysItem.text, 10) : null;

    const row: AttendanceRow = {
      id: crypto.randomUUID(),
      year,
      totalDays,
      absenceIllness: null,
      absenceUnauthorized: null,
      absenceOther: null,
      latenessIllness: null,
      latenessUnauthorized: null,
      latenessOther: null,
      earlyLeaveIllness: null,
      earlyLeaveUnauthorized: null,
      earlyLeaveOther: null,
      classMissedIllness: null,
      classMissedUnauthorized: null,
      classMissedOther: null,
      note: "",
    };

    for (const item of items) {
      if (item === yearItem || item === totalDaysItem) continue;
      if (noteX > 0 && item.x >= noteX - 10) continue;
      const colLabel = findNearestColumn(item.x, columnMap);
      if (colLabel) {
        const val = item.text === "." ? null : parseNum(item.text);
        (row as unknown as Record<string, number | null>)[colLabel] = val;
      }
    }

    rows.push(row);
    dataRowYs.push({ year, globalY: line.globalY, idx: rows.length - 1 });
  }

  // Pass 2: Collect note text by Y range
  if (noteX > 0 && dataRowYs.length > 0) {
    const sectionEndY =
      sectionLines.length > 0
        ? sectionLines[sectionLines.length - 1].globalY + 50
        : Infinity;

    for (let yi = 0; yi < dataRowYs.length; yi++) {
      const startY = dataRowYs[yi].globalY;
      const endY =
        yi + 1 < dataRowYs.length ? dataRowYs[yi + 1].globalY : sectionEndY;
      const rowIdx = dataRowYs[yi].idx;

      const noteParts: string[] = [];
      for (let i = subHeaderIdx + 1; i < sectionLines.length; i++) {
        const line = sectionLines[i];
        if (line.globalY < startY || line.globalY >= endY) continue;
        const noteItems = line.items.filter((it) => it.x >= noteX - 30);
        if (noteItems.length > 0) {
          noteParts.push(noteItems.map((it) => it.text).join(""));
        }
      }

      if (noteParts.length > 0) {
        rows[rowIdx].note = noteParts.join("");
      }
    }
  }

  for (const row of rows) {
    row.note = row.note.trim();
    if (row.note === "." || row.note === "없음") row.note = "";
  }

  rows.sort((a, b) => a.year - b.year);
  return rows;
};

// ─── Awards Parser ──────────────────────────────────────────────────────────

interface AwardRow {
  id: string;
  year: number;
  name: string;
  rank: string;
  date: string;
  organization: string;
  participants: string;
}

/** Patterns for repeated award table headers on new pages */
const AWARD_HEADER_PATTERNS = [
  /학년.*수상명/,
  /등급.*수상연월일/,
  /수여기관.*참가대상/,
  /^학년\(학기\)/,
];

const parseAwards = (sectionLines: GlobalLine[]): AwardRow[] => {
  // Find the last header line index
  let headerEndIdx = -1;
  for (let i = 0; i < Math.min(sectionLines.length, 10); i++) {
    const normalized = lineTextNormalized(sectionLines[i]);
    if (/수상명|등급|참가대상|\(학기\)|\(참가인원\)/.test(normalized)) {
      headerEndIdx = i;
    }
  }
  if (headerEndIdx === -1) return [];

  // Collect data lines (skip headers and repeated headers)
  const dataLines: GlobalLine[] = [];
  for (let i = headerEndIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (isRepeatedTableHeader(line, AWARD_HEADER_PATTERNS)) continue;
    const normalized = lineTextNormalized(line);
    if (/^학년/.test(normalized) && line.items.length <= 3) continue;
    if (/수상명/.test(normalized) && /등급/.test(normalized)) continue;
    if (/\(학기\)/.test(normalized) && /\(참가인원\)/.test(normalized))
      continue;
    dataLines.push(line);
  }

  const DATE_PATTERN = /\d{4}\.\d{2}\.\d{2}/;

  // Pass 1: Find all "date lines" (lines with a date at x≈310+)
  // Each date line anchors one award entry.
  interface DateAnchor {
    lineIdx: number;
    globalY: number;
    year: number;
  }
  const dateAnchors: DateAnchor[] = [];
  let currentYear = 0;

  for (let li = 0; li < dataLines.length; li++) {
    const line = dataLines[li];
    const yearItem = line.items.find(
      (it) => /^[1-3]$/.test(it.text) && it.x < 55
    );
    if (yearItem) currentYear = parseInt(yearItem.text, 10);

    const hasDate = line.items.some(
      (it) => it.x >= 310 && it.x < 385 && DATE_PATTERN.test(it.text)
    );
    if (hasDate) {
      dateAnchors.push({
        lineIdx: li,
        globalY: line.globalY,
        year: currentYear,
      });
    }
  }

  // Pass 2: For each date anchor, collect lines that belong to this award.
  // An award's lines = from the PREVIOUS anchor's line+1 (or start) to this anchor's line,
  // PLUS continuation lines after this anchor until the next anchor starts.
  const awards: AwardRow[] = [];

  for (let ai = 0; ai < dateAnchors.length; ai++) {
    const anchor = dateAnchors[ai];
    const prevAnchorLine = ai > 0 ? dateAnchors[ai - 1].lineIdx : -1;
    const nextAnchorLine =
      ai + 1 < dateAnchors.length
        ? dateAnchors[ai + 1].lineIdx
        : dataLines.length;

    // Collect name from lines between previous anchor and this anchor (pre-date name lines)
    const preNameParts: string[] = [];
    for (let li = prevAnchorLine + 1; li < anchor.lineIdx; li++) {
      const nameItems = dataLines[li].items.filter(
        (it) => it.x >= 85 && it.x < 220 && !/^[1-3]$/.test(it.text)
      );
      if (nameItems.length > 0) {
        preNameParts.push(nameItems.map((it) => it.text).join(""));
      }
    }

    // Collect from the anchor line itself
    const anchorLine = dataLines[anchor.lineIdx];
    const semesterItem = anchorLine.items.find(
      (it) => /^[1-2]$/.test(it.text) && it.x >= 55 && it.x < 85
    );
    const nameItems = anchorLine.items.filter(
      (it) =>
        it.x >= 85 &&
        it.x < 220 &&
        it !== semesterItem &&
        !/^[1-3]$/.test(it.text)
    );
    const rankItems = anchorLine.items.filter(
      (it) => it.x >= 220 && it.x < 310
    );
    const dateItems = anchorLine.items.filter(
      (it) => it.x >= 310 && it.x < 385 && DATE_PATTERN.test(it.text)
    );
    const orgItems = anchorLine.items.filter((it) => it.x >= 385 && it.x < 490);
    const partItems = anchorLine.items.filter(
      (it) => it.x >= 490 && !/^[1-3]$/.test(it.text) && it !== semesterItem
    );

    const name = [...preNameParts, nameItems.map((it) => it.text).join("")]
      .join("")
      .trim();
    let rank = rankItems.map((it) => it.text).join("");
    const date = dateItems.map((it) => it.text).join("");
    const org = orgItems.map((it) => it.text).join("");
    const partParts = [partItems.map((it) => it.text).join("")];

    // Collect continuation lines (after anchor, before next anchor)
    const postNameParts: string[] = [];
    for (let li = anchor.lineIdx + 1; li < nextAnchorLine; li++) {
      const line = dataLines[li];
      const contNameItems = line.items.filter(
        (it) => it.x >= 85 && it.x < 220 && !/^[1-3]$/.test(it.text)
      );
      if (contNameItems.length > 0) {
        postNameParts.push(contNameItems.map((it) => it.text).join(""));
      }
      const contRankItems = line.items.filter(
        (it) => it.x >= 220 && it.x < 310
      );
      if (contRankItems.length > 0 && !rank) {
        rank = contRankItems.map((it) => it.text).join("");
      }
      const contPartItems = line.items.filter(
        (it) => it.x >= 490 && !/^[1-3]$/.test(it.text)
      );
      if (contPartItems.length > 0) {
        partParts.push(contPartItems.map((it) => it.text).join(""));
      }
    }

    const fullName = [name, ...postNameParts].join("").trim();
    const participants = partParts.join("").trim();

    if (fullName || date) {
      awards.push({
        id: crypto.randomUUID(),
        year: anchor.year,
        name: fullName,
        rank: rank.trim(),
        date: date.trim(),
        organization: org.trim(),
        participants,
      });
    }
  }

  return awards;
};

// ─── Certifications Parser ──────────────────────────────────────────────────

interface CertificationRow {
  id: string;
  category: string;
  name: string;
  details: string;
  date: string;
  issuer: string;
}

const parseCertifications = (
  sectionLines: GlobalLine[]
): CertificationRow[] => {
  for (const line of sectionLines) {
    if (lineTextNormalized(line).includes("해당사항없음")) {
      return [];
    }
  }

  let headerIdx = -1;
  const colX = { category: 0, name: 0, details: 0, date: 0, issuer: 0 };

  for (let i = 0; i < Math.min(sectionLines.length, 10); i++) {
    const line = sectionLines[i];
    for (const item of line.items) {
      const nt = normalizeText(item.text);
      if (/구분/.test(nt) && item.x < 80) colX.category = item.x;
      if (/명칭|종류/.test(nt)) {
        colX.name = item.x;
        headerIdx = i;
      }
      if (/번호|내용/.test(nt) && item.x > 150) colX.details = item.x;
      if (/취득연월일/.test(nt)) colX.date = item.x;
      if (/발급기관/.test(nt)) colX.issuer = item.x;
    }
  }

  if (headerIdx === -1) return [];

  const certs: CertificationRow[] = [];
  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (lineTextNormalized(line).includes("해당사항없음")) break;
    if (lineTextNormalized(line).includes("국가직무능력")) break;

    const { items } = line;
    if (items.length < 2) continue;

    const catItems = items.filter((it) => it.x < colX.name - 10);
    const nameItems = items.filter(
      (it) => it.x >= colX.name - 10 && it.x < (colX.details || 200)
    );
    const detailItems = items.filter(
      (it) =>
        colX.details > 0 &&
        it.x >= colX.details - 10 &&
        it.x < (colX.date || 350)
    );
    const dateItems = items.filter(
      (it) =>
        colX.date > 0 && it.x >= colX.date - 10 && it.x < (colX.issuer || 480)
    );
    const issuerItems = items.filter(
      (it) => colX.issuer > 0 && it.x >= colX.issuer - 10
    );

    if (nameItems.length === 0 && catItems.length === 0) continue;

    certs.push({
      id: crypto.randomUUID(),
      category: catItems.map((it) => it.text).join(""),
      name: nameItems.map((it) => it.text).join(""),
      details: detailItems.map((it) => it.text).join(""),
      date: dateItems.map((it) => it.text).join(""),
      issuer: issuerItems.map((it) => it.text).join(""),
    });
  }

  return certs;
};

// ─── Creative Activities Parser ─────────────────────────────────────────────

interface CreativeActivityRow {
  id: string;
  year: number;
  area: string;
  hours: number | null;
  note: string;
}

/** Patterns for repeated creative activities table headers and section titles */
const CREATIVE_HEADER_PATTERNS = [
  /^학년영역시간특기사항$/,
  /^학년영역시간/,
  /^영역시간특기사항$/,
  /^학년$/,
  /창\s*의\s*적\s*체\s*험\s*활\s*동/,
];

const parseCreativeActivities = (
  sectionLines: GlobalLine[]
): CreativeActivityRow[] => {
  let headerIdx = -1;
  let hoursX = 0;
  let noteX = 0;

  for (let i = 0; i < Math.min(sectionLines.length, 15); i++) {
    const line = sectionLines[i];
    for (const item of line.items) {
      if (item.text === "영역") {
        headerIdx = i;
      }
      if (item.text === "시간") hoursX = item.x;
      if (item.text === "특기사항") noteX = item.x;
    }
  }

  if (headerIdx === -1) return [];

  // Pass 1: Collect year markers with globalY
  const yearMarkers: { globalY: number; year: number }[] = [];
  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (isRepeatedTableHeader(line, CREATIVE_HEADER_PATTERNS)) continue;
    const yearItem = line.items.find(
      (it) => /^[1-3]$/.test(it.text) && it.x < 65
    );
    if (yearItem) {
      yearMarkers.push({
        globalY: line.globalY,
        year: parseInt(yearItem.text, 10),
      });
    }
  }

  // Helper: find year for a given globalY using nearest preceding year marker
  // Year markers in merged cells can appear AFTER the first activity in a block,
  // so we look for the closest marker within a reasonable range.
  const findYearForActivity = (activityGlobalY: number): number => {
    if (yearMarkers.length === 0) return 1;

    // Find the year marker that best matches this activity's position.
    // The year marker may appear slightly after the first activity in a year block.
    // Strategy: find the closest year marker (before or slightly after).
    let bestYear = yearMarkers[0].year;
    for (const marker of yearMarkers) {
      if (marker.globalY <= activityGlobalY + 100) {
        bestYear = marker.year;
      }
    }
    return bestYear;
  };

  // Pass 2: Parse activities
  interface ActivityWithY extends CreativeActivityRow {
    globalY: number;
  }
  const activities: ActivityWithY[] = [];
  let currentActivity: ActivityWithY | null = null;

  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;

    if (isRepeatedTableHeader(line, CREATIVE_HEADER_PATTERNS)) {
      continue;
    }

    const areaItem = items.find(
      (it) =>
        (it.text === "자율활동" ||
          it.text === "동아리활동" ||
          it.text === "진로활동") &&
        it.x >= 80 &&
        it.x < 160
    );

    const hoursItem = items.find(
      (it) => /^\d+$/.test(it.text) && Math.abs(it.x - hoursX) <= 15
    );

    // CRITICAL: Note text starts at x≈197, NOT at the header label position
    // (header "특기사항" is at x=358 but actual text is left-aligned at x=197).
    // Use a fixed threshold of 190 for note content detection.
    const NOTE_X_THRESHOLD = 190;
    const yearItemInLine = items.find(
      (x) => /^[1-3]$/.test(x.text) && x.x < 65
    );
    const noteItems = items.filter(
      (it) =>
        it.x >= NOTE_X_THRESHOLD &&
        it !== yearItemInLine &&
        it !== areaItem &&
        it !== hoursItem
    );

    if (areaItem) {
      const area = areaItem.text;
      const hours = hoursItem ? parseInt(hoursItem.text, 10) : null;
      const noteText = noteItems.map((it) => it.text).join(" ");

      // Check if this is a duplicate from a page break (same area, hours)
      if (
        currentActivity &&
        currentActivity.area === area &&
        currentActivity.hours === hours
      ) {
        if (noteText.length > 0) {
          currentActivity.note += ` ${noteText}`;
        }
      } else {
        if (currentActivity) {
          currentActivity.note = currentActivity.note.trim();
          activities.push(currentActivity);
        }

        currentActivity = {
          id: crypto.randomUUID(),
          year: 0, // Will be assigned in post-processing
          globalY: line.globalY,
          area,
          hours,
          note: noteText,
        };
      }
    } else if (currentActivity && noteItems.length > 0) {
      const noteText = noteItems.map((it) => it.text).join(" ");
      if (noteText.length > 0 && !noteText.startsWith("봉사")) {
        currentActivity.note += ` ${noteText}`;
      }
    }
  }

  if (currentActivity) {
    currentActivity.note = currentActivity.note.trim();
    activities.push(currentActivity);
  }

  // Pass 3: Assign years based on year markers
  for (const activity of activities) {
    activity.year = findYearForActivity(activity.globalY);
  }

  // Strip the globalY field and return
  return activities.map(({ globalY: _gy, ...rest }) => rest);
};

// ─── Volunteer Activities Parser ────────────────────────────────────────────

interface VolunteerRow {
  id: string;
  year: number;
  dateRange: string;
  place: string;
  content: string;
  hours: number | null;
}

/** Patterns for repeated volunteer table headers */
const VOLUNTEER_HEADER_PATTERNS = [/학년.*일자또는기간/, /장소또는.*활동내용/];

const parseVolunteerActivities = (
  sectionLines: GlobalLine[]
): VolunteerRow[] => {
  // Find header line and dynamically detect column X positions
  let headerIdx = -1;
  let dateX = 0;
  let placeX = 0;
  let contentX = 0;
  let hoursX = 0;

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    for (const item of line.items) {
      const nt = normalizeText(item.text);
      if (/일자또는기간/.test(nt)) {
        headerIdx = i;
        dateX = item.x;
      }
      if (/장소또는/.test(nt) || /주관기관/.test(nt)) placeX = item.x;
      if (/활동내용/.test(nt)) contentX = item.x;
      if (item.text === "시간" && item.x > 400) hoursX = item.x;
    }
    if (headerIdx >= 0 && contentX > 0) break;
  }

  if (headerIdx === -1) return [];

  // Dynamic column boundaries: midpoints between header X positions
  const DATE_MIN = Math.max(dateX - 30, 60);
  const DATE_MAX = placeX > 0 ? (dateX + placeX) / 2 : dateX + 130;
  const PLACE_MIN = DATE_MAX;
  const PLACE_MAX = contentX > 0 ? (placeX + contentX) / 2 : PLACE_MIN + 130;
  const CONTENT_MIN = PLACE_MAX;
  const CONTENT_MAX = hoursX > 0 ? (contentX + hoursX) / 2 : CONTENT_MIN + 140;
  const HOURS_MIN = CONTENT_MAX;
  const HOURS_MAX = hoursX + 30;

  const volunteers: VolunteerRow[] = [];
  let currentYear = 0;
  let currentRow: VolunteerRow | null = null;

  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;

    // Skip repeated table headers
    if (isRepeatedTableHeader(line, VOLUNTEER_HEADER_PATTERNS)) {
      continue;
    }

    // Also skip header-like lines (학년, 일자 또는 기간, etc.)
    const normalized = lineTextNormalized(line);
    if (/봉사활동실적/.test(normalized) && items.length <= 3) continue;
    if (/^학년$/.test(normalized)) continue;
    if (/일자또는기간/.test(normalized) && /활동내용/.test(normalized))
      continue;

    // Year marker
    const yearItem = items.find((it) => /^[1-3]$/.test(it.text) && it.x < 60);
    if (yearItem) currentYear = parseInt(yearItem.text, 10);

    // Date item (yyyy.mm.dd pattern)
    const dateItem = items.find(
      (it) =>
        /^\d{4}\.\d{2}\.\d{2}/.test(it.text) &&
        it.x >= DATE_MIN &&
        it.x < DATE_MAX
    );

    // Place items (x 210-345)
    const placeItems = items.filter(
      (it) =>
        it.x >= PLACE_MIN &&
        it.x < PLACE_MAX &&
        it !== dateItem &&
        it !== yearItem
    );

    // Content items (x 345-495)
    const contentItems = items.filter(
      (it) =>
        it.x >= CONTENT_MIN &&
        it.x < CONTENT_MAX &&
        it !== dateItem &&
        it !== yearItem
    );

    // Hours (x 495-530, single/double digit number)
    const hoursItem = items.find(
      (it) => /^\d+$/.test(it.text) && it.x >= HOURS_MIN && it.x < HOURS_MAX
    );

    if (dateItem) {
      if (currentRow) {
        currentRow.content = currentRow.content.trim();
        currentRow.place = currentRow.place.trim();
        volunteers.push(currentRow);
      }

      currentRow = {
        id: crypto.randomUUID(),
        year: currentYear,
        dateRange: dateItem.text,
        place: placeItems.map((it) => it.text).join(""),
        content: contentItems.map((it) => it.text).join(""),
        hours: hoursItem ? parseInt(hoursItem.text, 10) : null,
      };
    } else if (currentRow) {
      // Continuation line: append content
      if (contentItems.length > 0) {
        currentRow.content += ` ${contentItems.map((it) => it.text).join("")}`;
      }
      if (placeItems.length > 0 && !currentRow.place) {
        currentRow.place += placeItems.map((it) => it.text).join("");
      }
      // Pick up hours if not yet set
      if (hoursItem && currentRow.hours === null) {
        currentRow.hours = parseInt(hoursItem.text, 10);
      }
    }
  }

  if (currentRow) {
    currentRow.content = currentRow.content.trim();
    currentRow.place = currentRow.place.trim();
    volunteers.push(currentRow);
  }

  // Fix year=0 entries (year marker appears after first entries in section)
  for (const row of volunteers) {
    if (row.year === 0) row.year = 1;
  }

  return volunteers;
};

// ─── Grades Parser ──────────────────────────────────────────────────────────

interface GeneralSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  standardDeviation: number | null;
  achievement: string;
  studentCount: number | null;
  gradeRank: number | null;
  note: string;
}

interface CareerSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  rawScore: number | null;
  average: number | null;
  achievement: string;
  studentCount: number | null;
  achievementDistribution: string;
  note: string;
}

interface ArtsPhysicalSubjectRow {
  id: string;
  year: number;
  semester: number;
  category: string;
  subject: string;
  credits: number | null;
  achievement: string;
}

const parseScoreString = (
  text: string
): {
  rawScore: number | null;
  average: number | null;
  standardDeviation: number | null;
} => {
  const match = text.match(/^(\d+(?:\.\d+)?)\/([\d.]+)(?:\(([\d.]+)\))?$/);
  if (match) {
    return {
      rawScore: parseFloat(match[1]),
      average: parseFloat(match[2]),
      standardDeviation: match[3] ? parseFloat(match[3]) : null,
    };
  }
  return { rawScore: null, average: null, standardDeviation: null };
};

const parseAchievementAndCount = (
  text: string
): { achievement: string; studentCount: number | null } => {
  const match = text.match(/^([A-E])\((\d+)\)$/);
  if (match) {
    return {
      achievement: match[1],
      studentCount: parseInt(match[2], 10),
    };
  }
  return { achievement: text, studentCount: null };
};

/** Patterns for repeated grade table headers */
const GRADE_HEADER_PATTERNS = [
  /^학기교과과목단위수/,
  /^학기교과과목/,
  /원점수\/과목평균/,
  /\(표준편차\)/,
  /\(수강자수\)/,
];

const parseGrades = (
  sectionLines: GlobalLine[]
): {
  generalSubjects: GeneralSubjectRow[];
  careerSubjects: CareerSubjectRow[];
  artsPhysicalSubjects: ArtsPhysicalSubjectRow[];
  subjectEvaluations: {
    id: string;
    year: number;
    subject: string;
    evaluation: string;
  }[];
} => {
  const generalSubjects: GeneralSubjectRow[] = [];
  const careerSubjects: CareerSubjectRow[] = [];
  const artsPhysicalSubjects: ArtsPhysicalSubjectRow[] = [];
  const subjectEvaluations: {
    id: string;
    year: number;
    subject: string;
    evaluation: string;
  }[] = [];

  let currentYear = 0;
  let currentSemester = 1; // Default to semester 1 (first rows before any marker)
  let mode: "general" | "career" | "artsPhysical" | "evaluation" | "none" =
    "none";
  let lastCategory = "";

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;
    const normalized = lineTextNormalized(line);

    // Skip repeated table headers
    if (isRepeatedTableHeader(line, GRADE_HEADER_PATTERNS)) {
      continue;
    }

    // Detect year markers like "[1학년]" "[2학년]" "[3학년]"
    if (/\[\d학년\]/.test(normalized)) {
      const m = normalized.match(/\[(\d)학년\]/);
      if (m) currentYear = parseInt(m[1], 10);
      currentSemester = 1; // Reset to 1 at start of new year
      mode = "general";
      continue;
    }

    // Detect table headers to determine mode
    if (/석차등급/.test(normalized) && !/진로선택/.test(normalized)) {
      mode = "general";
      continue;
    }
    if (/진로선택과목/.test(normalized)) {
      mode = "career";
      continue;
    }
    if (/성취도별/.test(normalized) && /분포비율/.test(normalized)) {
      if (mode !== "career") mode = "career";
      continue;
    }
    if (
      /체육/.test(normalized) &&
      /예술/.test(normalized) &&
      items.length <= 3 &&
      items[0].x < 100
    ) {
      mode = "artsPhysical";
      continue;
    }
    if (/세부능력및특기사항/.test(normalized)) {
      mode = "evaluation";
      continue;
    }
    if (/이수단위합계/.test(normalized)) {
      continue;
    }
    if (normalized === "해당사항없음") continue;

    // ── General subjects ──
    if (mode === "general") {
      const semItem = items.find((it) => /^[1-2]$/.test(it.text) && it.x < 55);
      if (semItem) {
        currentSemester = parseInt(semItem.text, 10);
      }

      const catItems = items.filter((it) => it.x >= 60 && it.x < 130);
      if (catItems.length > 0) {
        const catText = catItems.map((it) => it.text).join("");
        if (/사회|국어|수학|영어|과학|기술|제2외국어|교양/.test(catText)) {
          lastCategory = catText;
        }
      }

      const subjectItem = items.find((it) => it.x >= 130 && it.x < 210);
      const creditsItem = items.find(
        (it) => /^\d+$/.test(it.text) && it.x >= 210 && it.x < 250
      );
      const scoreItem = items.find(
        (it) => /^\d+\/[\d.]+/.test(it.text) && it.x >= 250 && it.x < 350
      );
      const achieveItem = items.find(
        (it) => /^[A-E]\(\d+\)$/.test(it.text) && it.x >= 320 && it.x < 420
      );
      const rankItem = items.find(
        (it) => /^\d+$/.test(it.text) && it.x >= 420 && it.x < 470
      );
      const noteItems = items.filter(
        (it) =>
          it.x >= 500 &&
          it !== subjectItem &&
          it !== creditsItem &&
          it !== scoreItem
      );

      if (subjectItem && scoreItem && achieveItem) {
        const { rawScore, average, standardDeviation } = parseScoreString(
          scoreItem.text
        );
        const { achievement, studentCount } = parseAchievementAndCount(
          achieveItem.text
        );

        let category = lastCategory.replace(/[・·]/g, "·").replace(/\s+/g, "");

        if (/기술.*가정/.test(category)) {
          category = "기술·가정/정보";
        } else if (/사회.*역사.*도덕/.test(category)) {
          category = "사회(역사/도덕포함)";
        }

        generalSubjects.push({
          id: crypto.randomUUID(),
          year: currentYear,
          semester: currentSemester,
          category,
          subject: subjectItem.text,
          credits: creditsItem ? parseInt(creditsItem.text, 10) : null,
          rawScore,
          average,
          standardDeviation,
          achievement,
          studentCount,
          gradeRank: rankItem ? parseInt(rankItem.text, 10) : null,
          note: noteItems
            .map((it) => it.text)
            .join(" ")
            .trim(),
        });
      }
    }

    // ── Career subjects ──
    if (mode === "career") {
      const semItem = items.find((it) => /^[1-2]$/.test(it.text) && it.x < 55);
      if (semItem) {
        currentSemester = parseInt(semItem.text, 10);
      }

      const catItems = items.filter((it) => it.x >= 60 && it.x < 130);
      if (catItems.length > 0) {
        const catText = catItems.map((it) => it.text).join("");
        if (/사회|국어|수학|영어|과학|기술|제2외국어|체육/.test(catText)) {
          lastCategory = catText;
        }
      }

      const subjectItems = items.filter((it) => it.x >= 130 && it.x < 210);
      const subjectText = subjectItems.map((it) => it.text).join("");

      const creditsItem = items.find(
        (it) => /^\d+$/.test(it.text) && it.x >= 210 && it.x < 250
      );
      const scoreItem = items.find(
        (it) => /^\d+\/[\d.]+/.test(it.text) && it.x >= 250 && it.x < 330
      );
      const achieveItem = items.find(
        (it) => /^[A-E]\(\d+\)$/.test(it.text) && it.x >= 320 && it.x < 400
      );
      const distItem = items.find(
        (it) => /[A-E]\([\d.]+\)/.test(it.text) && it.x >= 380
      );
      const noteItems = items.filter((it) => it.x >= 520);

      if (subjectText && scoreItem && achieveItem) {
        const { rawScore, average } = parseScoreString(scoreItem.text);
        const { achievement, studentCount } = parseAchievementAndCount(
          achieveItem.text
        );

        let category = lastCategory.replace(/[・·]/g, "·").replace(/\s+/g, "");

        if (
          /사회.*역사.*도덕/.test(category) ||
          /사회\(역사\/도/.test(category)
        ) {
          category = "사회(역사/도덕포함)";
        }

        careerSubjects.push({
          id: crypto.randomUUID(),
          year: currentYear,
          semester: currentSemester,
          category,
          subject: subjectText,
          credits: creditsItem ? parseInt(creditsItem.text, 10) : null,
          rawScore,
          average,
          achievement,
          studentCount,
          achievementDistribution: distItem ? distItem.text : "",
          note: noteItems
            .map((it) => it.text)
            .join(" ")
            .trim(),
        });
      }
    }

    // ── Arts/Physical subjects ──
    if (mode === "artsPhysical") {
      const semItem = items.find((it) => /^[1-2]$/.test(it.text) && it.x < 60);
      if (semItem) {
        currentSemester = parseInt(semItem.text, 10);
      }

      const catItem = items.find(
        (it) =>
          (it.text === "체육" || it.text === "예술") && it.x >= 70 && it.x < 130
      );
      const subjectItem = items.find(
        (it) =>
          (it.text === "체육" ||
            it.text === "미술" ||
            it.text === "음악" ||
            it.text === "운동과 건강") &&
          it.x >= 150 &&
          it.x < 280
      );
      const creditsItem = items.find(
        (it) => /^\d+$/.test(it.text) && it.x >= 300 && it.x < 340
      );
      const achieveItem = items.find(
        (it) => /^[A-CP]$/.test(it.text) && it.x >= 380 && it.x < 430
      );

      if (catItem && subjectItem && achieveItem) {
        artsPhysicalSubjects.push({
          id: crypto.randomUUID(),
          year: currentYear,
          semester: currentSemester,
          category: catItem.text,
          subject: subjectItem.text,
          credits: creditsItem ? parseInt(creditsItem.text, 10) : null,
          achievement: achieveItem.text,
        });
      }
    }

    // ── Subject evaluations ──
    if (mode === "evaluation") {
      const fullText = items.map((it) => it.text).join(" ");

      const subjectMatch = fullText.match(
        /^(?:\(([12])학기\))?\s*([^:：]+?)\s*[:：]\s*(.+)$/
      );

      if (subjectMatch && items[0]?.x < 50) {
        const subject = subjectMatch[2].trim();
        const evalText = subjectMatch[3].trim();

        const lastEval = subjectEvaluations[subjectEvaluations.length - 1];
        if (
          lastEval &&
          lastEval.subject === subject &&
          lastEval.year === currentYear
        ) {
          lastEval.evaluation += ` ${evalText}`;
        } else {
          subjectEvaluations.push({
            id: crypto.randomUUID(),
            year: currentYear,
            subject,
            evaluation: evalText,
          });
        }
      } else if (subjectEvaluations.length > 0 && items[0]?.x < 50) {
        const lastEval = subjectEvaluations[subjectEvaluations.length - 1];
        lastEval.evaluation += ` ${fullText}`;
      }
    }
  }

  for (const ev of subjectEvaluations) {
    ev.evaluation = ev.evaluation.trim();
  }

  return {
    generalSubjects,
    careerSubjects,
    artsPhysicalSubjects,
    subjectEvaluations,
  };
};

// ─── Reading Activities Parser ──────────────────────────────────────────────

interface ReadingRow {
  id: string;
  year: number;
  subjectOrArea: string;
  content: string;
}

/** Patterns for repeated reading activities table headers */
const READING_HEADER_PATTERNS = [/학년.*과목또는영역.*독서활동상황/];

const parseReadingActivities = (sectionLines: GlobalLine[]): ReadingRow[] => {
  let headerIdx = -1;

  for (let i = 0; i < Math.min(sectionLines.length, 10); i++) {
    const line = sectionLines[i];
    for (const item of line.items) {
      const nt = normalizeText(item.text);
      if (/과목또는영역/.test(nt)) {
        headerIdx = i;
      }
    }
  }

  if (headerIdx === -1) return [];

  // Two-pass approach: subjects appear as merged cells that may be vertically
  // centered in their content block. We need to collect all data first.

  // Pass 1: Collect all data lines with their components
  interface ReadingLine {
    idx: number;
    globalY: number;
    year: number | null;
    subject: string | null;
    contentText: string;
  }

  const dataLines: ReadingLine[] = [];

  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;

    // Skip repeated table headers
    if (isRepeatedTableHeader(line, READING_HEADER_PATTERNS)) continue;
    const normalized = lineTextNormalized(line);
    if (/^학년과목또는영역/.test(normalized)) continue;
    if (/독서활동상황/.test(normalized) && items.length <= 3) continue;

    const yearItem = items.find((it) => /^[1-3]$/.test(it.text) && it.x < 60);
    const subjectItem = items.find(
      (it) =>
        it.x >= 65 && it.x < 145 && it !== yearItem && !/^\d+$/.test(it.text)
    );
    const contentItems = items.filter((it) => it.x >= 145 && it !== yearItem);

    dataLines.push({
      idx: i,
      globalY: line.globalY,
      year: yearItem ? parseInt(yearItem.text, 10) : null,
      subject: subjectItem ? subjectItem.text : null,
      contentText: contentItems.map((it) => it.text).join(" "),
    });
  }

  // Pass 2: Find subject positions. Subject labels appear as merged cells
  // that are vertically centered. Content lines BEFORE a subject label
  // (but after the previous subject's label) belong to this subject.
  // Content lines AFTER a subject label (until the next subject) also
  // belong to this subject.

  const subjectIndices: number[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    if (dataLines[i].subject) subjectIndices.push(i);
  }

  const readings: ReadingRow[] = [];

  for (let si = 0; si < subjectIndices.length; si++) {
    const subIdx = subjectIndices[si];
    const prevSubIdx = si > 0 ? subjectIndices[si - 1] : -1;
    const nextSubIdx =
      si + 1 < subjectIndices.length
        ? subjectIndices[si + 1]
        : dataLines.length;

    // Determine year for this reading entry
    let yearForEntry = 0;
    for (let j = subIdx; j >= 0; j--) {
      if (dataLines[j].year !== null) {
        yearForEntry = dataLines[j].year as number;
        break;
      }
    }

    // Content range for this subject:
    // Start: midpoint between previous subject and this one (rounded up)
    // This handles the merged cell where content appears before the label.
    // End: midpoint between this subject and next one (rounded down)
    let rangeStart: number;
    if (prevSubIdx < 0) {
      rangeStart = 0; // First subject: include everything from start
    } else {
      // Content between two subjects: split at the midpoint
      rangeStart = Math.ceil((prevSubIdx + subIdx) / 2);
    }

    let rangeEnd: number;
    if (si + 1 >= subjectIndices.length) {
      rangeEnd = dataLines.length; // Last subject: include everything to end
    } else {
      rangeEnd = Math.ceil((subIdx + nextSubIdx) / 2);
    }

    const contentParts: string[] = [];
    for (let j = rangeStart; j < rangeEnd; j++) {
      if (dataLines[j].contentText.trim()) {
        contentParts.push(dataLines[j].contentText.trim());
      }
    }

    readings.push({
      id: crypto.randomUUID(),
      year: yearForEntry || 1,
      subjectOrArea: dataLines[subIdx].subject || "",
      content: contentParts.join(" ").trim(),
    });
  }

  // Fix year=0 entries
  for (const row of readings) {
    if (row.year === 0) row.year = 1;
  }

  return readings;
};

// ─── Behavioral Assessments Parser ──────────────────────────────────────────

interface BehavioralRow {
  id: string;
  year: number;
  assessment: string;
}

const parseBehavioralAssessments = (
  sectionLines: GlobalLine[]
): BehavioralRow[] => {
  let headerIdx = -1;

  for (let i = 0; i < Math.min(sectionLines.length, 10); i++) {
    const line = sectionLines[i];
    const normalized = lineTextNormalized(line);
    if (/행동특성및종합의견/.test(normalized) && line.items.length > 1) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const assessments: BehavioralRow[] = [];
  let currentYear = 0;
  let currentAssessment: BehavioralRow | null = null;

  for (let i = headerIdx + 1; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const { items } = line;

    // Year marker
    const yearItem = items.find((it) => /^[1-3]$/.test(it.text) && it.x < 60);
    if (yearItem) {
      if (currentAssessment) {
        currentAssessment.assessment = currentAssessment.assessment.trim();
        assessments.push(currentAssessment);
      }
      currentYear = parseInt(yearItem.text, 10);
      currentAssessment = {
        id: crypto.randomUUID(),
        year: currentYear,
        assessment: "",
      };
    }

    // Assessment text
    const textItems = items.filter((it) => it.x >= 65 && it !== yearItem);

    if (textItems.length > 0 && currentAssessment) {
      const text = textItems.map((it) => it.text).join(" ");
      currentAssessment.assessment +=
        (currentAssessment.assessment ? " " : "") + text;
    }
  }

  if (currentAssessment) {
    currentAssessment.assessment = currentAssessment.assessment.trim();
    assessments.push(currentAssessment);
  }

  return assessments;
};

// ─── Main parsing orchestrator ──────────────────────────────────────────────

export const parsePdfBuffer = async (pdfBuffer: ArrayBuffer) => {
  const allLines = await extractAllLines(pdfBuffer);
  const sections = findSections(allLines);

  let attendance: AttendanceRow[] = [];
  let awards: AwardRow[] = [];
  let certifications: CertificationRow[] = [];
  let creativeActivities: CreativeActivityRow[] = [];
  let volunteerActivities: VolunteerRow[] = [];
  let generalSubjects: GeneralSubjectRow[] = [];
  let careerSubjects: CareerSubjectRow[] = [];
  let artsPhysicalSubjects: ArtsPhysicalSubjectRow[] = [];
  let subjectEvaluations: {
    id: string;
    year: number;
    subject: string;
    evaluation: string;
  }[] = [];
  let readingActivities: ReadingRow[] = [];
  let behavioralAssessments: BehavioralRow[] = [];

  for (const section of sections) {
    const sectionLines = allLines.slice(section.startIdx, section.endIdx);

    switch (section.name) {
      case "attendance":
        attendance = parseAttendance(sectionLines);
        break;
      case "awards":
        awards = parseAwards(sectionLines);
        break;
      case "certifications":
        certifications = parseCertifications(sectionLines);
        break;
      case "creativeActivities":
        creativeActivities = parseCreativeActivities(sectionLines);
        break;
      case "volunteerActivities":
        volunteerActivities = parseVolunteerActivities(sectionLines);
        break;
      case "grades": {
        ({
          generalSubjects,
          careerSubjects,
          artsPhysicalSubjects,
          subjectEvaluations,
        } = parseGrades(sectionLines));
        break;
      }
      case "readingActivities":
        readingActivities = parseReadingActivities(sectionLines);
        break;
      case "behavioralAssessments":
        behavioralAssessments = parseBehavioralAssessments(sectionLines);
        break;
    }
  }

  return {
    attendance,
    awards,
    certifications,
    creativeActivities,
    volunteerActivities,
    generalSubjects,
    careerSubjects,
    artsPhysicalSubjects,
    subjectEvaluations,
    readingActivities,
    behavioralAssessments,
    mockExams: [] as {
      id: string;
      year: number;
      month: number;
      subject: string;
      score: number | null;
      gradeRank: number | null;
      percentile: number | null;
      standardScore: number | null;
    }[],
  };
};

// ─── API Route Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  interface StorageFileRef {
    path: string;
    mimeType: string;
  }

  let storagePaths: StorageFileRef[];
  try {
    const body = await request.json();
    ({ storagePaths } = body);
    if (!Array.isArray(storagePaths) || storagePaths.length === 0) {
      return NextResponse.json(
        { error: "파일 데이터가 필요합니다." },
        { status: 400 }
      );
    }
    for (const sp of storagePaths) {
      if (!sp.path.startsWith(`${user.id}/`)) {
        return NextResponse.json(
          { error: "잘못된 파일 경로입니다." },
          { status: 403 }
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버 설정 오류입니다." },
      { status: 500 }
    );
  }

  try {
    const downloadPromises = storagePaths.map(async ({ path }) => {
      const { data: fileData, error: dlError } = await admin.storage
        .from("record-uploads")
        .download(path);

      if (dlError || !fileData) {
        throw new Error(`파일 다운로드 실패: ${dlError?.message ?? "unknown"}`);
      }

      return fileData.arrayBuffer();
    });

    const buffers = await Promise.all(downloadPromises);
    const result = await parsePdfBuffer(buffers[0]);

    console.info(
      `[parse-pdf] Results: attendance=${result.attendance.length}, ` +
        `awards=${result.awards.length}, ` +
        `general=${result.generalSubjects.length}, ` +
        `career=${result.careerSubjects.length}, ` +
        `artsPhys=${result.artsPhysicalSubjects.length}, ` +
        `evaluations=${result.subjectEvaluations.length}, ` +
        `reading=${result.readingActivities.length}, ` +
        `behavioral=${result.behavioralAssessments.length}`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[parse-pdf] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `PDF 파싱에 실패했습니다: ${message}`,
      },
      { status: 500 }
    );
  }
}
