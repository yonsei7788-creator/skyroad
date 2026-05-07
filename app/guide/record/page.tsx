import type { Metadata } from "next";

import { Header } from "@/app/_components/Header";
import { Footer } from "@/app/_components/Footer";

import { RecordGuide } from "./_components/RecordGuide";

export const metadata: Metadata = {
  title: "생기부 발급 및 등록 가이드 | SKYROAD",
  description:
    "정부24와 카카오톡 전자증명서로 학교생활기록부(생기부)를 발급받고 SKYROAD에 등록하는 방법을 단계별로 안내합니다.",
  alternates: {
    canonical: "/guide/record",
  },
};

const RecordGuidePage = () => {
  return (
    <>
      <Header />
      <main>
        <RecordGuide />
      </main>
      <Footer />
    </>
  );
};

export default RecordGuidePage;
