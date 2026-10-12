/**
 * 전세 분류·매핑 순수 계약 acceptance test.
 *
 * 이 파일은 구현 전에 작성된 "완료 기준"이다. worker는 server/jeonse.ts를 만들어
 * 이 테스트가 통과하도록 해야 한다. 계약:
 *   - isJeonseRow(item): 월세액 0 && 보증금>0 && 갱신/종전계약 아님 일 때만 true.
 *   - parseJeonseTrade(item, ctx, index, propertyType): 전세면 보증금을 priceMan으로 매핑한
 *     MolitAptTrade, 아니면 null. 방어적 키 파싱(deposit/보증금액, monthlyRent/월세금액).
 *   - MOLIT_APT_RENT_ENDPOINT / MOLIT_VILLA_RENT_ENDPOINT 상수.
 */
import { describe, it, expect } from "vitest";
import {
  isJeonseRow,
  parseJeonseTrade,
  MOLIT_APT_RENT_ENDPOINT,
  MOLIT_VILLA_RENT_ENDPOINT,
} from "./jeonse";

const ctx = {
  lawdCd: "11680",
  district: "강남구",
  cluster: "강남권",
  lat: 37.5,
  lng: 127.0,
};

describe("MOLIT rent endpoints", () => {
  it("아파트 전월세 엔드포인트", () => {
    expect(MOLIT_APT_RENT_ENDPOINT).toContain(
      "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
    );
  });
  it("연립·다세대 전월세 엔드포인트", () => {
    expect(MOLIT_VILLA_RENT_ENDPOINT).toContain(
      "RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
    );
  });
});

describe("isJeonseRow — 전세 판정 경계", () => {
  it("월세 0 + 보증금 양수 → 전세", () => {
    expect(isJeonseRow({ monthlyRent: 0, deposit: 50000 })).toBe(true);
  });
  it("문자열 숫자도 허용", () => {
    expect(isJeonseRow({ monthlyRent: "0", deposit: "50,000" })).toBe(true);
  });
  it("한글 키(보증금액/월세금액)도 허용", () => {
    expect(isJeonseRow({ 월세금액: 0, 보증금액: 50000 })).toBe(true);
  });
  it("월세 > 0 → 전세 아님", () => {
    expect(isJeonseRow({ monthlyRent: 10, deposit: 50000 })).toBe(false);
  });
  it("보증금 0 → 전세 아님", () => {
    expect(isJeonseRow({ monthlyRent: 0, deposit: 0 })).toBe(false);
  });
  it("보증금 누락 → 전세 아님", () => {
    expect(isJeonseRow({ monthlyRent: 0 })).toBe(false);
  });
  it("갱신(useRRRight) → 전세 아님", () => {
    expect(
      isJeonseRow({ monthlyRent: 0, deposit: 50000, useRRRight: "Y" }),
    ).toBe(false);
  });
  it("종전계약(preDeposit) 존재 → 전세 아님", () => {
    expect(
      isJeonseRow({ monthlyRent: 0, deposit: 50000, preDeposit: "50000" }),
    ).toBe(false);
  });
});

describe("parseJeonseTrade — 보증금 → priceMan 매핑", () => {
  it("전세 레코드에서 보증금을 priceMan으로 매핑한다", () => {
    const trade = parseJeonseTrade(
      {
        aptNm: "테스트아파트",
        umdNm: "삼성동",
        jibun: "123",
        buildYear: "2010",
        excluUseAr: "84.9",
        floor: "5",
        dealYear: "2026",
        dealMonth: "9",
        dealDay: "30",
        deposit: "50000",
        monthlyRent: "0",
      },
      ctx,
      0,
      "apartment",
    );
    expect(trade).not.toBeNull();
    expect(trade?.priceMan).toBe(50000);
    expect(trade?.apartmentName).toBe("테스트아파트");
    expect(trade?.neighborhood).toBe("삼성동");
    expect(trade?.area).toBeCloseTo(84.9);
    expect(trade?.propertyType).toBe("apartment");
    expect(trade?.lawdCd).toBe("11680");
    expect(trade?.dealDate).toBe("2026-09-30");
  });

  it("월세 레코드는 null", () => {
    expect(
      parseJeonseTrade(
        { aptNm: "X", deposit: "1000", monthlyRent: "50" },
        ctx,
        0,
        "apartment",
      ),
    ).toBeNull();
  });

  it("보증금 0은 null", () => {
    expect(
      parseJeonseTrade(
        { aptNm: "X", deposit: "0", monthlyRent: "0" },
        ctx,
        0,
        "apartment",
      ),
    ).toBeNull();
  });

  it("면적/연식 누락 시에도 가격(보증금)은 유지한다", () => {
    const trade = parseJeonseTrade(
      { aptNm: "X", deposit: "30000", monthlyRent: "0" },
      ctx,
      0,
      "villa",
    );
    expect(trade).not.toBeNull();
    expect(trade?.priceMan).toBe(30000);
    expect(trade?.propertyType).toBe("villa");
  });
});
