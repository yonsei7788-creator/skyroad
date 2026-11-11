#!/usr/bin/env python3
"""
정시 입시자료 엑셀(외주 납품본) → 정규화 JSON 변환기

엑셀의 데이터 시트(10~50)를 영문 키 JSON 으로 **손실 없이** 옮긴다.
엔진용 JSON(admission-plans-2027 / admission-results)은 이 결과를 입력으로
scripts/jeongsi/build-engine-data.ts 가 만든다.

규칙
- 빈 칸(= 아직 조사 안 함)은 키를 생략한다. null 을 쓰지 않는다.
- 특수값('미공개' / '해당없음' / '발표전' / '확인필요')은 문자열 그대로 둔다.
  '미공개'(공개 안 함)와 '해당없음'(개념상 없음)은 의미가 달라 합치지 않는다.
- Y/N 칸은 true/false 로 바꾼다. 그 밖의 값('일부', '해당없음')은 그대로 둔다.
- 날짜는 YYYY-MM-DD 문자열로 쓴다.
- 22_모집인원_3개년 은 21 의 수식 보기 시트라 옮기지 않는다.
- region(권역)은 엑셀에 없어 이 스크립트가 대학코드로 보강한다(SEOUL_CODES · METRO_CODES).

타입 원본: libs/jeongsi/source-types.ts

Usage:
  python3 -I scripts/jeongsi/normalize-excel.py <xlsx_path> [out_dir]
  (out_dir 기본값: libs/jeongsi/data/source)
"""

import datetime
import hashlib
import json
import os
import sys
from collections import OrderedDict

import openpyxl

DEFAULT_OUT_DIR = os.path.join("libs", "jeongsi", "data", "source")

SPECIAL_VALUES = {"미공개", "해당없음", "발표전", "확인필요", "미조사"}

# ─── 권역 보강 ───
# 엑셀에 소재지 칸이 없다. 캠퍼스 단위(대학코드)로 지정한다.
# 서울·수도권(경기·인천)만 나열하고 나머지는 지방이다.
SEOUL_CODES = {
    "CUKT", "CUKM", "KSU", "KKU", "KGUS", "KHU", "KU", "KWU", "KMU", "DSW",
    "DGU", "DDW", "MJU", "SYU", "SMU", "SGU", "SKG", "SNT", "SNUE", "SNU",
    "UOS", "SWU", "SKKU", "SSW", "SJU", "SMWU", "SSU", "YSU", "EWU", "CAU",
    "CSU", "CGA", "HUFS", "KNSU", "HSU", "HYU", "HIU", "SKHU", "KBU",
}
METRO_CODES = {
    "GCU", "GCUM", "CUK", "KANU", "KGU", "KDU", "GINUE", "KHUG", "DKU", "DJU",
    "DGUB", "DYU", "MJUY", "SUWU", "SKU", "SKKUS", "SHU", "SHUD", "ACTS",
    "AJU", "AYU", "AYUG", "YIU", "EUL", "EULU", "INU", "INHA", "JBUG", "CHA",
    "CWUI", "PTU", "HKNU", "HKNUP", "TUK", "HUFSG", "HUFSD", "KAU", "HSEU",
    "HSNU", "HYUE", "UHS", "KNUTU", "CAUD", "HSMU",
}


def region_of(code):
    if code in SEOUL_CODES:
        return "서울"
    if code in METRO_CODES:
        return "수도권"
    return "지방"


# ─── 값 변환 ───


def to_text(value):
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def to_number(value):
    """숫자 또는 특수값 문자열. 그 밖의 문자열은 원문 그대로 둔다."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return int(value) if float(value).is_integer() else value
    text = to_text(value)
    try:
        number = float(text.replace(",", ""))
        return int(number) if number.is_integer() else number
    except ValueError:
        return text


def to_flag(value):
    text = to_text(value)
    if text == "Y":
        return True
    if text == "N":
        return False
    return text


def to_date(value):
    if isinstance(value, datetime.datetime):
        return value.date().isoformat()
    return to_text(value)


CONVERTERS = {"s": to_text, "n": to_number, "yn": to_flag, "d": to_date}


def pick(row, mapping):
    """mapping: [(엑셀 헤더, 키 경로, 종류)] → 중첩 dict. 빈 칸은 생략."""
    result = OrderedDict()
    for header, key_path, kind in mapping:
        if header not in row:
            raise KeyError(f"엑셀에 '{header}' 칸이 없습니다.")
        value = row[header]
        if value is None or (isinstance(value, str) and value.strip() == ""):
            continue
        target = result
        *parents, leaf = key_path.split(".")
        for parent in parents:
            target = target.setdefault(parent, OrderedDict())
        target[leaf] = CONVERTERS[kind](value)
    return result


class SourceRegistry:
    """
    출처(URL + 문서·쪽) 중복 제거.
    같은 대학어디가 경로가 수만 번 반복돼 원문 그대로 두면 용량의 40% 를
    차지한다. (url, doc) 쌍을 sources.json 에 한 번만 두고 ID 로 참조한다.
    """

    def __init__(self):
        self.ids = {}
        self.entries = []

    def intern(self, entry, prefix):
        url_key, doc_key = f"{prefix}Url", f"{prefix}Doc"
        if url_key not in entry and doc_key not in entry:
            return
        pair = (entry.pop(url_key, None), entry.pop(doc_key, None))
        source_id = self.ids.get(pair)
        if source_id is None:
            source_id = f"S{len(self.entries) + 1:05d}"
            self.ids[pair] = source_id
            source = OrderedDict([("id", source_id)])
            if pair[0] is not None:
                source["url"] = pair[0]
            if pair[1] is not None:
                source["doc"] = pair[1]
            self.entries.append(source)
        entry[f"{prefix}Id"] = source_id


SOURCES = SourceRegistry()
SOURCE_PREFIXES = ("source", "initialSource", "finalSource", "beforeSource", "afterSource")


def intern_sources(entry):
    for prefix in SOURCE_PREFIXES:
        SOURCES.intern(entry, prefix)
    return entry


def grade_table(row):
    table = OrderedDict()
    for grade in range(1, 10):
        value = row.get(f"{grade}등급")
        if value is None:
            continue
        table[str(grade)] = to_number(value)
    return table


# ─── 시트별 매핑 ───

UNIVERSITY_MAP = [
    ("대학코드", "code", "s"),
    ("대학명", "university", "s"),
    ("캠퍼스", "campus", "s"),
    ("기준학년도", "baseYear", "n"),
    ("입학처URL", "admissionsUrl", "s"),
    ("2027 정시 모집요강", "disclosure.guide2027", "s"),
    ("2026 정시 모집요강", "disclosure.guide2026", "s"),
    ("2025 정시 모집요강", "disclosure.guide2025", "s"),
    ("수능 반영방법(비율·지표)", "disclosure.formula", "s"),
    ("영어 등급별 점수", "disclosure.englishTable", "s"),
    ("한국사 등급별 점수", "disclosure.historyTable", "s"),
    ("탐구 변표(2026)", "disclosure.convertedTable2026", "s"),
    ("탐구 변표(2027)", "disclosure.convertedTable2027", "s"),
    ("2027 최종 모집인원(이월 반영)", "disclosure.finalQuota2027", "s"),
    ("경쟁률(2026)", "disclosure.competitionRate2026", "s"),
    ("충원(2026)", "disclosure.additionalPass2026", "s"),
    ("50%컷", "disclosure.cut50", "s"),
    ("70%컷", "disclosure.cut70", "s"),
    ("최종등록자 평균", "disclosure.registrantAverage", "s"),
    ("최종합격선(최저)", "disclosure.lowestPass", "s"),
    ("입결 3개년(2024~2026)", "disclosure.results3y", "s"),
    ("입결 공개 단위", "resultUnit", "s"),
    ("입결 공개 지표", "resultMetricNote", "s"),
    ("확인일", "checkedAt", "d"),
]

UNIT_MAP = [
    ("모집단위ID", "unitId", "s"),
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("캠퍼스", "campus", "s"),
    ("모집단위명", "department", "s"),
    ("계열", "track", "s"),
    ("모집군", "group", "s"),
    ("전형명", "admissionType", "s"),
    ("모집단위 변동", "unitStatus", "s"),
    ("반영방법ID(2027)", "formulaId", "s"),
    ("전형요소 수능(%)", "selectionWeights.suneung", "n"),
    ("전형요소 학생부(%)", "selectionWeights.schoolRecord", "n"),
    ("전형요소 기타(%)", "selectionWeights.other", "n"),
    ("기타 전형요소 내용", "selectionWeights.otherNote", "s"),
    ("2027 변경여부", "changed2027", "yn"),
    ("2027 변경 요약", "changeSummary", "s"),
    ("출처URL(모집요강)", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("기준학년도", "baseYear", "n"),
    ("확인일", "checkedAt", "d"),
]

QUOTA_MAP = [
    ("학년도", "year", "n"),
    ("당해 모집단위명", "department", "s"),
    ("당해 모집군", "group", "s"),
    ("당해 전형명", "admissionType", "s"),
    ("최초 모집인원", "initialQuota", "n"),
    ("수시이월 인원", "carryOver", "n"),
    ("최종 모집인원", "finalQuota", "n"),
    ("최초 출처URL", "initialSourceUrl", "s"),
    ("최초 출처 문서·쪽", "initialSourceDoc", "s"),
    ("최종 출처URL", "finalSourceUrl", "s"),
    ("최종 출처 문서·쪽", "finalSourceDoc", "s"),
]

FORMULA_MAP = [
    ("반영방법ID", "id", "s"),
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("기준학년도", "year", "n"),
    ("적용 모집단위", "appliesTo", "s"),
    ("수능 환산 만점", "totalScore", "n"),
    ("반영영역 방식", "areaRule", "s"),
    ("선택반영 규칙", "selection.rule", "s"),
    ("선택 대상 국어", "selection.targets.korean", "yn"),
    ("선택 대상 수학", "selection.targets.math", "yn"),
    ("선택 대상 영어", "selection.targets.english", "yn"),
    ("선택 대상 탐구", "selection.targets.inquiry", "yn"),
    ("선택 영역 수", "selection.count", "n"),
    ("선택 1순위 비율(%)", "selection.rankRatios.first", "n"),
    ("선택 2순위 비율(%)", "selection.rankRatios.second", "n"),
    ("선택 3순위 비율(%)", "selection.rankRatios.third", "n"),
    ("순위 비교 기준", "selection.rankBasis", "s"),
    ("국어 활용지표", "korean.metric", "s"),
    ("국어 반영비율(%)", "korean.ratio", "n"),
    ("국어 선택과목 제한", "korean.restriction", "s"),
    ("수학 활용지표", "math.metric", "s"),
    ("수학 반영비율(%)", "math.ratio", "n"),
    ("수학 지정과목", "math.restriction", "s"),
    ("영어 반영방식", "english.mode", "s"),
    ("영어 반영비율(%)", "english.ratio", "n"),
    ("영어표ID", "english.tableId", "s"),
    ("영어 가감 위치", "english.applyPosition", "s"),
    ("탐구 활용지표", "inquiry.metric", "s"),
    ("탐구 반영비율(%)", "inquiry.ratio", "n"),
    ("탐구 반영과목수", "inquiry.count", "n"),
    ("탐구 2과목 처리", "inquiry.combine", "s"),
    ("변표ID", "inquiry.convertedTableId", "s"),
    ("탐구 지정", "inquiry.requirement", "s"),
    ("탐구 기타 제한", "inquiry.restrictionNote", "s"),
    ("제2외국어·한문 대체", "inquiry.secondLanguageSubstitute", "s"),
    ("한국사 반영방식", "history.mode", "s"),
    ("한국사 반영비율(%)", "history.ratio", "n"),
    ("한국사표ID", "history.tableId", "s"),
    ("한국사 가감 방식", "history.applyPosition", "s"),
    ("소수점 처리 단계", "rounding.stage", "s"),
    ("소수점 자릿수", "rounding.digits", "n"),
    ("소수점 처리 방식", "rounding.mode", "s"),
    ("가산점 유무", "hasBonus", "yn"),
    ("기타 가산·감점(원문)", "otherAdjustmentsText", "s"),
    ("산출식 원문", "formulaText", "s"),
    ("대학 공식 계산예시", "officialExample", "s"),
    ("2027 변경여부", "changed2027", "yn"),
    ("2027 변경내용", "change2027", "s"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("확인일", "checkedAt", "d"),
]

GRADE_TABLE_HEAD = [
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("기준학년도", "year", "n"),
    ("적용범위", "scope", "s"),
    ("반영방식", "mode", "s"),
]
GRADE_TABLE_TAIL = [
    ("2027 변경여부", "changed2027", "yn"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("확인일", "checkedAt", "d"),
]

CONVERTED_HEAD_MAP = [
    ("변표ID", "id", "s"),
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("기준학년도", "year", "n"),
    ("적용범위", "scope", "s"),
    ("자료상태", "status", "s"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("확인일", "checkedAt", "d"),
    ("비고", "note", "s"),
]

CONVERTED_ROW_MAP = [
    ("백분위", "percentile", "n"),
    ("사회탐구 변표", "social", "n"),
    ("과학탐구 변표", "science", "n"),
    ("직업탐구 변표", "vocational", "n"),
]

BONUS_MAP = [
    ("반영방법ID", "formulaId", "s"),
    ("대학명", "university", "s"),
    ("기준학년도", "year", "n"),
    ("가산 영역", "area", "s"),
    ("대상 과목", "targetSubjects", "s"),
    ("가산 값", "value", "n"),
    ("가산 단위", "unit", "s"),
    ("가산 적용대상", "appliesTo", "s"),
    ("가산 적용 단위", "scope", "s"),
    ("적용 조건", "condition", "s"),
    ("가산 원문", "text", "s"),
    ("2027 변경여부", "changed2027", "yn"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("확인일", "checkedAt", "d"),
    ("비고", "note", "s"),
]

GRADE_SCORE_MAP_HEAD = [
    ("등급표ID", "id", "s"),
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("기준학년도", "year", "n"),
    ("표 종류", "kind", "s"),
    ("대상 영역", "area", "s"),
    ("입력값", "input", "s"),
]
GRADE_SCORE_MAP_TAIL = [
    ("적용 반영방법ID", "formulaId", "s"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
    ("확인일", "checkedAt", "d"),
]

COMPETITION_MAP = [
    ("모집단위ID", "unitId", "s"),
    ("입결학년도", "year", "n"),
    ("대학명", "university", "s"),
    ("캠퍼스", "campus", "s"),
    ("당해 모집단위명", "department", "s"),
    ("당해 모집군", "group", "s"),
    ("당해 전형명", "admissionType", "s"),
    ("모집인원(당해 최종)", "quota", "n"),
    ("경쟁률", "competitionRate", "n"),
    ("충원합격 인원", "additionalPassCount", "n"),
    ("충원율(%)", "additionalPassRate", "n"),
    ("자료출처 구분", "sourceType", "s"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
]

RESULT_SCORE_MAP = [
    ("모집단위ID", "unitId", "s"),
    ("입결학년도", "year", "n"),
    ("대학명", "university", "s"),
    ("당해 모집단위명", "department", "s"),
    ("당해 모집군", "group", "s"),
    ("당해 모집 전형", "admissionType", "s"),
    ("성적지표 유형", "scoreType", "s"),
    ("반영 영역(원문)", "areaText", "s"),
    ("지표 영역 결정", "areaDecision", "s"),
    ("지표 국어", "areas.korean", "yn"),
    ("지표 수학", "areas.math", "yn"),
    ("지표 영어", "areas.english", "yn"),
    ("지표 탐구", "areas.inquiry", "yn"),
    ("지표 탐구 처리", "inquiryHandling", "s"),
    ("지표 만점", "scaleMax", "n"),
    ("당해 반영방법ID", "formulaId", "s"),
    ("기준 집단", "basisGroup", "s"),
    ("50%컷", "cut50", "n"),
    ("70%컷", "cut70", "n"),
    ("최종등록자 평균", "average", "n"),
    ("최종합격선(최저)", "lowestPass", "n"),
    ("최고점", "highest", "n"),
    ("기타 컷 기준(%)", "otherCutPercent", "n"),
    ("기타 컷 값", "otherCutValue", "n"),
    ("영어 등급 평균", "englishGradeAverage", "n"),
    ("자료출처 구분", "sourceType", "s"),
    ("출처URL", "sourceUrl", "s"),
    ("출처 문서·쪽", "sourceDoc", "s"),
]

CHANGE_MAP = [
    ("변경ID", "id", "s"),
    ("대학코드", "universityCode", "s"),
    ("대학명", "university", "s"),
    ("모집단위ID", "unitRef", "s"),
    ("적용범위", "scope", "s"),
    ("변경 구분", "kind", "s"),
    ("2026 내용", "before", "s"),
    ("2027 내용", "after", "s"),
    ("2026 출처URL", "beforeSourceUrl", "s"),
    ("2026 출처 문서·쪽", "beforeSourceDoc", "s"),
    ("2027 출처URL", "afterSourceUrl", "s"),
    ("2027 출처 문서·쪽", "afterSourceDoc", "s"),
    ("비고", "note", "s"),
]


# ─── 시트 읽기 ───


def read_sheet(workbook, name):
    rows = workbook[name].iter_rows(values_only=True)
    header = [to_text(cell) if cell is not None else None for cell in next(rows)]
    records = []
    for values in rows:
        if all(cell is None for cell in values):
            continue
        records.append(dict(zip(header, values)))
    return records


def build_universities(workbook):
    result = []
    for row in read_sheet(workbook, "10_공개현황"):
        if row.get("대학코드") is None:
            continue
        entry = intern_sources(pick(row, UNIVERSITY_MAP))
        entry["region"] = region_of(entry["code"])
        result.append(entry)
    return result


def build_units(workbook):
    quotas_by_unit = {}
    for row in read_sheet(workbook, "21_모집인원"):
        quota = intern_sources(pick(row, QUOTA_MAP))
        quotas_by_unit.setdefault(to_text(row["모집단위ID"]), []).append(quota)

    units = []
    for row in read_sheet(workbook, "20_모집단위"):
        unit = intern_sources(pick(row, UNIT_MAP))
        unit["region"] = region_of(unit["universityCode"])
        quotas = quotas_by_unit.get(unit["unitId"], [])
        unit["quotas"] = sorted(quotas, key=lambda quota: -quota["year"])
        units.append(unit)
    return units


def build_grade_tables(workbook, sheet, id_header):
    result = []
    for row in read_sheet(workbook, sheet):
        entry = pick(row, [(id_header, "id", "s")] + GRADE_TABLE_HEAD)
        entry["scoreByGrade"] = grade_table(row)
        entry.update(pick(row, GRADE_TABLE_TAIL))
        result.append(intern_sources(entry))
    return result


def build_converted_tables(workbook):
    tables = OrderedDict()
    for row in read_sheet(workbook, "33_탐구변표"):
        head = pick(row, CONVERTED_HEAD_MAP)
        table = tables.get(head["id"])
        if table is None:
            table = intern_sources(head)
            table["rows"] = []
            tables[head["id"]] = table
        table["rows"].append(pick(row, CONVERTED_ROW_MAP))
    for table in tables.values():
        table["rows"].sort(key=lambda entry: -entry["percentile"])
    return list(tables.values())


def build_grade_score_tables(workbook):
    result = []
    for row in read_sheet(workbook, "36_등급점수표"):
        entry = pick(row, GRADE_SCORE_MAP_HEAD)
        entry["scoreByGrade"] = grade_table(row)
        entry.update(pick(row, GRADE_SCORE_MAP_TAIL))
        result.append(intern_sources(entry))
    return result


def build_simple(workbook, sheet, mapping):
    return [intern_sources(pick(row, mapping)) for row in read_sheet(workbook, sheet)]


# ─── 출력 ───


def write_json_lines(path, entries):
    """배열 JSON. 한 줄에 한 레코드 — 용량을 줄이면서 diff 를 읽을 수 있게."""
    with open(path, "w", encoding="utf-8") as file:
        file.write("[\n")
        for index, entry in enumerate(entries):
            line = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
            suffix = ",\n" if index < len(entries) - 1 else "\n"
            file.write(line + suffix)
        file.write("]\n")


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    xlsx_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    workbook = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)

    outputs = OrderedDict(
        [
            ("universities", build_universities(workbook)),
            ("units", build_units(workbook)),
            ("formulas", build_simple(workbook, "30_수능반영방법", FORMULA_MAP)),
            (
                "english-tables",
                build_grade_tables(workbook, "31_영어환산", "영어표ID"),
            ),
            (
                "history-tables",
                build_grade_tables(workbook, "32_한국사환산", "한국사표ID"),
            ),
            ("converted-standard-tables", build_converted_tables(workbook)),
            ("bonuses", build_simple(workbook, "34_가산점", BONUS_MAP)),
            ("grade-score-tables", build_grade_score_tables(workbook)),
            (
                "competitions",
                build_simple(workbook, "40_입결_경쟁충원", COMPETITION_MAP),
            ),
            (
                "result-scores",
                build_simple(workbook, "41_입결_성적", RESULT_SCORE_MAP),
            ),
            ("changes", build_simple(workbook, "50_2027변경사항", CHANGE_MAP)),
        ]
    )
    outputs["sources"] = SOURCES.entries

    for name, entries in outputs.items():
        write_json_lines(os.path.join(out_dir, f"{name}.json"), entries)

    manifest = OrderedDict(
        [
            ("sourceFile", os.path.basename(xlsx_path)),
            ("sourceSha256", sha256_of(xlsx_path)),
            ("generatedAt", datetime.date.today().isoformat()),
            ("admissionYear", 2027),
            ("counts", OrderedDict((name, len(e)) for name, e in outputs.items())),
        ]
    )
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)
        file.write("\n")

    for name, entries in outputs.items():
        print(f"{name}: {len(entries)}")


if __name__ == "__main__":
    main()
