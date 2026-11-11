// 최상위 템플릿
export { JeongsiReport } from "./JeongsiReport";

// 레이아웃 (정시 전용)
export { JeongsiCover } from "./JeongsiCover";
export { JeongsiTableOfContents } from "./JeongsiTableOfContents";
export { JeongsiDivider } from "./JeongsiDivider";
export { JeongsiPartHeading } from "./JeongsiPartHeading";

// 섹션 디스패처
export { JeongsiSectionRenderer } from "./JeongsiSectionRenderer";

// PART 별 섹션 렌더러
export { JeongsiScoreAnalysisRenderer } from "./JeongsiScoreAnalysisRenderer";
export { JeongsiUniversityMatchRenderer } from "./JeongsiUniversityMatchRenderer";
export { JeongsiRecommendationRenderer } from "./JeongsiRecommendationRenderer";
export { JeongsiCombinationRenderer } from "./JeongsiCombinationRenderer";
export { JeongsiUniversityDetailRenderer } from "./JeongsiUniversityDetailRenderer";

// 공용 배지 프리미티브
export {
  JeongsiChanceBadge,
  JeongsiGroupChip,
  JeongsiTierBadge,
} from "./JeongsiBadge";

// PART 구성 (템플릿·목차 공유 단일 출처)
export { JEONGSI_PART_CONFIG } from "./part-config";
export type { JeongsiPartConfig, JeongsiPartPoint } from "./part-config";
