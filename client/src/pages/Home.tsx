import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Heart,
  Home as HomeIcon,
  LayoutGrid,
  MapPin,
  Menu,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrainFront,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

type Listing = {
  id: string;
  name: string;
  district: string;
  cluster: string;
  price: number;
  area: number;
  floor: string;
  year: number;
  station: string;
  commute: string;
  tags: string[];
  visual: string;
  accent: string;
  score: number;
  note: string;
};

const listings: Listing[] = [
  {
    id: "gwangjin",
    name: "광장힐스테이트",
    district: "광진구 광장동",
    cluster: "한강권",
    price: 79500,
    area: 59,
    floor: "10/18층",
    year: 2012,
    station: "광나루역 도보 8분",
    commute: "강남 24분",
    tags: ["한강생활권", "초품아"],
    visual: "from-[#97bbc8] via-[#dfe9e4] to-[#f5d9a8]",
    accent: "#d2f36b",
    score: 92,
    note: "예산 상단에 맞춘 한강권 실거주형",
  },
  {
    id: "susaek",
    name: "수색자이",
    district: "은평구 수색동",
    cluster: "서북권",
    price: 74200,
    area: 59,
    floor: "15/22층",
    year: 2020,
    station: "수색역 도보 6분",
    commute: "광화문 20분",
    tags: ["신축급", "역세권"],
    visual: "from-[#b2c8db] via-[#eef1e7] to-[#e2bc9d]",
    accent: "#a5e6d1",
    score: 89,
    note: "신축급 컨디션과 광화문 접근성",
  },
  {
    id: "gangdong",
    name: "강동리엔파크",
    district: "강동구 상일동",
    cluster: "동남권",
    price: 77800,
    area: 59,
    floor: "7/20층",
    year: 2019,
    station: "상일동역 도보 9분",
    commute: "잠실 18분",
    tags: ["대단지", "공원인접"],
    visual: "from-[#b8d5cb] via-[#f4e6c5] to-[#c3a889]",
    accent: "#f2ca78",
    score: 87,
    note: "잠실 생활권을 누리는 대단지",
  },
  {
    id: "guro",
    name: "구로두산위브",
    district: "구로구 구로동",
    cluster: "서남권",
    price: 68800,
    area: 59,
    floor: "8/15층",
    year: 2006,
    station: "구로역 도보 10분",
    commute: "여의도 22분",
    tags: ["직주근접", "가격메리트"],
    visual: "from-[#c2d8e0] via-[#f3ebd3] to-[#d5ae92]",
    accent: "#bfdcff",
    score: 85,
    note: "여의도 출퇴근과 가격 균형형",
  },
  {
    id: "sinnae",
    name: "신내데시앙",
    district: "중랑구 신내동",
    cluster: "북부권",
    price: 64900,
    area: 59,
    floor: "12/18층",
    year: 2013,
    station: "신내역 도보 7분",
    commute: "종로 29분",
    tags: ["숲세권", "맞춤예산"],
    visual: "from-[#a4c2ae] via-[#e8edda] to-[#d0b78d]",
    accent: "#e2ed9e",
    score: 84,
    note: "여유 자금까지 남기는 안정형",
  },
  {
    id: "gaebong",
    name: "개봉한진타운",
    district: "구로구 개봉동",
    cluster: "서남권",
    price: 60300,
    area: 49,
    floor: "5/15층",
    year: 2001,
    station: "개봉역 도보 5분",
    commute: "용산 17분",
    tags: ["초역세권", "리모델링"],
    visual: "from-[#b5d0df] via-[#f0e1d0] to-[#c89373]",
    accent: "#ffd08c",
    score: 82,
    note: "용산 접근성과 낮은 진입가격",
  },
  {
    id: "sanggye",
    name: "상계주공 5단지",
    district: "노원구 상계동",
    cluster: "북부권",
    price: 57800,
    area: 49,
    floor: "4/15층",
    year: 1988,
    station: "노원역 도보 8분",
    commute: "종로 31분",
    tags: ["대단지", "정비기대"],
    visual: "from-[#c5d9cf] via-[#eee6cf] to-[#c9a27d]",
    accent: "#c3f0bd",
    score: 78,
    note: "정비사업 기대감이 있는 진입형",
  },
  {
    id: "banpo",
    name: "반포래미안퍼스티지",
    district: "서초구 반포동",
    cluster: "강남권",
    price: 198000,
    area: 59,
    floor: "11/28층",
    year: 2009,
    station: "고속터미널역 도보 5분",
    commute: "강남 9분",
    tags: ["상급지", "학군"],
    visual: "from-[#b6becb] via-[#e6ddd4] to-[#c69d80]",
    accent: "#f2b26e",
    score: 96,
    note: "비교 기준점으로 함께 확인해보세요",
  },
];

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
        <span>SEOUL / {listing.cluster.toUpperCase()}</span>
        <strong>{listing.area}㎡</strong>
      </div>
      <div className="visual-stamp">{listing.score} MATCH</div>
    </div>
  );
}

function ListingCard({
  listing,
  selected,
  onSelect,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
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
          <span>{listing.note}</span>
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
          <div className="listing-score">
            <Star size={13} fill="currentColor" /> {listing.score}
          </div>
        </div>
        <div className="listing-stats">
          <span>{listing.area}㎡ · {listing.floor}</span>
          <span>{listing.year}년식</span>
        </div>
        <div className="listing-route">
          <TrainFront size={14} />
          <span>{listing.station}</span>
          <b>{listing.commute}</b>
        </div>
        <div className="tag-row">
          {listing.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [savings, setSavings] = useState(24000);
  const [monthly, setMonthly] = useState(380);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(4.2);
  const [ltv, setLtv] = useState(70);
  const [cluster, setCluster] = useState("전체 생활권");
  const [area, setArea] = useState("전체 평형");
  const [sort, setSort] = useState("추천순");
  const [priceLimit, setPriceLimit] = useState(80000);
  const [onlyFit, setOnlyFit] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

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

  const filteredListings = useMemo(() => {
    const next = listings.filter((listing) => {
      const fitsCluster = cluster === "전체 생활권" || listing.cluster === cluster;
      const fitsArea = area === "전체 평형" || listing.area === Number(area);
      const fitsBudget = !onlyFit || listing.price <= budget.total;
      const fitsPrice = listing.price <= priceLimit;
      return fitsCluster && fitsArea && fitsBudget && fitsPrice;
    });
    return [...next].sort((a, b) => {
      if (sort === "낮은 가격순") return a.price - b.price;
      if (sort === "넓은 평형순") return b.area - a.area || b.score - a.score;
      return b.score - a.score;
    });
  }, [cluster, area, budget.total, onlyFit, priceLimit, sort]);

  const selectedListings = selectedIds
    .map((id) => listings.find((listing) => listing.id === id))
    .filter(Boolean) as Listing[];

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
              <span><Sparkles size={15} /> 8개 샘플 매물로 시작</span>
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
              <span className="map-caption">실거주 · 출퇴근 · 가격을<br />동시에 맞추는 탐색</span>
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
              <div className="result-topline"><span>추천 탐색 상한</span><span className="result-status"><span className="live-dot" /> CALCULATED</span></div>
              <div className="result-number">{formatPrice(budget.total)}</div>
              <p>내 자금 <strong>{formatPrice(savings)}</strong> + 예상 대출 <strong>{formatPrice(budget.loan)}</strong></p>
              <div className="result-progress"><div style={{ width: `${Math.min(100, (budget.total / Math.max(1, budget.ltvCapPrice)) * 100)}%` }} /></div>
              <div className="result-foot"><span>월 상환액 {formatNumber(monthly)}만원</span><span>LTV {ltv}% 반영</span></div>
              <a className="result-cta" href="#listings">이 예산으로 매물 보기 <ArrowRight size={16} /></a>
            </div>
          </div>
          <div className="metrics-row">
            <Metric label="내가 준비한 자금" value={formatPrice(savings)} detail="취득·이사비 별도" />
            <Metric label="예상 대출 가능액" value={formatPrice(budget.loan)} detail={`금리 ${rate}% · ${years}년`} />
            <Metric label="안전 여유자금" value={formatPrice(Math.max(0, savings - 5000))} detail="비상금 5,000만원 제외" />
            <div className="metrics-callout"><TrendingUp size={18} /><span>예산을 바꾸면<br /><strong>추천 매물도 바로 바뀌어요.</strong></span></div>
          </div>
        </section>

        <section className="listings-section container" id="listings">
          <div className="section-heading listings-heading">
            <div>
              <span className="section-kicker">02 / MATCHED LISTINGS</span>
              <h2>지금 예산으로 볼 수 있는 집</h2>
              <p className="heading-sub"><span className="live-dot" /> 예산 {formatPrice(budget.total)} 안에서 <strong>{filteredListings.length}개 매물</strong>을 찾았어요.</p>
            </div>
            <button className="save-search-button" onClick={() => toast("검색 조건을 저장했어요", { description: "새로운 매물이 들어오면 이 조건으로 다시 찾아볼게요." })}><Bell size={15} /> 이 조건 저장</button>
          </div>

          <div className="filter-toolbar">
            <div className="filter-main"><SlidersHorizontal size={17} /><span>FILTER BY</span></div>
            <label className="select-control"><span>생활권</span><select value={cluster} onChange={(event) => setCluster(event.target.value)}><option>전체 생활권</option><option>한강권</option><option>강남권</option><option>동남권</option><option>서남권</option><option>서북권</option><option>북부권</option></select><ChevronDown size={14} /></label>
            <label className="select-control"><span>평형</span><select value={area} onChange={(event) => setArea(event.target.value)}><option>전체 평형</option><option value="49">49㎡대</option><option value="59">59㎡대</option></select><ChevronDown size={14} /></label>
            <label className="select-control price-select"><span>최대 가격</span><select value={priceLimit} onChange={(event) => setPriceLimit(Number(event.target.value))}><option value={60000}>6억</option><option value={70000}>7억</option><option value={80000}>8억</option><option value={100000}>10억</option><option value={200000}>20억</option></select><ChevronDown size={14} /></label>
            <button className={`fit-toggle ${onlyFit ? "is-on" : ""}`} onClick={() => setOnlyFit((current) => !current)}><span className="toggle-dot" /> 예산 안에만</button>
            <label className="sort-control"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option>추천순</option><option>낮은 가격순</option><option>넓은 평형순</option></select><ChevronDown size={14} /></label>
          </div>

          <div className="listings-content">
            <div className="listings-summary"><span><strong>{filteredListings.length}</strong> RESULTS</span><span className="summary-line" /><span>매매 / 서울 / {formatPrice(Math.min(priceLimit, budget.total))} 이하</span></div>
            {filteredListings.length > 0 ? (
              <div className="listing-grid">
                {filteredListings.map((listing, index) => <div className={`animate-rise delay-${Math.min(index + 1, 4)}`} key={listing.id}><ListingCard listing={listing} selected={selectedIds.includes(listing.id)} onSelect={() => toggleCompare(listing.id)} /></div>)}
              </div>
            ) : (
              <div className="empty-state"><Search size={24} /><h3>조건에 맞는 매물이 없어요.</h3><p>생활권이나 최대 가격 필터를 조금 넓혀보세요.</p><button onClick={() => { setCluster("전체 생활권"); setArea("전체 평형"); setOnlyFit(false); setPriceLimit(100000); }}>필터 초기화 <ArrowRight size={15} /></button></div>
            )}
          </div>
        </section>

        <section className="insight-section container" id="compare">
          <div className="insight-card">
            <div className="insight-icon"><Sparkles size={20} /></div>
            <div><span className="section-kicker">03 / DECISION NOTE</span><h2>가격만 보지 말고,<br /><em>매일의 시간을 비교하세요.</em></h2><p>광화문·강남·여의도까지의 출퇴근 시간과 생활권을 함께 표시해 두었어요. 마음에 드는 매물을 2~3개 담으면 한 장의 비교 리포트로 정리해드려요.</p></div>
            <div className="insight-stats"><div><strong>24분</strong><span>평균 출퇴근</span></div><div><strong>59㎡</strong><span>가장 많은 평형</span></div><div><strong>3개</strong><span>비교 가능 수</span></div></div>
          </div>
        </section>
      </main>

      <footer className="site-footer container"><div className="footer-brand"><span className="brand-mark"><HomeIcon size={15} /></span><span>예산에 맞는 집</span></div><span>서울 아파트 탐색을 위한 개인용 프로토타입</span><span>실제 매물·대출 조건과 다를 수 있어요.</span></footer>

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
              {selectedListings.map((listing) => <div className="comparison-column" key={listing.id}><ListingVisual listing={listing} /><div className="comparison-title"><h3>{listing.name}</h3><p>{listing.district}</p></div><div className="comparison-price"><span>매매가</span><strong>{formatPrice(listing.price)}</strong><small className={listing.price <= budget.total ? "good" : "over"}>{listing.price <= budget.total ? `예산보다 ${formatPrice(budget.total - listing.price)} 여유` : `예산보다 ${formatPrice(listing.price - budget.total)} 초과`}</small></div><div className="comparison-facts"><div><span>전용면적</span><b>{listing.area}㎡</b></div><div><span>입주연도</span><b>{listing.year}년</b></div><div><span>역까지</span><b>{listing.station.split(" 도보")[0]}</b></div><div><span>추천점수</span><b className="score-text"><Star size={12} fill="currentColor" /> {listing.score}</b></div></div><div className="comparison-tags">{listing.tags.map((tag) => <span key={tag}><Check size={12} /> {tag}</span>)}</div></div>)}
            </div>
            <div className="comparison-dialog-foot"><span><BadgeCheck size={16} /> 매물 정보는 탐색용 샘플 데이터입니다.</span><button onClick={() => { setShowComparison(false); toast("비교 결과를 저장했어요", { description: "다음에 다시 이 화면에서 이어서 볼 수 있어요." }); }}>비교 결과 저장 <ArrowRight size={15} /></button></div>
          </div>
        </div>
      )}
    </div>
  );
}
