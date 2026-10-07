import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Home as HomeIcon,
  LayoutGrid,
  MapPin,
  Menu,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrainFront,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

type Listing = {
  id: string;
  name: string;
  district: string;
  districtName?: string;
  cluster: string;
  lat: number;
  lng: number;
  price: number;
  area: number;
  floor: string;
  year: number;
  station: string;
  contract: string;
  visual: string;
  lawdCd?: string;
  neighborhood?: string;
  jibun?: string;
  propertyType?: "apartment" | "villa";
  trendPct?: number;
  trendPcts?: Partial<Record<1 | 3 | 5 | 10, number>>;
  areaBucket?: string;
  builtAge?: number;
};

const formatPrice = (value: number) => {
  if (value >= 10000) {
    const eok = (value / 10000).toFixed(2).replace(/\.?0+$/, "");
    return `${eok}억`;
  }
  return `${value.toLocaleString("ko-KR")}만`;
};

const formatNumber = (value: number) => value.toLocaleString("ko-KR");

const getLoanByPayment = (monthly: number, years: number, annualRate: number) => {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return monthly * months;
  return monthly * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
};

function BudgetField({
  label,
  value,
  unit,
  onChange,
  min = 0,
  step = 100,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="budget-field">
      <span>{label}</span>
      <div className="budget-field-input">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          aria-label={label}
        />
        <em>{unit}</em>
      </div>
    </label>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ListingVisual({ listing }: { listing: Listing }) {
  return (
    <div className={`listing-visual bg-gradient-to-br ${listing.visual}`}>
      <div className="visual-sun" />
      <div className="building-silhouette">
        {Array.from({ length: 28 }).map((_, index) => (
          <i key={index} style={{ opacity: 0.45 + ((index * 7) % 5) / 10 }} />
        ))}
      </div>
      <div className="visual-copy">
        <span>{listing.districtName ?? "SEOUL"} / {listing.propertyType === "villa" ? "VILLA" : "APT"}</span>
        <strong>{listing.area}㎡</strong>
      </div>
      <div className="visual-stamp">{listing.areaBucket ?? "실거래"}</div>
    </div>
  );
}

function ListingCard({
  listing,
  selected,
  onSelect,
  periodYears,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
  periodYears: number;
}) {
  return (
    <article className={`listing-card ${selected ? "is-selected" : ""}`}>
      <div className="listing-card-top">
        <ListingVisual listing={listing} />
        <button
          className={`save-button ${selected ? "is-selected" : ""}`}
          onClick={onSelect}
          aria-label={`${listing.name} 비교 ${selected ? "해제" : "추가"}`}
          title={selected ? "비교에서 빼기" : "비교에 추가"}
        >
          {selected ? <Check size={17} strokeWidth={2.7} /> : <Scale size={17} />}
        </button>
        <div className="listing-card-label">
          <span>{listing.propertyType === "villa" ? "빌라·다세대" : "아파트"} 신고 실거래</span>
          <strong>{formatPrice(listing.price)}</strong>
        </div>
      </div>
      <div className="listing-card-body">
        <div className="listing-heading">
          <div>
            <h3>{listing.name}</h3>
            <p>
              <MapPin size={13} /> {listing.district}
            </p>
          </div>
        </div>
        <div className="listing-stats">
          <span>{listing.area}㎡ · {listing.areaBucket ?? "평형 확인"} · {listing.floor}</span>
          <span>{listing.year > 0 ? `${listing.year}년식 · ${listing.builtAge}년차` : "연식 정보 없음"}</span>
        </div>
        <div className="listing-route">
          <TrainFront size={14} />
          <span>{listing.station}</span>
          <b>{listing.contract}</b>
        </div>
        <div className="tag-row">
          <span>{listing.propertyType === "villa" ? "빌라" : "아파트"}</span>
          {listing.trendPct !== undefined && <span className={listing.trendPct >= 0 ? "trend-up" : "trend-down"}>{periodYears}년 상승폭 {listing.trendPct >= 0 ? "+" : ""}{listing.trendPct}%</span>}
        </div>
      </div>
    </article>
  );
}

function MapPanel({
  listings: visibleListings,
  budgetTotal,
  selectedIds,
  onSelect,
}: {
  listings: Listing[];
  budgetTotal: number;
  selectedIds: string[];
  onSelect: (id: string) => void;
}) {
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  const drawMarkers = (map: kakao.maps.Map) => {
    if (!window.kakao?.maps) return;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();
    visibleListings.forEach((listing) => {
      const position = new window.kakao.maps.LatLng(listing.lat, listing.lng);
      const markerContent = document.createElement("button");
      markerContent.className = `map-price-marker ${selectedIds.includes(listing.id) ? "is-selected" : ""}`;
      markerContent.type = "button";
      markerContent.innerHTML = `<strong>${formatPrice(listing.price)}</strong><span>${listing.name}</span>`;
      markerContent.setAttribute("aria-label", `${listing.name} ${formatPrice(listing.price)} 비교 추가`);

      const overlay = new window.kakao.maps.CustomOverlay({
        map,
        position,
        content: markerContent,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: selectedIds.includes(listing.id) ? 10 : 1,
        clickable: true,
      });
      window.kakao.maps.event.addListener(overlay, "click", () => onSelect(listing.id));
      overlaysRef.current.push(overlay);
      bounds.extend(position);
    });

    if (visibleListings.length > 0) {
      map.setBounds(bounds, 56, 56, 56, 56);
    }
  };

  useEffect(() => () => {
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
  }, []);

  useEffect(() => {
    if (mapRef.current) drawMarkers(mapRef.current);
  }, [visibleListings, selectedIds]);

  return (
    <div className="map-panel">
      <div className="map-panel-header">
        <div>
          <span className="mini-label">SEOUL / LOCATION VIEW</span>
          <h3>가격과 위치를 같이 보세요.</h3>
        </div>
        <div className="map-panel-meta"><span className="live-dot" /> {visibleListings.length}개 표시 중</div>
      </div>
      <div className="map-stage">
        <MapView
          className="listing-map"
          initialCenter={{ lat: 37.552, lng: 126.99 }}
          initialLevel={8}
          onMapReady={(map) => {
            mapRef.current = map;
            drawMarkers(map);
          }}
        />
        <div className="map-source-note"><CircleDollarSign size={14} /><span>매매가 {formatPrice(budgetTotal)} 이하 · 현재 필터 결과</span></div>
        <div className="map-legend"><span><i className="legend-dot fit" /> 예산 안</span><span><i className="legend-dot selected" /> 비교 선택</span><span><MapPin size={12} /> 마커를 눌러 비교에 추가</span></div>
      </div>
    </div>
  );
}

type KaptSignalInfo = {
  subwayStation?: string;
  subwayLine?: string;
  subwayDistance?: string;
  busDistance?: string;
  convenienceFacilities?: string;
  educationFacilities?: string;
};

function KaptSignalCards({ info, loading }: { info?: KaptSignalInfo; loading: boolean }) {
  const cards = [
    {
      label: "교통",
      icon: <TrainFront size={15} />,
      value: info?.subwayStation ? `${info.subwayLine ? `${info.subwayLine} ` : ""}${info.subwayStation}` : "정보 없음",
      detail: info?.subwayDistance || info?.busDistance ? `지하철 ${info.subwayDistance ?? "거리 확인"} · 버스 ${info.busDistance ?? "거리 확인"}` : "K-apt 교통시설 정보 기준",
    },
    {
      label: "학군",
      icon: <BadgeCheck size={15} />,
      value: info?.educationFacilities || "정보 없음",
      detail: "K-apt 교육시설 정보 기준",
    },
    {
      label: "편의시설",
      icon: <LayoutGrid size={15} />,
      value: info?.convenienceFacilities || "정보 없음",
      detail: "K-apt 단지 편의시설 정보 기준",
    },
  ];

  return (
    <div className="kapt-signal-panel">
      <div className="comparison-subhead"><Sparkles size={14} /> 생활 인프라 <span className="kapt-source-badge">K-apt LIVE</span></div>
      <div className="kapt-signal-grid">
        {cards.map((card) => (
          <div className="kapt-signal-card" key={card.label}>
            <div className="kapt-signal-card-head">{card.icon}<span>{card.label}</span></div>
            <strong>{loading ? "조회 중" : card.value}</strong>
            <small>{loading ? "공식 단지정보를 불러오는 중" : card.detail}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [savings, setSavings] = useState(24000);
  const [monthly, setMonthly] = useState(380);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(4.2);
  const [ltv, setLtv] = useState(70);
  const [districtFilter, setDistrictFilter] = useState("전체 구");
  const [area, setArea] = useState("전체 평형");
  const [sort, setSort] = useState("낮은 가격순");
  const [priceLimit, setPriceLimit] = useState(80000);
  const [onlyFit, setOnlyFit] = useState(true);
  const [propertyTypes, setPropertyTypes] = useState<Array<"apartment" | "villa">>(["apartment"]);
  const [periodYears, setPeriodYears] = useState<1 | 3 | 5 | 10>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonLoadTimedOut, setComparisonLoadTimedOut] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [region, setRegion] = useState<"seoul" | "gyeonggi">("seoul");
  const { data: districtMetadata } = trpc.realEstate.districts.useQuery({ region }, { staleTime: 60 * 60 * 1000 });
  const requestedPropertyType = propertyTypes.length === 2 ? "all" : propertyTypes[0] ?? "apartment";
  const tradeMonths = requestedPropertyType === "apartment" ? 6 : 12;
  const { data: tradeResponse, isLoading: tradesLoading, isError: tradesError } = trpc.realEstate.recentTrades.useQuery(
    { region, months: tradeMonths, propertyType: requestedPropertyType, periodYears },
    { staleTime: 10 * 60 * 1000, retry: 1 },
  );

  const budget = useMemo(() => {
    const repaymentLoan = getLoanByPayment(monthly, years, rate);
    const ltvCapPrice = savings / Math.max(0.01, 1 - ltv / 100);
    const total = Math.max(0, Math.floor(Math.min(savings + repaymentLoan, ltvCapPrice) / 500) * 500);
    return {
      total,
      loan: Math.max(0, total - savings),
      repaymentLoan,
      ltvCapPrice,
    };
  }, [savings, monthly, years, rate, ltv]);

  const listings = useMemo<Listing[]>(() => {
    if (!tradeResponse?.data?.length) return [];
    const gradients = ["from-[#97bbc8] via-[#dfe9e4] to-[#f5d9a8]", "from-[#b2c8db] via-[#eef1e7] to-[#e2bc9d]", "from-[#b8d5cb] via-[#f4e6c5] to-[#c3a889]", "from-[#c2d8e0] via-[#f3ebd3] to-[#d5ae92]"];
    return tradeResponse.data.map((trade, index) => ({
      id: trade.id,
      name: trade.apartmentName,
      district: `${trade.district} ${trade.neighborhood}`,
      districtName: trade.district,
      cluster: trade.cluster,
      lat: trade.lat,
      lng: trade.lng,
      price: trade.priceMan,
      area: trade.area,
      floor: trade.floor ? `${trade.floor}층` : "층 정보 없음",
      year: trade.year,
      station: trade.roadName ? `${trade.roadName} 일대` : "주소 정보 확인",
      contract: `계약일 ${trade.dealDate}`,
      visual: gradients[index % gradients.length],
      lawdCd: trade.lawdCd,
      neighborhood: trade.neighborhood,
      jibun: trade.jibun,
      propertyType: trade.propertyType,
      trendPct: trade.trendPct,
      trendPcts: trade.trendPcts,
      areaBucket: trade.area < 66 ? "10평대" : trade.area < 99 ? "20평대" : trade.area < 132 ? "30평대" : trade.area < 165 ? "40평대" : "50평대 이상",
      builtAge: trade.year > 0 ? Math.max(0, 2026 - trade.year) : 0,
    }));
  }, [budget.total, tradeResponse]);

  const districtOptions = useMemo(() => districtMetadata?.map(({ district }) => district) ?? Array.from(new Set(listings.map((listing) => listing.districtName).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "ko")), [districtMetadata, listings]);

  const filteredListings = useMemo(() => {
    const next = listings.filter((listing) => {
      const fitsDistrict = districtFilter === "전체 구" || listing.districtName === districtFilter;
      const fitsArea = area === "전체 평형" || listing.areaBucket === area;
      const fitsBudget = !onlyFit || listing.price <= budget.total;
      const fitsPrice = listing.price <= priceLimit;
      return fitsDistrict && fitsArea && fitsBudget && fitsPrice;
    });
    return [...next].sort((a, b) => {
      if (sort === "낮은 가격순") return a.price - b.price;
      if (sort === "높은 가격순") return b.price - a.price;
      if (sort === "넓은 평형순") return b.area - a.area;
      return b.area - a.area;
    });
  }, [area, budget.total, districtFilter, listings, onlyFit, priceLimit, sort]);

  const selectedListings = useMemo(() => selectedIds
    .map((id) => listings.find((listing) => listing.id === id))
    .filter(Boolean) as Listing[], [listings, selectedIds]);
  useEffect(() => {
    if (!showComparison || selectedListings.length === 0) {
      setComparisonLoadTimedOut(false);
      return;
    }
    setComparisonLoadTimedOut(false);
    const timer = window.setTimeout(() => setComparisonLoadTimedOut(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [showComparison, selectedIds]);
  const comparisonAnchor = useMemo(() => selectedListings[0] ? { lat: selectedListings[0].lat, lng: selectedListings[0].lng } : { lat: 0, lng: 0 }, [selectedListings]);
  const kaptCandidates = useMemo(() => selectedListings.map((listing) => ({ id: listing.id, apartmentName: listing.name, lawdCd: listing.lawdCd ?? "", neighborhood: listing.neighborhood, jibun: listing.jibun, propertyType: listing.propertyType ?? "apartment" as const })), [selectedListings]);
  const { data: complexInfos, isLoading: complexInfoLoading } = trpc.realEstate.complexInfo.useQuery({ candidates: kaptCandidates }, {
    enabled: showComparison && kaptCandidates.length > 0 && kaptCandidates.every((candidate) => Boolean(candidate.lawdCd)),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  });
  const complexInfoById = useMemo(() => new Map((complexInfos ?? []).map((info) => [info.id, info])), [complexInfos]);
  const { data: nearbySignals, isLoading: nearbyLoading } = trpc.realEstate.nearbySignals.useQuery(comparisonAnchor, {
    enabled: showComparison && selectedListings.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });
  const comparisonPropertyType = propertyTypes.length === 1 && propertyTypes[0] === "villa" ? "villa" : "apartment";
  const { data: comparisonTrendSeries, isLoading: trendsLoading } = trpc.realEstate.trendSeries.useQuery({ region, propertyType: comparisonPropertyType }, {
    enabled: showComparison && selectedListings.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  const toggleCompare = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
      if (current.length >= 3) {
        toast("비교는 최대 3개까지 가능해요", { description: "기존 매물을 하나 빼고 새로운 매물을 추가해보세요." });
        return current;
      }
      return [...current, id];
    });
  };

  const togglePropertyType = (type: "apartment" | "villa") => {
    setPropertyTypes((current) => current.length === 1 && current[0] === type
      ? current
      : current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
    setSelectedIds([]);
  };

  return (
    <div className="app-shell noise">
      <header className="site-header">
        <a href="#top" className="brand" aria-label="예산에 맞는 집 홈">
          <span className="brand-mark"><HomeIcon size={17} strokeWidth={2.5} /></span>
          <span>예산에 맞는 집</span>
        </a>
        <nav className={`main-nav ${mobileNav ? "is-open" : ""}`}>
          <a href="#budget" onClick={() => setMobileNav(false)}>내 예산</a>
          <a href="#listings" onClick={() => setMobileNav(false)}>맞춤 매물</a>
          <a href="#compare" onClick={() => setMobileNav(false)}>비교 리포트</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="알림"><Bell size={17} /></button>
          <button className="profile-pill"><span className="profile-avatar">나</span><span className="profile-name">내 공간</span><ChevronDown size={14} /></button>
          <button className="mobile-menu" aria-label="메뉴 열기" onClick={() => setMobileNav((current) => !current)}><Menu size={19} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy animate-rise">
            <div className="eyebrow"><span className="eyebrow-dot" /> MY HOME / 01</div>
            <h1>내 예산으로,<br /><em>서울의 어디까지</em><br />갈 수 있을까?</h1>
            <p className="hero-description">대출 상환액과 보유 자금을 입력하면<br className="desktop-only" /> 지금 살펴볼 수 있는 아파트를 한눈에 보여드려요.</p>
            <div className="hero-trust-row">
              <span><ShieldCheck size={15} /> 내 정보는 브라우저에만 저장돼요</span>
              <span><Sparkles size={15} /> 국토부 실거래 LIVE</span>
            </div>
          </div>

          <div className="hero-aside animate-rise delay-1">
            <div className="hero-aside-label"><span>SEOUL HOME INDEX</span><span>2026.09</span></div>
            <div className="hero-aside-map">
              <div className="map-grid-lines" />
              <div className="map-river" />
              <div className="map-node node-1"><i /> 강북권</div>
              <div className="map-node node-2 active"><i /> 내 예산 반경</div>
              <div className="map-node node-3"><i /> 강남권</div>
              <div className="map-route route-1" />
              <div className="map-route route-2" />
              <span className="map-caption">신고 실거래 기준으로<br />예산 안의 단지를 살펴보세요</span>
            </div>
            <div className="hero-aside-foot"><span><span className="live-dot" /> LIVE PLANNING</span><span>+{filteredListings.length} MATCHES FOUND</span></div>
          </div>
        </section>

        <section className="budget-section container" id="budget">
          <div className="section-heading">
            <div>
              <span className="section-kicker">01 / BUDGET PLANNER</span>
              <h2>먼저, 집에 쓸 수 있는 돈을 계산해요.</h2>
            </div>
            <p>정확한 한도는 금융기관 심사에 따라 달라질 수 있어요.<br />여기서는 탐색을 위한 보수적인 가이드로 계산합니다.</p>
          </div>
          <div className="budget-layout">
            <div className="budget-form-panel">
              <div className="budget-form-header"><div><span className="mini-label">MY FINANCIAL SNAPSHOT</span><h3>나의 구매 조건</h3></div><WalletCards size={22} /></div>
              <div className="budget-fields-grid">
                <BudgetField label="보유 자금" value={savings} unit="만원" onChange={setSavings} />
                <BudgetField label="월 상환 가능액" value={monthly} unit="만원" onChange={setMonthly} />
                <BudgetField label="대출 기간" value={years} unit="년" onChange={setYears} min={5} step={5} />
                <BudgetField label="예상 금리" value={rate} unit="%" onChange={setRate} min={0} step={0.1} />
              </div>
              <div className="budget-slider-row">
                <div className="slider-label"><span>LTV 가정</span><strong>{ltv}%</strong></div>
                <input type="range" min={40} max={80} step={5} value={ltv} onChange={(event) => setLtv(Number(event.target.value))} aria-label="LTV 가정" />
                <div className="slider-meta"><span>보수적 40%</span><span>일반적 80%</span></div>
              </div>
              <div className="assumption-note"><Zap size={14} /><span>월 상환액을 기준으로 원리금균등상환, 금리 {rate}%를 가정했어요.</span></div>
            </div>
            <div className="budget-result-panel">
              <div className="result-topline"><span>탐색 예산 상한</span><span className="result-status"><span className="live-dot" /> CALCULATED</span></div>
              <div className="result-number">{formatPrice(budget.total)}</div>
              <p>내 자금 <strong>{formatPrice(savings)}</strong> + 예상 대출 <strong>{formatPrice(budget.loan)}</strong></p>
              <div className="result-progress"><div style={{ width: `${Math.min(100, (budget.total / Math.max(1, budget.ltvCapPrice)) * 100)}%` }} /></div>
              <div className="result-foot"><span>월 상환액 {formatNumber(monthly)}만원</span><span>LTV {ltv}% 반영</span></div>
              <a className="result-cta" href="#listings">이 예산으로 매물 보기 <ArrowRight size={16} /></a>
            </div>
          </div>
          <div className="metrics-row">
            <Metric label="내가 준비한 자금" value={formatPrice(savings)} detail="취득·이사비 미반영" />
            <Metric label="예상 대출 가능액" value={formatPrice(budget.loan)} detail={`금리 ${rate}% · ${years}년 가정`} />
            <Metric label="탐색 예산 상한" value={formatPrice(budget.total)} detail={`LTV ${ltv}% 가정 · 실제 심사와 다름`} />
            <div className="metrics-callout"><TrendingUp size={18} /><span>예산을 바꾸면<br /><strong>조회 결과도 바로 바뀌어요.</strong></span></div>
          </div>
        </section>

        <section className="listings-section container" id="listings">
          <div className="section-heading listings-heading">
            <div>
              <span className="section-kicker">02 / MATCHED LISTINGS</span>
              <h2>지금 예산으로 확인할 수 있는 실거래</h2>
              <p className="heading-sub"><span className="live-dot" /> {region === "seoul" ? "서울" : "경기"} 최근 실거래 기준 · 예산 {formatPrice(budget.total)} 안에서 <strong>{filteredListings.length}개 거래</strong>를 찾았어요.</p>
            </div>
          </div>

          <div className="filter-toolbar">
            <div className="filter-main"><SlidersHorizontal size={17} /><span>FILTER BY</span></div>
            <label className="select-control"><span>지역</span><select value={region} onChange={(event) => { setRegion(event.target.value as "seoul" | "gyeonggi"); setDistrictFilter("전체 구"); setSelectedIds([]); }}><option value="seoul">서울</option><option value="gyeonggi">경기</option></select><ChevronDown size={14} /></label>
            <div className="multi-select-control"><span>주택유형</span><label><input type="checkbox" checked={propertyTypes.includes("apartment")} onChange={() => togglePropertyType("apartment")} /> 아파트</label><label><input type="checkbox" checked={propertyTypes.includes("villa")} onChange={() => togglePropertyType("villa")} /> 빌라·다세대</label></div>
            <label className="select-control"><span>구·시</span><select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}><option>전체 구</option>{districtOptions.map((districtName) => <option key={districtName} value={districtName}>{districtName}</option>)}</select><ChevronDown size={14} /></label>
            <label className="select-control"><span>평형</span><select value={area} onChange={(event) => setArea(event.target.value)}><option>전체 평형</option><option value="10평대">10평대</option><option value="20평대">20평대</option><option value="30평대">30평대</option><option value="40평대">40평대</option><option value="50평대 이상">50평대 이상</option></select><ChevronDown size={14} /></label>
            <label className="select-control"><span>상승폭</span><select value={periodYears} onChange={(event) => setPeriodYears(Number(event.target.value) as 1 | 3 | 5 | 10)}><option value={1}>최근 1년</option><option value={3}>최근 3년</option><option value={5}>최근 5년</option><option value={10}>최근 10년</option></select><ChevronDown size={14} /></label>
            <label className="select-control price-select"><span>최대 가격</span><select value={priceLimit} onChange={(event) => setPriceLimit(Number(event.target.value))}><option value={60000}>6억</option><option value={70000}>7억</option><option value={80000}>8억</option><option value={100000}>10억</option><option value={200000}>20억</option></select><ChevronDown size={14} /></label>
            <button className={`fit-toggle ${onlyFit ? "is-on" : ""}`} onClick={() => setOnlyFit((current) => !current)}><span className="toggle-dot" /> 예산 안에만</button>
            <label className="sort-control"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option>낮은 가격순</option><option>높은 가격순</option><option>넓은 평형순</option></select><ChevronDown size={14} /></label>
          </div>

          <div className="data-source-banner is-live">
            <div className="data-source-copy"><CircleDollarSign size={17} /><div><strong>{tradesLoading ? "국토교통부 실거래를 불러오는 중이에요." : `${region === "seoul" ? "서울" : "경기"} ${propertyTypes.length === 2 ? "아파트·빌라·다세대" : propertyTypes[0] === "villa" ? "빌라·다세대" : "아파트"} 신고 거래 데이터`}</strong><span>{tradesError ? "데이터를 잠시 불러오지 못했어요. 잠시 후 다시 시도해 주세요." : tradeResponse?.sourceWarning ?? `최근 ${tradeMonths}개월 중 확인 가능한 거래 · 상승폭은 비교 리포트에서 확인할 수 있어요.`}</span></div></div>
            <span className="api-ready-pill"><BadgeCheck size={14} /> {tradesLoading ? "LOADING" : "LIVE DATA"}</span>
          </div>

          <MapPanel
            listings={filteredListings}
            budgetTotal={budget.total}
            selectedIds={selectedIds}
            onSelect={toggleCompare}
          />

          <div className="listings-content">
            <div className="listings-summary"><span><strong>{filteredListings.length}</strong> RESULTS</span><span className="summary-line" /><span>국토부 신고 매매 / {region === "seoul" ? "서울" : "경기"} / {formatPrice(Math.min(priceLimit, budget.total))} 이하</span></div>
            {tradesLoading ? (
              <div className="empty-state loading-state"><CircleDollarSign size={24} /><h3>실거래 데이터를 불러오는 중이에요.</h3><p>{region === "seoul" ? "서울 25개 구" : "경기 시·군·구"}의 최근 신고 내역을 확인하고 있어요.</p></div>
            ) : filteredListings.length > 0 ? (
              <div className="listing-grid">
                {filteredListings.map((listing, index) => <div className={`animate-rise delay-${Math.min(index + 1, 4)}`} key={listing.id}><ListingCard listing={listing} selected={selectedIds.includes(listing.id)} periodYears={periodYears} onSelect={() => toggleCompare(listing.id)} /></div>)}
              </div>
            ) : (
              <div className="empty-state"><Search size={24} /><h3>{tradesError || tradeResponse?.sourceWarning ? "실거래 데이터를 일부 불러오지 못했어요." : "조건에 맞는 실거래가 없어요."}</h3><p>{tradesError || tradeResponse?.sourceWarning ? (tradeResponse?.sourceWarning ?? "잠시 후 다시 시도해 주세요.") : "구·시나 최대 가격 필터를 조금 넓혀보세요."}</p><button onClick={() => { setDistrictFilter("전체 구"); setArea("전체 평형"); setOnlyFit(false); setPriceLimit(200000); }}>필터 초기화 <ArrowRight size={15} /></button></div>
            )}
          </div>
        </section>

        <section className="insight-section container" id="compare">
          <div className="insight-card">
            <div className="insight-icon"><Sparkles size={20} /></div>
            <div><span className="section-kicker">03 / COMPARE REPORT</span><h2>가격만 보지 말고,<br /><em>기록을 나란히 놓고 보세요.</em></h2><p>마음에 드는 실거래를 2~3개 담으면 전용면적·연식·계약일과 함께, 매칭되는 단지 정보와 주변 입지 신호를 한 장으로 정리해드려요. 출퇴근 시간이나 학군 평가처럼 공공 데이터로 확인할 수 없는 항목은 표시하지 않아요.</p></div>
            <div className="insight-stats"><div><strong>3개</strong><span>비교 가능 수</span></div><div><strong>계약일</strong><span>거래 시점 비교</span></div><div><strong>단지 정보</strong><span>K-apt 매칭 시</span></div></div>
          </div>
        </section>
      </main>

      <footer className="site-footer container"><div className="footer-brand"><span className="brand-mark"><HomeIcon size={15} /></span><span>예산에 맞는 집</span></div><span>국토교통부 신고 실거래 기반 탐색</span><span>신고 거래는 현재 판매 중인 매물과 다를 수 있어요.</span></footer>

      {selectedListings.length > 0 && !showComparison && (
        <div className="compare-tray" id="compare-tray">
          <div className="compare-tray-inner container"><div className="compare-tray-label"><div className="tray-icon"><Scale size={18} /></div><div><strong>{selectedListings.length}개 매물 담김</strong><span>비교하고 싶은 집을 골라보세요</span></div></div><div className="tray-list">{selectedListings.map((listing) => <button key={listing.id} className="tray-item" onClick={() => toggleCompare(listing.id)}><span>{listing.name}</span><X size={14} /></button>)}</div><button className="compare-submit" onClick={() => setShowComparison(true)}>비교 리포트 보기 <ArrowRight size={16} /></button></div>
        </div>
      )}

      {showComparison && (
        <div className="comparison-overlay" role="dialog" aria-modal="true" aria-label="매물 비교 리포트">
          <div className="comparison-dialog">
            <div className="comparison-dialog-head"><div><span className="section-kicker">COMPARE REPORT / 01</span><h2>내 예산 안에서,<br /><em>이 세 집을 비교했어요.</em></h2></div><button className="dialog-close" onClick={() => setShowComparison(false)} aria-label="비교 리포트 닫기"><X size={20} /></button></div>
            <div className="comparison-budget"><WalletCards size={16} /><span>내 탐색 예산</span><strong>{formatPrice(budget.total)}</strong><span className="comparison-budget-spacer" /><span>선택 {selectedListings.length}/3</span></div>
            <div className="comparison-grid">
              {selectedListings.map((listing) => <div className="comparison-column" key={listing.id}>
                <ListingVisual listing={listing} />
                <div className="comparison-title"><h3>{listing.name}</h3><p>{listing.district} · {listing.propertyType === "villa" ? "빌라" : "아파트"}</p></div>
                <div className="comparison-price"><span>최근 신고가</span><strong>{formatPrice(listing.price)}</strong><small className={listing.price <= budget.total ? "good" : "over"}>{listing.price <= budget.total ? `예산보다 ${formatPrice(budget.total - listing.price)} 여유` : `예산보다 ${formatPrice(listing.price - budget.total)} 초과`}</small></div>
                <div className="comparison-facts"><div><span>전용면적</span><b>{listing.area}㎡ · {listing.areaBucket}</b></div><div><span>연식</span><b>{listing.year > 0 ? `${listing.builtAge}년차` : "정보 없음"}</b></div><div><span>계약일</span><b>{listing.contract.replace("계약일 ", "")}</b></div><div><span>층</span><b>{listing.floor}</b></div></div>
                <div className="trend-report"><div className="comparison-subhead"><TrendingUp size={14} /> 기간별 상승폭 · 필터와 무관하게 전체 표시</div><div className="trend-report-grid">{([1, 3, 5, 10] as const).map((yearsAgo) => { const trend = comparisonTrendSeries?.[yearsAgo] ?? listing.trendPcts?.[yearsAgo]; return <div key={yearsAgo}><span>{yearsAgo}년</span><b className={(trend ?? 0) >= 0 ? "trend-up" : "trend-down"}>{trendsLoading && !comparisonLoadTimedOut ? "조회 중" : trend === undefined ? "데이터 없음" : `${trend >= 0 ? "+" : ""}${trend}%`}</b></div>; })}</div></div>
                <div className="complex-data-panel"><div className="comparison-subhead"><Building2 size={14} /> 단지·관리 정보 <span className="kapt-source-badge">단지 정보</span></div><div className="comparison-data-grid"><div><span>세대수</span><b>{complexInfoLoading && !comparisonLoadTimedOut ? "조회 중" : complexInfoById.get(listing.id)?.households ? `${complexInfoById.get(listing.id)!.households!.toLocaleString()}세대` : "매칭 정보 없음"}</b></div><div><span>동수 · 사용승인</span><b>{complexInfoLoading && !comparisonLoadTimedOut ? "조회 중" : `${complexInfoById.get(listing.id)?.buildingCount ? `${complexInfoById.get(listing.id)!.buildingCount}개동` : "동수 없음"} · ${complexInfoById.get(listing.id)?.approvalDate ?? "날짜 없음"}`}</b></div><div><span>총 주차대수</span><b>{complexInfoLoading && !comparisonLoadTimedOut ? "조회 중" : complexInfoById.get(listing.id)?.parkingTotal ? `${complexInfoById.get(listing.id)!.parkingTotal!.toLocaleString()}대` : "주차 정보 없음"}</b></div><div><span>세대당 주차</span><b>{complexInfoLoading && !comparisonLoadTimedOut ? "조회 중" : complexInfoById.get(listing.id)?.parkingPerHousehold ? `${complexInfoById.get(listing.id)!.parkingPerHousehold}대` : "계산 불가"}</b></div><div><span>용적률</span><b className={complexInfoById.get(listing.id)?.floorAreaRatio ? "" : "data-pending"}>{complexInfoLoading && !comparisonLoadTimedOut ? "조회 중" : complexInfoById.get(listing.id)?.floorAreaRatio ? `${complexInfoById.get(listing.id)!.floorAreaRatio}%` : "건축물대장 매칭 정보 없음"}</b></div><div><span>데이터 상태</span><b>{complexInfoById.get(listing.id)?.buildingDataStatusMessage ?? complexInfoById.get(listing.id)?.statusMessage ?? (comparisonLoadTimedOut ? "조회 시간 초과" : "단지 정보 조회 대기")}</b></div></div></div>
                <KaptSignalCards info={complexInfoById.get(listing.id)} loading={complexInfoLoading && !comparisonLoadTimedOut} />
              </div>)}
            </div>
            <div className="location-report"><div><span className="section-kicker">LOCATION SIGNALS / 01</span><h3>첫 번째 선택 매물 주변 입지</h3><p>지도 좌표 기준 반경 1.2km의 카카오 장소 데이터를 거리순으로 집계합니다.</p></div><div className="location-signal-grid">{nearbyLoading && !comparisonLoadTimedOut ? <span className="location-loading">상권·학군·교통 데이터를 불러오는 중이에요.</span> : nearbySignals?.map((signal) => <div className="location-signal" key={signal.category}><span>{signal.category}</span><strong>{signal.count}곳</strong><small>{signal.topPlaces.length ? signal.topPlaces.join(" · ") : "주요 장소 없음"}</small></div>) ?? <span className="location-loading">{comparisonLoadTimedOut ? "입지 데이터 조회 시간이 초과됐어요." : "주변 장소 데이터를 표시하려면 매물을 선택하세요."}</span>}</div></div>
            <div className="comparison-dialog-foot"><span><BadgeCheck size={16} /> 국토교통부 신고 실거래 기준 · 현재 매물 여부는 별도 확인</span><button onClick={() => setShowComparison(false)}>비교 닫기 <ArrowRight size={15} /></button></div>
          </div>
        </div>
      )}
    </div>
  );
}
