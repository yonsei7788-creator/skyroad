import type { JeongsiSection } from "@/libs/jeongsi/report-types";

import { JeongsiCombinationRenderer } from "./JeongsiCombinationRenderer";
import { JeongsiRecommendationRenderer } from "./JeongsiRecommendationRenderer";
import { JeongsiScoreAnalysisRenderer } from "./JeongsiScoreAnalysisRenderer";
import { JeongsiUniversityDetailRenderer } from "./JeongsiUniversityDetailRenderer";
import { JeongsiUniversityMatchRenderer } from "./JeongsiUniversityMatchRenderer";

interface JeongsiSectionRendererProps {
  section: JeongsiSection;
  sectionNumber: number;
}

export const JeongsiSectionRenderer = ({
  section,
  sectionNumber,
}: JeongsiSectionRendererProps) => {
  switch (section.sectionId) {
    case "jeongsiScoreAnalysis":
      return (
        <JeongsiScoreAnalysisRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "jeongsiUniversityMatch":
      return (
        <JeongsiUniversityMatchRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "jeongsiRecommendation":
      return (
        <JeongsiRecommendationRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "jeongsiCombination":
      return (
        <JeongsiCombinationRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    case "jeongsiUniversityDetail":
      return (
        <JeongsiUniversityDetailRenderer
          data={section}
          sectionNumber={sectionNumber}
        />
      );
    default:
      return null;
  }
};
