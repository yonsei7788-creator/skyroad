import type { JeongsiSection } from "@/libs/jeongsi/report-types";

import { JeongsiCombinationRenderer } from "./JeongsiCombinationRenderer";
import { JeongsiRecommendationRenderer } from "./JeongsiRecommendationRenderer";
import { JeongsiScoreAnalysisRenderer } from "./JeongsiScoreAnalysisRenderer";
import { JeongsiUniversityDetailRenderer } from "./JeongsiUniversityDetailRenderer";
import { JeongsiUniversityMatchRenderer } from "./JeongsiUniversityMatchRenderer";

interface JeongsiSectionRendererProps {
  section: JeongsiSection;
  partNumber: string;
}

export const JeongsiSectionRenderer = ({
  section,
  partNumber,
}: JeongsiSectionRendererProps) => {
  switch (section.sectionId) {
    case "jeongsiScoreAnalysis":
      return (
        <JeongsiScoreAnalysisRenderer data={section} partNumber={partNumber} />
      );
    case "jeongsiUniversityMatch":
      return (
        <JeongsiUniversityMatchRenderer
          data={section}
          partNumber={partNumber}
        />
      );
    case "jeongsiRecommendation":
      return (
        <JeongsiRecommendationRenderer data={section} partNumber={partNumber} />
      );
    case "jeongsiCombination":
      return (
        <JeongsiCombinationRenderer data={section} partNumber={partNumber} />
      );
    case "jeongsiUniversityDetail":
      return (
        <JeongsiUniversityDetailRenderer
          data={section}
          partNumber={partNumber}
        />
      );
    default:
      return null;
  }
};
