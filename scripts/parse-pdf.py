#!/usr/bin/env python3
"""
생기부 PDF 파서 (pdfplumber 기반)
정부24 발급 생활기록부 PDF를 JSON으로 변환합니다.

Usage: python3 scripts/parse-pdf.py <pdf_path>
Output: JSON to stdout
"""

import sys
import json
import re
import uuid
import pdfplumber


def safe_int(val):
    """'.' 또는 빈 값은 None, 숫자는 int"""
    if val is None:
        return None
    val = val.strip()
    if val in ("", ".", "-"):
        return None
    try:
        return int(val)
    except ValueError:
        return None


def safe_float(val):
    if val is None:
        return None
    val = val.strip()
    if val in ("", ".", "-"):
        return None
    try:
        return float(val)
    except ValueError:
        return None


def new_id():
    return str(uuid.uuid4())


# ─── Section Detection ────────────────────────────────────────────────────

SECTION_PATTERNS = {
    "attendance": re.compile(r"출\s*결\s*상\s*황"),
    "awards": re.compile(r"수\s*상\s*경?\s*력"),
    "certifications": re.compile(r"자\s*격\s*증"),
    "creative": re.compile(r"창\s*의\s*적\s*체\s*험\s*활\s*동"),
    "volunteer": re.compile(r"봉\s*사\s*활\s*동\s*실\s*적"),
    "grades": re.compile(r"교\s*과\s*학\s*습\s*발\s*달"),
    "reading": re.compile(r"독\s*서\s*활\s*동"),
    "behavioral": re.compile(r"행\s*동\s*특\s*성"),
}

CERT_PATTERN = re.compile(r"발급번호|사본임을\s*증명|위\s*사람의\s*학교생활기록부")


def classify_table(table, page_text):
    """테이블의 헤더 텍스트로 섹션 분류 (본문 데이터는 제외)"""
    if not table or not table[0]:
        return None
    first_cell = str(table[0][0] or "").replace("\n", "")
    # 헤더 셀만 추출 (row 0의 셀들) — 본문 키워드 오분류 방지
    header_cells = " ".join(str(c or "") for c in table[0])

    # 1단계: 헤더 셀(row 0)에서 정확한 섹션 매칭 (최우선)
    for key, pattern in SECTION_PATTERNS.items():
        if pattern.search(first_cell) or pattern.search(header_cells):
            return key

    # 2단계: row 0~1까지 확장 (연속 테이블의 서브헤더 포함)
    header_text = " ".join(str(c or "") for row in table[:2] for c in row)
    for key, pattern in SECTION_PATTERNS.items():
        if pattern.search(header_text):
            return key

    # 추가: "석차등급" 또는 "분포비율"이 있으면 grades 섹션
    # (하위 헤더가 row 2~3에 있을 수 있으므로 범위 확장)
    all_text = " ".join(str(c or "") for row in table[:3] for c in row)
    if "석차등급" in all_text or "분포비율" in all_text:
        return "grades"
    # "체육" + "예술" + 성취도 → grades (체육/예술 하위 테이블)
    if "체육" in all_text and "예술" in all_text and "성취도" in all_text:
        return "grades"
    # "세부 능력" or "세부능력" → grades (세부능력 하위 테이블)
    if "세부" in all_text.replace(" ", "") and "능력" in all_text.replace(" ", ""):
        return "grades"

    return None


# ─── Attendance Parser ────────────────────────────────────────────────────

ATTENDANCE_KEYS = [
    "absenceIllness", "absenceUnauthorized", "absenceOther",
    "latenessIllness", "latenessUnauthorized", "latenessOther",
    "earlyLeaveIllness", "earlyLeaveUnauthorized", "earlyLeaveOther",
    "classMissedIllness", "classMissedUnauthorized", "classMissedOther",
]


def parse_attendance(table):
    rows = []
    for row in table:
        if not row or not row[0]:
            continue
        year = safe_int(row[0])
        if year is None or year < 1 or year > 3:
            continue
        total_days = safe_int(row[1]) if len(row) > 1 else None

        vals = {}
        # 12개 값: index 2~13
        for i, key in enumerate(ATTENDANCE_KEYS):
            val_idx = i + 2
            vals[key] = safe_int(row[val_idx]) if val_idx < len(row) else None

        note = str(row[-1] or "").strip() if len(row) > 14 else ""
        # "." 제거
        note = note.lstrip(".")

        rows.append({
            "id": new_id(),
            "year": year,
            "totalDays": total_days,
            **vals,
            "note": note,
        })
    return rows


# ─── Awards Parser ────────────────────────────────────────────────────────

def parse_awards(table):
    rows = []
    current_year = None
    current_semester = None

    for row in table:
        if not row:
            continue

        # 헤더 행 스킵
        row_text = " ".join(str(c or "") for c in row)
        if "학년" in row_text and ("수상명" in row_text or "수 상 명" in row_text.replace(" ", " ")):
            continue
        if "수상명" in row_text.replace(" ", "") and "등급" in row_text:
            continue

        # 학년 감지 (병합 셀: None이면 이전 값 유지)
        year_val = safe_int(row[0])
        if year_val is not None and 1 <= year_val <= 3:
            current_year = year_val

        # 학기 감지 (병합 셀: None이면 이전 값 유지)
        semester_val = safe_int(row[1]) if len(row) > 1 else None
        if semester_val is not None and semester_val in (1, 2):
            current_semester = semester_val

        if current_year is None:
            continue

        name = str(row[2] or "").strip().replace("\n", " ") if len(row) > 2 else ""
        rank = str(row[3] or "").strip() if len(row) > 3 else ""
        date = str(row[4] or "").strip() if len(row) > 4 else ""
        org = str(row[5] or "").strip() if len(row) > 5 else ""
        participants = str(row[6] or "").strip().replace("\n", " ") if len(row) > 6 else ""

        # 데이터 행 판별: 날짜가 있거나 수상명이 있어야 함
        if not name and not date:
            continue

        rows.append({
            "id": new_id(),
            "year": current_year,
            "semester": current_semester or 1,
            "name": name,
            "rank": rank,
            "date": date,
            "organization": org,
            "participants": participants,
        })
    return rows


# ─── Creative Activities Parser ───────────────────────────────────────────

AREA_PATTERN = re.compile(r"^(자율활동|동아리활동|진로활동)$")


def parse_creative_activities(tables):
    """여러 테이블을 합쳐서 파싱 (페이지에 걸쳐있을 수 있음)
    영역+시간 행과 특기사항 행이 분리될 수 있음 — 2패스로 처리
    영역이 같은 셀에 \n으로 묶여있을 수 있음 (자율활동\n동아리활동)
    시간이 별도 행에 있을 수 있음 (영역과 시간이 다른 행)
    """
    rows = []
    current_year = 0

    # 모든 테이블의 행을 하나로 합침
    all_rows = []
    for table in tables:
        for row in table:
            if row:
                all_rows.append(row)

    # 1패스: 영역+시간 항목과 노트 텍스트를 순서대로 수집
    entries = []  # (type, data) — type: "area", "note", "hours"

    for row in all_rows:
        # 헤더 행 스킵
        row_text = " ".join(str(c or "") for c in row)
        if "창의적체험활동" in row_text.replace(" ", "").replace("의", "의"):
            if "영역" in row_text or "특기사항" in row_text:
                continue
            if re.search(r"\d\.\s*창", row_text):
                continue
        if re.search(r"영역.*시간.*특기사항", row_text):
            continue
        if "이수시간" in row_text:
            continue

        # 학년 감지 (첫 번째 셀)
        year_val = safe_int(row[0])
        if year_val and 1 <= year_val <= 3:
            current_year = year_val

        # 영역 감지 — 모든 셀에서 영역명 검색
        areas_found = []
        for cell in row:
            if cell is None:
                continue
            cell_str = str(cell).strip()
            for line in cell_str.split("\n"):
                line = line.strip()
                if AREA_PATTERN.match(line):
                    areas_found.append(line)

        # 시간 필드 — 숫자 추출 (학년 셀, 영역명 셀 제외)
        hours_found = []
        for ci, cell in enumerate(row):
            if cell is None:
                continue
            cell_str = str(cell).strip()
            # 첫 번째 셀이 학년(1-3)이면 시간으로 취급하지 않음
            if ci == 0:
                v = safe_int(cell)
                if v is not None and 1 <= v <= 3:
                    continue
            # 영역명이 포함된 셀은 건너뜀
            has_area = False
            for line in cell_str.split("\n"):
                if AREA_PATTERN.match(line.strip()):
                    has_area = True
                    break
            if has_area:
                continue
            # 헤더 텍스트("시간", "학년", "특기사항" 등) 건너뜀
            if cell_str in ("시간",) or "학년" in cell_str or "특기사항" in cell_str or "영역" in cell_str:
                continue
            # 긴 텍스트는 시간이 아님
            if len(cell_str) > 5:
                continue
            h = safe_int(cell)
            if h is not None and 0 <= h < 500:
                hours_found.append(h)

        # 긴 텍스트 = 특기사항 (10자 이상으로 낮춤 — 짧은 note도 포착)
        note_text = ""
        for cell in row:
            if cell is None:
                continue
            cell_str = str(cell).strip()
            if len(cell_str) <= 10:
                continue
            if AREA_PATTERN.match(cell_str):
                continue
            # 짧은 헤더 텍스트 필터 (50자 미만인 경우만 적용)
            if len(cell_str) < 50 and ("학년" in cell_str or "영역" in cell_str or "희망분야" in cell_str):
                continue
            cleaned = cell_str.replace("\n", "").replace(" ", "")
            if "창의적체험활동" in cleaned or "영역시간특기사항" in cleaned:
                continue
            note_candidate = cell_str.replace("\n", " ")
            # 비공개 텍스트는 빈 문자열로
            if not is_redacted_text(note_candidate):
                note_text = note_candidate
            break

        if areas_found and current_year > 0:
            for idx, area in enumerate(areas_found):
                h = hours_found[idx] if idx < len(hours_found) else None
                entries.append(("area", {
                    "year": current_year,
                    "area": area,
                    "hours": h,
                    "note": note_text if idx == 0 else "",
                }))
        elif hours_found and current_year > 0:
            # 시간이 있는 행 — 같은 학년 영역에만 시간 할당
            for h in hours_found:
                entries.append(("hours", (h, current_year)))
            # note도 같이 있으면 함께 추가
            if note_text:
                entries.append(("note", note_text))
        elif note_text and current_year > 0:
            # 영역 없는 행 = 이전 영역의 특기사항 (continuation)
            entries.append(("note", note_text))

    # 2패스: note/hours를 직전 area 항목에 할당 + 페이지 연속 중복 병합
    # note_cursor: 다음 standalone note가 할당될 row의 인덱스
    # multi-area 행에서 생성된 영역들 중 note가 없는 첫 번째를 가리킴
    note_cursor = 0

    for i, (entry_type, data) in enumerate(entries):
        if entry_type == "area":
            # 페이지 경계에서 같은 영역이 반복되면 note만 이어붙임
            if rows and rows[-1]["year"] == data["year"] and rows[-1]["area"] == data["area"] and rows[-1]["hours"] == data["hours"]:
                if data["note"]:
                    if rows[-1]["note"]:
                        rows[-1]["note"] += " " + data["note"]
                    else:
                        rows[-1]["note"] = data["note"]
                note_cursor = len(rows) - 1
            else:
                rows.append({
                    "id": new_id(),
                    **data,
                })
                # 이 영역이 note를 이미 가지고 있으면 cursor를 다음으로
                if data["note"]:
                    note_cursor = len(rows)
                else:
                    # note가 없으면 이 영역을 target으로 (첫 번째 빈 항목)
                    # note_cursor가 이미 빈 항목을 가리키고 있으면 유지
                    if note_cursor >= len(rows):
                        note_cursor = len(rows) - 1
                    elif note_cursor < len(rows) - 1 and rows[note_cursor].get("note"):
                        note_cursor = len(rows) - 1
        elif entry_type == "note" and rows:
            # note_cursor 위치에 할당, 없으면 마지막 항목에 append
            target = min(note_cursor, len(rows) - 1)
            if rows[target]["note"]:
                # 이미 note가 있으면 append
                rows[target]["note"] += " " + data
            else:
                # 새 note 할당
                rows[target]["note"] = data
                # 다음 standalone note는 다음 note-없는 항목으로 이동
                # (multi-area에서 각 area에 순서대로 note 배분)
                next_cursor = target + 1
                while next_cursor < len(rows) and rows[next_cursor]["note"]:
                    next_cursor += 1
                if next_cursor < len(rows):
                    note_cursor = next_cursor
                else:
                    note_cursor = target  # 모든 이후 항목에 note 있으면 현재에 append
        elif entry_type == "hours" and rows:
            # 시간을 같은 학년에서 hours가 None인 첫 번째 영역에 할당
            h_val, h_year = data
            for r in rows:
                if r["hours"] is None and r["year"] == h_year:
                    r["hours"] = h_val
                    break

    return rows


# ─── Volunteer Parser ─────────────────────────────────────────────────────

DATE_PATTERN = re.compile(r"\d{4}\.\d{2}\.\d{2}")


def _is_volunteer_header(text):
    """봉사활동 테이블 헤더 행 텍스트인지 확인"""
    return bool(re.search(r"봉\s*사\s*활\s*동\s*실\s*적", text)
                or "일자 또는 기간" in text
                or "장소 또는 주관기관명" in text
                or "누계시간" in text)


def parse_volunteer_activities(tables):
    """봉사활동 파싱 — pdfplumber가 병합 셀로 모든 활동을 \n 구분 텍스트로 반환"""
    rows = []
    current_year = 0

    for table in tables:
        for row in table:
            if not row:
                continue

            # 헤더 행 스킵
            row_text = " ".join(str(c or "") for c in row)
            if _is_volunteer_header(row_text):
                continue

            # 학년 감지
            year_val = safe_int(row[0])
            if year_val and 1 <= year_val <= 3:
                current_year = year_val

            if current_year == 0:
                continue

            # 병합된 셀에서 텍스트 추출 (가장 긴 셀)
            merged_text = ""
            for cell in row[1:]:
                if cell is not None:
                    cell_str = str(cell).strip()
                    if len(cell_str) > len(merged_text):
                        merged_text = cell_str

            # 병합 안 된 형식도 지원 (각 셀이 분리된 경우)
            if not merged_text:
                continue

            # 헤더 텍스트 필터링
            if _is_volunteer_header(merged_text):
                continue

            # 날짜가 있는지 확인 — 없으면 스킵
            if not DATE_PATTERN.search(merged_text):
                # 날짜 없는 행은 개별 셀 형식일 수 있음 (date in another cell)
                # 전체 행에서 날짜 찾기
                if not DATE_PATTERN.search(row_text):
                    continue
                # 개별 셀 형식: 각 컬럼이 분리된 경우
                _parse_volunteer_row_columns(row, current_year, rows)
                continue

            # \n으로 분리하여 라인별 처리
            lines = merged_text.split("\n")
            buffer = ""  # 날짜 없는 라인 = 다음 항목의 content
            seen_date_in_cell = False  # 이 셀에서 날짜를 하나라도 봤는지

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # 헤더 텍스트 필터링
                if _is_volunteer_header(line):
                    continue

                # 날짜로 시작하는 라인 = 새 항목
                date_match = re.match(
                    r"(\d{4}\.\d{2}\.\d{2}\.?)"
                    r"(\s*-\s*\d{4}\.\d{2}\.\d{2}\.?)?\s*(.*)",
                    line
                )

                if date_match:
                    # 첫 날짜 이전의 buffer = 이전 항목의 content 이어붙이기
                    if not seen_date_in_cell and buffer and rows:
                        last = rows[-1]
                        last["content"] = (last["content"] + buffer).strip() if last["content"] else buffer.strip()
                        buffer = ""

                    seen_date_in_cell = True
                    date_range = date_match.group(1) + (date_match.group(2) or "")
                    rest = date_match.group(3).strip()

                    # rest에서 장소, 내용, 시간 추출
                    place = ""
                    hours = None

                    place_match = re.match(r"(\([^)]+\)\S+)\s*(.*)", rest)
                    if place_match:
                        place = place_match.group(1)
                        remainder = place_match.group(2).strip()
                    else:
                        remainder = rest

                    # 끝에서 숫자 2개 추출 (시간, 누적시간)
                    content_part = ""
                    num_match = re.search(r"(\d+)\s+(\d+)\s*$", remainder)
                    if num_match:
                        hours = int(num_match.group(1))
                        content_part = remainder[:num_match.start()].strip()
                    else:
                        # 숫자 1개만 있는 경우
                        num_match_single = re.search(r"(\d+)\s*$", remainder)
                        if num_match_single:
                            hours = int(num_match_single.group(1))
                            content_part = remainder[:num_match_single.start()].strip()
                        else:
                            content_part = remainder

                    # buffer에 이전 라인의 감싸진 텍스트가 있으면 content 앞에 붙임
                    if buffer:
                        content = (buffer + " " + content_part).strip() if content_part else buffer.strip()
                        buffer = ""
                    else:
                        content = content_part

                    rows.append({
                        "id": new_id(),
                        "year": current_year,
                        "dateRange": date_range.strip(),
                        "place": place,
                        "content": content,
                        "hours": hours,
                    })
                else:
                    # 날짜 없는 라인 = 감싸진 content 텍스트
                    # 매우 짧은 조각(1-2자)은 이전 항목의 content 이어붙이기
                    # (줄바꿈으로 잘린 단어 조각, 예: "캠페" + "인")
                    if len(line) <= 2 and rows and seen_date_in_cell:
                        last = rows[-1]
                        last["content"] = (last["content"] + line).strip() if last["content"] else line
                    elif buffer:
                        buffer += " " + line
                    else:
                        buffer = line

            # buffer가 남아있으면 마지막 항목의 content에 append
            if buffer and rows and rows[-1]["year"] == current_year:
                last = rows[-1]
                last["content"] = (last["content"] + " " + buffer).strip() if last["content"] else buffer.strip()
                buffer = ""

    return rows


def _parse_volunteer_row_columns(row, year, output):
    """개별 셀이 분리된 형식의 봉사활동 행 파싱"""
    # 날짜 찾기
    date_range = ""
    place = ""
    content = ""
    hours = None

    for cell in row[1:]:
        if cell is None:
            continue
        cell_str = str(cell).strip()

        if DATE_PATTERN.search(cell_str) and not date_range:
            # 날짜 범위 추출
            dm = re.search(
                r"(\d{4}\.\d{2}\.\d{2}\.?\s*-?\s*\d{0,4}\.?\d{0,2}\.?\d{0,2}\.?)",
                cell_str
            )
            if dm:
                date_range = dm.group(1).strip()
        elif "(학교)" in cell_str or "(개인)" in cell_str:
            place = cell_str
        elif re.match(r"^\d{1,3}$", cell_str):
            if hours is None:
                hours = int(cell_str)
        elif len(cell_str) > 3 and not re.match(r"^\d+$", cell_str):
            content = cell_str.replace("\n", " ")

    if date_range:
        output.append({
            "id": new_id(),
            "year": year,
            "dateRange": date_range,
            "place": place,
            "content": content,
            "hours": hours,
        })


# ─── Grades Parser ────────────────────────────────────────────────────────

SCORE_RE = re.compile(r"(\d+)/(\d+\.?\d*)\((\d+\.?\d*)\)")
ACHIEVEMENT_RE = re.compile(r"([A-D])\((\d+)\)")


def parse_grades(tables):
    general = []
    career = []
    arts_physical = []
    evaluations = []

    current_year = 0
    current_table_type = None  # "general", "career", "artsPhysical", "evaluation"

    for table in tables:
        if not table:
            continue

        # 테이블 타입 감지 (처음 5행의 헤더로 — __page_year__ 마커 제외)
        header_rows = [r for r in table[:6] if r and str(r[0] or "") != "__page_year__"]
        header_text = " ".join(
            str(c or "")
            for row in header_rows[:4]
            for c in (row or [])
        ).replace("\n", " ")

        # 학년 헤더 감지
        year_match = re.search(r"\[(\d)학년\]", header_text)
        if year_match:
            current_year = int(year_match.group(1))

        if "석차등급" in header_text:
            current_table_type = "general"
        elif "분포비율" in header_text or "진로 선택" in header_text or "진로선택" in header_text:
            current_table_type = "career"
        elif re.search(r"체육[ㆍ·]?\s*예술", header_text.replace(" ", "")):
            current_table_type = "artsPhysical"
        elif "세부 능력" in header_text.replace(" ", "").replace("부", "부") or "세부능력" in header_text.replace(" ", ""):
            current_table_type = "evaluation"

        for row in table:
            if not row:
                continue

            # Issue 1: 페이지 텍스트에서 주입된 학년 마커 처리
            first_cell = str(row[0] or "").strip()
            if first_cell == "__page_year__" and len(row) > 1:
                page_year = safe_int(row[1])
                if page_year and 1 <= page_year <= 3:
                    if page_year != current_year:
                        current_year = page_year
                        # 학년 변경 시 학기 리셋
                        _general_current_semester[0] = 0
                        _career_current_semester[0] = 0
                        _arts_current_semester[0] = 0
                continue

            # 학년 마커 확인
            ym = re.search(r"\[(\d)학년\]", first_cell)
            if ym:
                current_year = int(ym.group(1))
                _general_current_semester[0] = 0
                _career_current_semester[0] = 0
                _arts_current_semester[0] = 0
                continue

            if current_year == 0:
                continue

            # 헤더 행 스킵
            row_text = " ".join(str(c or "") for c in row)
            if "학기" in row_text and "교과" in row_text and "과목" in row_text:
                continue
            if "표준편차" in row_text or "수강자수" in row_text:
                continue
            if "이수학점" in row_text or "이수단위" in row_text:
                continue

            if current_table_type == "evaluation":
                _parse_evaluation_row(row, current_year, evaluations)
            elif current_table_type == "general":
                _parse_general_rows(row, current_year, general)
            elif current_table_type == "career":
                _parse_career_rows(row, current_year, career)
            elif current_table_type == "artsPhysical":
                _parse_arts_physical_rows(row, current_year, arts_physical)

    return general, career, arts_physical, evaluations


    # 일반과목 파싱에서 사용하는 현재 학기 (개별 행 형식에서 병합 셀 처리용)
_general_current_semester = [0]


def _parse_general_rows(row, year, output):
    """일반과목 — 두 가지 형식 지원:
    1. 병합 셀: 한 행에 여러 과목이 \n으로 구분 (생기부3)
    2. 개별 행: 한 행에 하나의 과목, semester 셀이 비어있으면 이전 학기 상속 (권예호)
    """
    # 비데이터 행 필터링
    row_text_all = " ".join(str(c or "") for c in row)
    if any(kw in row_text_all for kw in ("이수학점", "이수단위", "번호", "이름", "반")):
        # "반", "번호" 등 페이지 정보 바 필터링
        # 단, 실제 교과에 "반" 이 포함될 수 있으므로 셀 길이 체크
        first_cells = [str(c or "").strip() for c in row[:3] if c]
        if any(c in ("반", "번호", "이름") for c in first_cells):
            return
        if any("이수" in str(c or "") for c in row[:2]):
            return
        # 날짜 패턴 ("2022년 6월 25일") 포함 → 페이지 정보 바
        if re.search(r"\d{4}년\s*\d+월\s*\d+일", row_text_all):
            return

    semester_val = safe_int(row[0])

    # 학기 업데이트
    if semester_val in (1, 2):
        _general_current_semester[0] = semester_val

    semester = _general_current_semester[0]
    if semester not in (1, 2):
        return

    # 각 셀을 \n으로 분리
    categories = str(row[1] or "").split("\n") if len(row) > 1 else []
    subjects = _merge_split_names(str(row[2] or "").split("\n")) if len(row) > 2 else []
    credits_list = str(row[3] or "").split("\n") if len(row) > 3 else []
    scores = str(row[4] or "").split("\n") if len(row) > 4 else []
    achievements = str(row[5] or "").split("\n") if len(row) > 5 else []
    ranks = str(row[6] or "").split("\n") if len(row) > 6 else []
    notes = str(row[7] or "").split("\n") if len(row) > 7 else []

    max_len = max(len(subjects), len(scores), len(achievements), 1)
    cleaned_categories = _expand_categories(categories, max_len)

    # 석차등급(ranks)은 빈 칸(석차등급 없는 과목)을 건너뛰므로 subjects보다 짧을 수 있음.
    # ranks를 이터레이터로 만들어서 석차등급이 있는 과목에서만 소비.
    rank_iter = iter(r.strip() for r in ranks if r.strip())

    for i in range(max_len):
        subj = subjects[i].strip() if i < len(subjects) else ""
        if not subj:
            continue

        cat = cleaned_categories[i] if i < len(cleaned_categories) else ""
        cred = safe_int(credits_list[i]) if i < len(credits_list) else None

        raw_score, average, std_dev = None, None, None
        if i < len(scores):
            m = SCORE_RE.search(scores[i])
            if m:
                raw_score = safe_int(m.group(1))
                average = safe_float(m.group(2))
                std_dev = safe_float(m.group(3))

        ach_str, student_count = "", None
        if i < len(achievements):
            m = ACHIEVEMENT_RE.search(achievements[i])
            if m:
                ach_str = m.group(1)
                student_count = safe_int(m.group(2))
            elif achievements[i].strip() == "P":
                ach_str = "P"

        # 석차등급: ranks와 subjects의 길이가 다르면 이터레이터에서 가져옴
        rank = None
        if len(ranks) == max_len:
            # ranks와 subjects가 같은 길이 → 인덱스 매칭
            rank = safe_int(ranks[i]) if i < len(ranks) else None
        elif ach_str and ach_str != "P":
            # ranks가 짧음 → 석차등급 있는 과목(P 아닌)에서만 소비
            try:
                rank = safe_int(next(rank_iter))
            except StopIteration:
                rank = None

        note = notes[i].strip() if i < len(notes) else ""

        if ach_str == "P":
            continue

        output.append({
            "id": new_id(),
            "year": year,
            "semester": semester,
            "category": cat,
            "subject": subj,
            "credits": cred,
            "rawScore": raw_score,
            "average": average,
            "standardDeviation": std_dev,
            "achievement": ach_str,
            "studentCount": student_count,
            "gradeRank": rank,
            "note": note,
        })


def _expand_categories(categories, target_len):
    """교과명 리스트를 과목 수에 맞게 확장.
    교과명이 과목보다 적으면 마지막 교과명을 반복.
    줄바꿈으로 잘린 교과명("사회(역사/도덕\n포함)", "기술・가정/제2\n외국어/한문/교\n양")을 합침.
    """
    # 유효한 교과명 (짧지만 합치면 안 되는 것들)
    VALID_SHORT_CATS = {"국어", "수학", "영어", "과학", "체육", "음악", "미술", "한문", "교양"}

    # 1단계: 줄바꿈으로 잘린 교과명을 이전 항목에 합침
    merged = []
    for cat in categories:
        cat = cat.strip()
        if not cat:
            continue

        is_continuation = False
        if merged:
            prev = merged[-1]
            # 이전 항목이 열린 괄호("(") 또는 "/"로 끝나면 → 현재는 연속
            if prev.endswith("/") or prev.endswith("("):
                is_continuation = True
            # "포함)" 같은 닫는 잔여
            elif cat.endswith(")") and not re.search(r"[가-힣].*\(", cat):
                is_continuation = True
            # "양", "덕포함)" 등 1글자 잔여 — 유효 교과명이 아닌 경우만
            elif len(cat) <= 1 and cat not in VALID_SHORT_CATS:
                is_continuation = True

        if is_continuation and merged:
            merged[-1] = merged[-1] + cat
        else:
            merged.append(cat)

    # 2단계: 아직 과목 수보다 많으면 추가 합침
    # "기술・가정/제2" + "외국어/한문/교양" → 같은 교과
    # 우선: "/"로 끝나거나 시작하는 항목끼리 합침
    while len(merged) > target_len and len(merged) >= 2:
        merged_any = False
        for idx in range(len(merged) - 1):
            # 이전 항목이 "/"로 끝나거나 숫자로 끝남 → 다음과 합침
            if merged[idx].endswith("/") or re.search(r"\d$", merged[idx]):
                merged[idx] = merged[idx] + merged[idx + 1]
                merged.pop(idx + 1)
                merged_any = True
                break
        if not merged_any:
            # "/" 연결이 없으면 가장 짧은 비-유효 항목을 합침
            candidates = [i for i in range(1, len(merged)) if merged[i] not in VALID_SHORT_CATS]
            if candidates:
                min_idx = min(candidates, key=lambda i: len(merged[i]))
                merged[min_idx - 1] = merged[min_idx - 1] + merged[min_idx]
                merged.pop(min_idx)
            else:
                break  # 합칠 수 있는 항목이 없으면 중단

    # 3단계: 과목 수에 맞게 확장 (마지막 교과명 반복)
    while len(merged) < target_len:
        merged.append(merged[-1] if merged else "")

    return merged[:target_len]


def _merge_split_names(raw_items):
    """줄바꿈으로 잘린 과목/교과명 병합.
    짧은 조각(<= 4자, 공백 포함)을 이전 항목에 합침.
    단, 독립적 과목명(한글 2자 이상 + Ⅰ/Ⅱ/Ⅲ, 또는 알려진 짧은 과목명)은 유지.
    """
    # 2글자 이하의 독립적 과목명 목록
    KNOWN_SHORT_SUBJECTS = {
        "기하", "확통", "미적", "화학", "물리", "생명", "지구",
        "국어", "수학", "영어", "과학", "사회", "한문", "음악",
        "미술", "체육", "정보", "독서", "문학", "윤리", "경제",
        "정치", "법과", "역사", "도덕",
    }

    merged = []
    for s in raw_items:
        s = s.strip()
        if not s:
            continue
        if not merged:
            merged.append(s)
            continue

        # 독립적 과목명 (한글 2자 이상 + Ⅰ/Ⅱ/Ⅲ)은 항상 유지
        if re.match(r"^[가-힣]{2,}[ⅠⅡⅢ]$", s):
            merged.append(s)
            continue

        # 알려진 짧은 과목명은 유지
        if s in KNOWN_SHORT_SUBJECTS:
            merged.append(s)
            continue

        prev = merged[-1]
        # 짧은 조각(공백 포함 4자 이하) → 이전 항목에 붙임
        if len(s) <= 4:
            merged[-1] = prev + s
        else:
            merged.append(s)
    return merged


_career_current_semester = [0]


def _parse_career_rows(row, year, output):
    """진로선택과목: 학기 | 교과 | 과목 | 학점수 | 원점수/과목평균 | 성취도(수강자수) | 성취도별분포비율 | 비고"""
    semester_val = safe_int(row[0])
    if semester_val in (1, 2):
        _career_current_semester[0] = semester_val

    semester = _career_current_semester[0]
    if semester not in (1, 2):
        return

    categories = str(row[1] or "").split("\n") if len(row) > 1 else []
    subjects = _merge_split_names(str(row[2] or "").split("\n")) if len(row) > 2 else []
    credits_list = str(row[3] or "").split("\n") if len(row) > 3 else []
    scores = str(row[4] or "").split("\n") if len(row) > 4 else []
    achievements = str(row[5] or "").split("\n") if len(row) > 5 else []
    distributions = str(row[6] or "").split("\n") if len(row) > 6 else []
    notes = str(row[7] or "").split("\n") if len(row) > 7 else []

    max_len = max(len(subjects), len(scores), len(achievements), 1)
    cleaned_categories = _expand_categories(categories, max_len)

    for i in range(max_len):
        subj = subjects[i].strip() if i < len(subjects) else ""
        if not subj:
            continue

        cat = cleaned_categories[i] if i < len(cleaned_categories) else ""
        cred = safe_int(credits_list[i]) if i < len(credits_list) else None

        raw_score, average = None, None
        if i < len(scores):
            parts = scores[i].strip().split("/")
            if len(parts) == 2:
                raw_score = safe_int(parts[0])
                average = safe_float(parts[1])
            elif len(parts) == 1 and parts[0].strip():
                raw_score = safe_int(parts[0])

        ach_str, student_count = "", None
        if i < len(achievements):
            m = ACHIEVEMENT_RE.search(achievements[i])
            if m:
                ach_str = m.group(1)
                student_count = safe_int(m.group(2))

        dist = distributions[i].strip() if i < len(distributions) else ""
        note = notes[i].strip() if i < len(notes) else ""

        output.append({
            "id": new_id(),
            "year": year,
            "semester": semester,
            "category": cat,
            "subject": subj,
            "credits": cred,
            "rawScore": raw_score,
            "average": average,
            "achievement": ach_str,
            "studentCount": student_count,
            "achievementDistribution": dist,
            "note": note,
        })


_arts_current_semester = [0]


def _parse_arts_physical_rows(row, year, output):
    """체육/예술: 학기 | 교과 | 과목 | 학점수 | 성취도 | 비고"""
    semester_val = safe_int(row[0])
    if semester_val in (1, 2):
        _arts_current_semester[0] = semester_val

    semester = _arts_current_semester[0]
    if semester not in (1, 2):
        return

    categories = str(row[1] or "").split("\n") if len(row) > 1 else []
    subjects = _merge_split_names(str(row[2] or "").split("\n")) if len(row) > 2 else []
    credits_list = str(row[3] or "").split("\n") if len(row) > 3 else []
    achievements = str(row[4] or "").split("\n") if len(row) > 4 else []

    max_len = max(len(subjects), len(achievements), 1)

    for i in range(max_len):
        subj = subjects[i].strip() if i < len(subjects) else ""
        if not subj:
            continue

        cat = categories[i].strip() if i < len(categories) else ""
        cred = safe_int(credits_list[i]) if i < len(credits_list) else None
        ach = achievements[i].strip() if i < len(achievements) else ""

        if ach not in ("A", "B", "C", "P"):
            continue

        output.append({
            "id": new_id(),
            "year": year,
            "semester": semester,
            "category": cat,
            "subject": subj,
            "credits": cred,
            "achievement": ach,
        })


REDACTED_PATTERN = re.compile(
    r"해당\s*내용은\s*[「「]공공기관의\s*정보공개에\s*관한\s*법률[」」]"
)


def is_redacted_text(text):
    """비공개 텍스트인지 확인 (공공기관의 정보공개에 관한 법률 관련)"""
    return bool(REDACTED_PATTERN.search(text))


def _parse_evaluation_row(row, year, output):
    """세부능력: 과목 | 세부능력 텍스트"""
    # 헤더 행 스킵
    row_text = " ".join(str(c or "") for c in row).replace(" ", "")
    if "세부능력" in row_text and "특기사항" in row_text:
        return
    if "과목" == str(row[0] or "").strip() and len(row) > 1:
        cell1 = str(row[1] or "").replace(" ", "")
        if "세부능력" in cell1 or "특기사항" in cell1:
            return

    text = str(row[0] or "").strip()
    if not text:
        text = str(row[1] or "").strip() if len(row) > 1 else ""
    if not text or len(text) < 10:
        return

    # 전체 텍스트를 합침
    full_text = " ".join(str(c or "") for c in row).strip().replace("\n", " ")

    # 비공개 텍스트 필터링
    if is_redacted_text(full_text):
        return

    # "과목: 텍스트" 또는 "(N학기)과목: 텍스트" 패턴으로 분리
    entries = re.split(r"(?:^|\s)(?:\(\d학기\))?([가-힣A-Za-z\s·ⅠⅡ]+?):\s", full_text)

    if len(entries) > 1:
        # entries[0]은 빈 문자열 또는 첫 과목 전 텍스트
        # Issue 4: entries[0]이 비어있지 않으면 페이지 연속 텍스트 → 이전 항목에 이어붙이기
        prefix_text = entries[0].strip()
        if prefix_text and output:
            output[-1]["evaluation"] += " " + prefix_text

        for j in range(1, len(entries), 2):
            subject = entries[j].strip()
            evaluation = entries[j + 1].strip() if j + 1 < len(entries) else ""
            if subject and evaluation:
                output.append({
                    "id": new_id(),
                    "year": year,
                    "subject": subject,
                    "evaluation": evaluation,
                })
    elif full_text:
        # Issue 4: 과목:텍스트 패턴이 없고 이전 항목이 있으면 → 페이지 연속 텍스트
        if output:
            output[-1]["evaluation"] += " " + full_text
        else:
            output.append({
                "id": new_id(),
                "year": year,
                "subject": "",
                "evaluation": full_text,
            })


# ─── Reading Activities Parser ────────────────────────────────────────────

def parse_reading_activities(tables):
    rows = []
    for table in tables:
        for row in table:
            if not row:
                continue
            year = safe_int(row[0])
            if year is None or year < 1 or year > 3:
                continue
            subject_or_area = str(row[1] or "").strip() if len(row) > 1 else ""
            content = str(row[2] or "").strip().replace("\n", " ") if len(row) > 2 else ""
            if not content and not subject_or_area:
                continue
            rows.append({
                "id": new_id(),
                "year": year,
                "subjectOrArea": subject_or_area,
                "content": content,
            })
    return rows


# ─── Behavioral Assessments Parser ────────────────────────────────────────

def parse_behavioral_assessments(tables):
    rows = []
    for table in tables:
        for row in table:
            if not row:
                continue
            year = safe_int(row[0])
            if year is None or year < 1 or year > 3:
                continue
            assessment = str(row[1] or "").strip().replace("\n", " ") if len(row) > 1 else ""
            if not assessment:
                # 전체 행의 텍스트를 합침
                assessment = " ".join(str(c or "") for c in row[1:]).strip().replace("\n", " ")
            if not assessment or len(assessment) < 10:
                continue
            # 비공개 텍스트 필터링
            if is_redacted_text(assessment):
                continue
            rows.append({
                "id": new_id(),
                "year": year,
                "assessment": assessment,
            })
    return rows


# ─── Main ─────────────────────────────────────────────────────────────────

def _fix_rotated_pdf(pdf_path):
    """회전된 페이지가 있으면 정방향으로 보정한 PDF를 BytesIO로 반환.
    회전 없으면 None 반환 (원본 사용)."""
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NumberObject, NameObject
    import io

    reader = PdfReader(pdf_path)
    has_rotation = any(int(p.get("/Rotate", 0)) != 0 for p in reader.pages)
    if not has_rotation:
        return None

    writer = PdfWriter()
    for page in reader.pages:
        rot = int(page.get("/Rotate", 0))
        if rot:
            page.rotate(-rot)
        writer.add_page(page)

    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf


def parse_pdf(pdf_path):
    fixed = _fix_rotated_pdf(pdf_path)
    pdf = pdfplumber.open(fixed if fixed else pdf_path)

    # Issue 1: 텍스트 레이어 존재 여부 확인 (이미지 기반 PDF 감지)
    text_check = "".join((page.extract_text() or "") for page in pdf.pages[:3])
    if len(text_check.strip()) < 50:
        pdf.close()
        raise ValueError(
            "PDF에서 텍스트를 추출할 수 없습니다. "
            "카카오톡, 네이버, 정부24 앱에서 발급한 PDF를 업로드해주세요. "
            "(캡처 또는 인쇄를 통해 저장한 파일은 지원되지 않습니다.)"
        )

    # 모든 페이지에서 테이블 추출 + 섹션 분류
    section_tables = {
        "attendance": [],
        "awards": [],
        "creative": [],
        "volunteer": [],
        "grades": [],
        "reading": [],
        "behavioral": [],
    }

    current_section = None
    pending_grade_year = 0  # 페이지 텍스트에서 감지한 학년 (다음 성적 테이블에 적용)

    for page_idx, page in enumerate(pdf.pages):
        # 증명서 페이지 감지 → 스킵
        page_text = page.extract_text() or ""
        if CERT_PATTERN.search(page_text):
            break

        # 페이지 텍스트에서 [N학년] 패턴 감지
        page_year_match = re.search(r"\[(\d)학년\]", page_text)
        if page_year_match:
            pending_grade_year = int(page_year_match.group(1))

        tables = page.extract_tables()

        for table in tables:
            if not table:
                continue

            # 테이블 분류
            detected = classify_table(table, page_text)
            if detected:
                current_section = detected

            # 페이지 하단 정보 바 (반, 번호, 이름) 스킵
            first_cell = str(table[0][0] or "") if table[0] else ""
            if first_cell == "반" or "번호" in first_cell:
                continue

            # grades 테이블에 학년 마커 주입 — [N학년]이 테이블 자체에 있거나 같은 페이지 텍스트에서 감지된 경우
            if current_section == "grades":
                # 테이블 자체에 [N학년]이 있으면 최우선
                table_text = " ".join(str(c or "") for row in table[:6] for c in (row or []))
                ym = re.search(r"\[(\d)학년\]", table_text)
                if ym:
                    pending_grade_year = int(ym.group(1))
                    table = [["__page_year__", str(pending_grade_year)]] + table
                elif pending_grade_year > 0:
                    # 페이지에서 감지한 학년이 있고, 이 테이블이 "교과학습발달상황" 헤더를 포함하면 주입
                    # (진로선택/체육예술/세부능력 등 하위 테이블에는 주입하지 않음)
                    if "교과학습발달상황" in table_text or ("석차등급" in table_text and "학기" in table_text):
                        table = [["__page_year__", str(pending_grade_year)]] + table

            if current_section and current_section in section_tables:
                section_tables[current_section].append(table)

    pdf.close()

    # 각 섹션 파싱
    attendance = []
    for t in section_tables["attendance"]:
        attendance.extend(parse_attendance(t))

    awards = []
    for t in section_tables["awards"]:
        awards.extend(parse_awards(t))

    creative_activities = parse_creative_activities(section_tables["creative"])
    volunteer_activities = parse_volunteer_activities(section_tables["volunteer"])

    general, career, arts_physical, evaluations = parse_grades(section_tables["grades"])

    reading = parse_reading_activities(section_tables["reading"])
    behavioral = parse_behavioral_assessments(section_tables["behavioral"])

    return {
        "attendance": attendance,
        "awards": awards,
        "certifications": [],
        "creativeActivities": creative_activities,
        "volunteerActivities": volunteer_activities,
        "generalSubjects": general,
        "careerSubjects": career,
        "artsPhysicalSubjects": arts_physical,
        "subjectEvaluations": evaluations,
        "readingActivities": reading,
        "behavioralAssessments": behavioral,
        "mockExams": [],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 parse-pdf.py <pdf_path>", file=sys.stderr)
        sys.exit(1)

    result = parse_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
