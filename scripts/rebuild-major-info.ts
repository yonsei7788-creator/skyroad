/**
 * MAJOR_INFO_DATA를 커리어넷 API 기반으로 재구축한다.
 *
 * 입력:
 *  - 현행 MAJOR_INFO_DATA (majorSeq, electiveSubjects, careerSubjects 보존)
 *  - /tmp/careernet-cache/<seq>.json (CareerNet MAJOR_VIEW 응답)
 *  - ADMISSION_CUTOFF_DATA (대학·학과 화이트리스트)
 *
 * 출력 구조:
 *   departmentsByUniversity: Record<대학명, 학과변형명[]>
 *  - CareerNet university[]의 (schoolName, majorName)를 1차 소스로
 *  - admission-cutoff-data에서 majorName 또는 기존 departments 변형과 매칭되는 항목 머지
 *
 * Usage: npx tsx scripts/rebuild-major-info.ts > /tmp/major-info-data.new.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ADMISSION_CUTOFF_DATA } from "../libs/report/constants/admission-cutoff-data.ts";
import { MAJOR_INFO_DATA } from "../libs/report/constants/major-info-data.ts";

const CACHE_DIR = "/tmp/careernet-cache";

interface CareerNetUniversity {
  schoolName: string;
  majorName: string;
}

interface CareerNetResponse {
  dataSearch?: { content?: Array<{ university?: CareerNetUniversity[] }> };
  result?: { content?: Array<{ code: string; message: string }> };
}

const loadCareerNet = (majorSeq: number): CareerNetUniversity[] | null => {
  try {
    const path = join(CACHE_DIR, `${majorSeq}.json`);
    const raw = readFileSync(path, "utf-8");
    const data: CareerNetResponse = JSON.parse(raw);
    if (data.result) return null;
    const content = data.dataSearch?.content?.[0];
    return content?.university ?? [];
  } catch {
    return null;
  }
};

const normalize = (s: string): string =>
  s.replace(/[\s()[\]]/g, "").replace(/[과부학]$/, "");

// admission-cutoff index: 대학별 학과 목록
const cutoffByUniversity = new Map<string, Set<string>>();
for (const entry of ADMISSION_CUTOFF_DATA) {
  if (!cutoffByUniversity.has(entry.university)) {
    cutoffByUniversity.set(entry.university, new Set());
  }
  cutoffByUniversity.get(entry.university)!.add(entry.department);
}

const matchesMajor = (
  cutoffDept: string,
  majorName: string,
  variants: string[]
): boolean => {
  const cN = normalize(cutoffDept);
  if (cN === normalize(majorName)) return true;
  for (const v of variants) {
    if (cN === normalize(v)) return true;
  }
  return false;
};

interface NewMajorInfo {
  majorSeq: number;
  majorName: string;
  lClass: string;
  electiveSubjects: string[];
  careerSubjects: string[];
  departmentsByUniversity: Record<string, string[]>;
}

const newData: NewMajorInfo[] = [];
const stats = {
  totalIn: 0,
  carNetOnly: 0,
  carNetMissing: 0,
  dropped: 0,
  totalUnivPairsIn: 0,
  totalUnivPairsOut: 0,
};

for (const major of MAJOR_INFO_DATA) {
  stats.totalIn += 1;
  stats.totalUnivPairsIn += major.universities.length;

  const cnUnivs = loadCareerNet(major.majorSeq);
  if (cnUnivs === null) stats.carNetMissing += 1;
  else stats.carNetOnly += 1;

  const map: Record<string, Set<string>> = {};

  // 1. CareerNet 데이터 머지
  if (cnUnivs) {
    for (const u of cnUnivs) {
      if (!u.schoolName || !u.majorName) continue;
      if (!map[u.schoolName]) map[u.schoolName] = new Set();
      map[u.schoolName].add(u.majorName);
    }
  }

  // 2. admission-cutoff에서 이 major에 해당하는 항목 머지
  for (const [univ, depts] of cutoffByUniversity) {
    for (const dept of depts) {
      if (matchesMajor(dept, major.majorName, major.departments)) {
        if (!map[univ]) map[univ] = new Set();
        map[univ].add(dept);
      }
    }
  }

  const universityKeys = Object.keys(map).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
  if (universityKeys.length === 0) {
    stats.dropped += 1;
    continue;
  }

  const departmentsByUniversity: Record<string, string[]> = {};
  for (const u of universityKeys) {
    departmentsByUniversity[u] = [...map[u]].sort((a, b) =>
      a.localeCompare(b, "ko")
    );
  }

  stats.totalUnivPairsOut += universityKeys.length;

  newData.push({
    majorSeq: major.majorSeq,
    majorName: major.majorName,
    lClass: major.lClass,
    electiveSubjects: major.electiveSubjects,
    careerSubjects: major.careerSubjects,
    departmentsByUniversity,
  });
}

const indent = (n: number) => " ".repeat(n);
const escapeStr = (s: string): string =>
  `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const formatArray = (arr: string[], pad: number): string => {
  if (arr.length === 0) return "[]";
  const lines = arr.map((s) => `${indent(pad + 2)}${escapeStr(s)}`);
  return `[\n${lines.join(",\n")},\n${indent(pad)}]`;
};

const formatDeptByUniv = (m: Record<string, string[]>, pad: number): string => {
  const keys = Object.keys(m);
  if (keys.length === 0) return "{}";
  const lines = keys.map((k) => {
    const arr = m[k];
    const arrText =
      arr.length === 1 ? `[${escapeStr(arr[0])}]` : formatArray(arr, pad + 2);
    return `${indent(pad + 2)}${escapeStr(k)}: ${arrText}`;
  });
  return `{\n${lines.join(",\n")},\n${indent(pad)}}`;
};

const formatMajor = (m: NewMajorInfo): string => {
  return [
    `${indent(2)}{`,
    `${indent(4)}majorSeq: ${m.majorSeq},`,
    `${indent(4)}majorName: ${escapeStr(m.majorName)},`,
    `${indent(4)}lClass: ${escapeStr(m.lClass)},`,
    `${indent(4)}electiveSubjects: ${formatArray(m.electiveSubjects, 4)},`,
    `${indent(4)}careerSubjects: ${formatArray(m.careerSubjects, 4)},`,
    `${indent(4)}departmentsByUniversity: ${formatDeptByUniv(m.departmentsByUniversity, 4)},`,
    `${indent(2)}},`,
  ].join("\n");
};

const header = `/**
 * 커리어넷 MAJOR_VIEW API + 대입전형결과(ADMISSION_CUTOFF_DATA) 기반 학과 정보.
 *
 * - departmentsByUniversity: 대학별 실제 개설 학과명 변형 목록
 *   (커리어넷 university[]와 admission-cutoff-data 양쪽에서 도출한 합집합)
 * Generated by: scripts/rebuild-major-info.ts
 * Source: https://www.career.go.kr/cnet/openapi/getOpenApi (MAJOR_VIEW)
 * Total: ${newData.length} majors
 */

export interface MajorInfo {
  majorSeq: number;
  majorName: string;
  lClass: string;
  /** 일반선택 관련 교과 */
  electiveSubjects: string[];
  /** 진로선택 관련 교과 */
  careerSubjects: string[];
  /** 대학별 실제 개설 학과명 변형 목록 (커리어넷 + 대입전형결과 데이터 기반) */
  departmentsByUniversity: Record<string, string[]>;
}

// @ts-expect-error — 대용량 객체 리터럴로 TS2590 회피
export const MAJOR_INFO_DATA: MajorInfo[] = [
`;

const body = newData.map(formatMajor).join("\n");
const footer = `\n];\n`;

process.stdout.write(header + body + footer);

console.error("\n=== Stats ===");
console.error(JSON.stringify(stats, null, 2));
