import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";

interface CareerNetSchool {
  schoolName: string;
  schoolGubun: string;
  adres: string;
  region: string;
  estType: string;
}

interface CareerNetResponse {
  dataSearch?: {
    content?: CareerNetSchool[];
  };
}

export const GET = async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "검색어는 2자 이상 입력해주세요." },
      { status: 400 }
    );
  }

  const apiKey = env.CAREER_NET_API_KEY;

  if (!apiKey) {
    return NextResponse.json([]);
  }

  const url = new URL("https://www.career.go.kr/cnet/openapi/getOpenApi.json");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("svcType", "api");
  url.searchParams.set("svcCode", "SCHOOL");
  url.searchParams.set("contentType", "json");
  url.searchParams.set("gubun", "univ_list");
  url.searchParams.set("searchSchulNm", q);

  try {
    const response = await fetch(url.toString());
    const data: CareerNetResponse = await response.json();

    const content = data.dataSearch?.content;

    if (!content || content.length === 0) {
      return NextResponse.json([]);
    }

    const universities = content.map((item) => ({
      name: item.schoolName,
      type: item.schoolGubun,
      address: item.adres,
      region: item.region,
    }));

    return NextResponse.json(universities);
  } catch {
    return NextResponse.json([]);
  }
};
