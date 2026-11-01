
import TickMap from './components/TickMap';


import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import {
  Activity, AlertTriangle, BarChart3, Download,
  FileText, Home, Info, Leaf, MapPin, Menu,
  Plus, RefreshCw, Search, ShieldCheck, X
} from 'lucide-react'
import './App.css'

type Report = {
  id: string
  date: string
  location: string
  species: string
  latinName?: string | null
  source?: string
  created_at?: string
}

type Region = {
  region: string
  count: number
}

type Trend = {
  period?: string
  month?: string
  week?: string
  count: number
}

type Page =
  | 'Dashboard'
  | 'Tick Sightings'
  | 'Report Sighting'
  | 'Insights & Trends'
  | 'Data Export'
  | 'About & Help'
  | 'Tick Identification'
  | 'Bite Prevention'

const API = '/api'

const navigation = [
  { name: 'Dashboard', icon: Home },
  { name: 'Tick Sightings', icon: MapPin },
  { name: 'Report Sighting', icon: Plus },
  { name: 'Insights & Trends', icon: BarChart3 },
  { name: 'Data Export', icon: Download },
  { name: 'Tick Identification', icon: Search },
  { name: 'Bite Prevention', icon: ShieldCheck },
  { name: 'About & Help', icon: Info }
] as const

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Species information is aligned with UKHSA's official UK tick species profiles.
// All More links lead to the official UKHSA species profile catalogue.
const SPECIES_PROFILES: Record<string, { name: string; detail: string; note: string }> = {
  'ixodes ricinus': { name: 'Sheep / Deer Tick', detail: 'The most widespread tick in the UK, found in woodland, heathland and grassland. It feeds on many hosts, including humans.', note: 'A key vector of Lyme disease pathogens in the UK.' },
  'ixodes hexagonus': { name: 'Hedgehog Tick', detail: 'Commonly associated with hedgehogs and their nests; it may also feed on cats, dogs and occasionally humans.', note: 'Often difficult to distinguish from related Ixodes ticks without expert examination.' },
  'ixodes canisuga': { name: 'Fox / Badger Tick', detail: 'Widespread in the UK and commonly associated with badgers, foxes and domestic dogs.', note: 'The official UKHSA profile calls this the fox/badger tick.' },
  'dermacentor reticulatus': { name: 'Ornate Cow Tick', detail: 'Adults have a characteristically patterned dorsal shield. UK populations are more localised, including parts of Wales and south-west England.', note: 'The ornate shield helps distinguish adult ticks.' },
  'ixodes frontalis': { name: 'Passerine Tick', detail: 'A tick associated especially with passerine birds, which can acquire it while feeding near the ground.', note: 'Occasional human feeding has been recorded.' },
  'haemaphysalis punctata': { name: 'Red Sheep Tick', detail: 'Found mainly in south-east England and parts of south Wales. Often associated with sheep; immature ticks can feed on birds.', note: 'Can occasionally feed on humans.' },
  'rhipicephalus sanguineus': { name: 'Brown Dog Tick', detail: 'A dog-associated tick capable of surviving and reproducing indoors. UK reports are associated with importation.', note: 'UKHSA does not consider it established in the UK.' },
  'ixodes acuminatus': { name: 'Southern Rodent Tick', detail: 'Associated with the burrows of small rodents, with UK records mainly from southern England.', note: 'A specialist wildlife tick.' },
  'ixodes apronophorus': { name: 'Marsh Tick', detail: 'Associated with wetland habitats and water voles.', note: 'Reported from a limited number of UK wetland sites.' },
  'ixodes arboricola': { name: 'Tree-hole Tick', detail: 'Associated with birds nesting in tree holes, including tits.', note: 'A specialist bird tick.' },
  'ixodes caledonicus': { name: 'Northern Bird Tick', detail: 'Associated with cliff- and building-nesting birds, including pigeons and corvids.', note: 'UK records are concentrated in northern England and Scotland.' },
  'ixodes lividus': { name: 'Sand Martin Tick', detail: 'Lives in sand martin colonies and can remain in nesting sites over winter.', note: 'A specialist bird tick.' },
  'ixodes rothschildi': { name: 'Puffin Tick', detail: 'Associated with burrow-nesting coastal birds, especially puffins.', note: 'Recorded at a limited number of UK coastal sites.' },
  'ixodes trianguliceps': { name: 'Shrew Tick', detail: 'Associated with small burrowing mammals and their nests.', note: 'Widely distributed in the UK.' },
  'ixodes unicavatus': { name: 'Cormorant Tick', detail: 'Associated with cormorants and shags.', note: 'A specialist seabird tick.' },
  'ixodes uriae': { name: 'Seabird Tick', detail: 'Associated with seabirds around the UK coastline.', note: 'Occasionally recorded feeding on humans.' },
  'ixodes ventalloi': { name: 'Rabbit Tick', detail: 'An uncommon UK tick associated with rabbits and some of their predators.', note: 'Occasional human feeding has been recorded.' },
  'ixodes vespertilionis': { name: 'Long-legged Bat Tick', detail: 'A bat-associated tick recognised by its unusually long legs.', note: 'Associated particularly with horseshoe bats.' },
  'argas reflexus': { name: 'Pigeon Tick', detail: 'A soft tick associated with long-established pigeon populations.', note: 'Uncommon in UK surveillance records.' },
  'argas vespertilionis': { name: 'Bat Soft Tick', detail: 'A soft tick parasitising bats.', note: 'Identification should be confirmed by a specialist.' },
  'carios maritimus': { name: 'Marine Soft Tick', detail: 'Associated with seabirds, with UK records from offshore islands.', note: 'A specialist seabird tick.' },
  'hyalomma marginatum': { name: 'Hyalomma Tick', detail: 'An imported tick sometimes carried into the UK on migratory birds.', note: 'UKHSA reports no evidence of established UK populations.' }
}
const OFFICIAL_TICK_PROFILES = 'https://www.gov.uk/guidance/tick-species-profiles'
const SPECIES_ALIASES: Record<string, string> = {
  'castor bean tick': 'ixodes ricinus', 'sheep tick': 'ixodes ricinus', 'deer tick': 'ixodes ricinus',
  'hedgehog tick': 'ixodes hexagonus', 'dog tick': 'ixodes canisuga',
  'fox tick': 'ixodes canisuga', 'badger tick': 'ixodes canisuga', 'fox/badger tick': 'ixodes canisuga',
  'ornate cow tick': 'dermacentor reticulatus', 'passerine tick': 'ixodes frontalis',
  'red sheep tick': 'haemaphysalis punctata', 'brown dog tick': 'rhipicephalus sanguineus',
  'marsh tick': 'ixodes apronophorus', 'southern rodent tick': 'ixodes acuminatus',
  'tree-hole tick': 'ixodes arboricola'
}

function App() {
  const [page, setPage] = useState<Page>('Dashboard')
  const [reports, setReports] = useState<Report[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [trends, setTrends] = useState<Trend[]>([])
  const [total, setTotal] = useState(0)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seasonLocation, setSeasonLocation] = useState('')
  const [seasonSpecies, setSeasonSpecies] = useState('')
  const [period, setPeriod] = useState<'month' | 'week'>('month')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({
  species: '',
  fromDate: '',
  toDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 20;
  const [mapSpeciesFilter, setMapSpeciesFilter] = useState('')
  const [mapStartDate, setMapStartDate] = useState('')
  const [mapEndDate, setMapEndDate] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    location: '',
    species: '',
    latinName: ''
  })

  // Fetch real data from FastAPI
  
async function loadData() {
  setLoading(true)
  setError('')

  try {
    const allReports: Report[] = []
    const limit = 100
    let skip = 0
    let expectedTotal = 0

    // Load every page of the combined Elanco + user reports.
    do {
      const response = await fetch(
        `${API}/sightings/combined?skip=${skip}&limit=${limit}`
      )

      if (!response.ok) {
        throw new Error(
          `Failed to load sightings (HTTP ${response.status}).`
        )
      }

      const result = await response.json()
      const batch: Report[] = Array.isArray(result.data)
        ? result.data
        : []

      expectedTotal = Number(result.total) || 0
      allReports.push(...batch)
      skip += batch.length

      if (batch.length === 0) break
    } while (skip < expectedTotal)

    // Calculate region counts using the combined dataset.
    const regionCounts = new Map<string, number>()

    for (const report of allReports) {
      const location = report.location.trim()

      if (!location) continue

      regionCounts.set(
        location,
        (regionCounts.get(location) || 0) + 1
      )
    }

    const combinedRegions: Region[] = Array.from(
      regionCounts,
      ([region, count]) => ({ region, count })
    )

    // Calculate weekly or monthly trends from combined data.
    const trendCounts = new Map<string, number>()

    for (const report of allReports) {
      const date = new Date(report.date)

      if (Number.isNaN(date.getTime())) continue

      let key: string

      if (period === 'month') {
        key = date.toISOString().slice(0, 7)
      } else {
        // ISO week: Monday is the first day of the week.
        const utcDate = new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
          )
        )

        const day = utcDate.getUTCDay() || 7
        utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)

        const year = utcDate.getUTCFullYear()
        const yearStart = new Date(Date.UTC(year, 0, 1))
        const week = Math.ceil(
          ((utcDate.getTime() - yearStart.getTime()) /
            86400000 + 1) / 7
        )

        key = `${year}-W${String(week).padStart(2, '0')}`
      }

      trendCounts.set(key, (trendCounts.get(key) || 0) + 1)
    }

    const combinedTrends: Trend[] = Array.from(
      trendCounts,
      ([period, count]) => ({ period, count })
    ).sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    )

    setReports(allReports)
    setRegions(combinedRegions)
    setTrends(combinedTrends)
    setTotal(expectedTotal)
    setConnected(true)

  } catch (err) {
    setConnected(false)
    setError(
      err instanceof Error
        ? err.message
        : 'Backend connection failed.'
    )
  } finally {
    setLoading(false)
  }
}


  useEffect(() => {
    void loadData()
  }, [period])

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => b.count - a.count),
    [regions]
  )

  const chartData = useMemo(
    () => trends.map((item, index) => ({
      label: String(
        item.period ?? item.month ?? item.week ?? index + 1
      ),
      count: Number(item.count) || 0
    })),
    [trends]
  )

  
const availableLocations = useMemo(
  () => [...new Set(reports.map(report => report.location))]
    .sort((a, b) => a.localeCompare(b)),
  [reports]
)

const availableSpecies = useMemo(
  () => [...new Set(reports.map(report => report.species))]
    .sort((a, b) => a.localeCompare(b)),
  [reports]
)

const seasonalData = useMemo(() => {
  const counts = Array.from({ length: 12 }, (_, index) => ({
    month: new Date(Date.UTC(2024, index, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
    count: 0
  }))
  let matched = 0
  for (const report of reports) {
    if (seasonLocation && report.location !== seasonLocation) continue
    if (seasonSpecies && report.species !== seasonSpecies) continue
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(report.date)
    if (!match) continue
    const month = Number(match[2]) - 1
    if (month < 0 || month > 11 || Number(match[3]) < 1 || Number(match[3]) > 31) continue
    counts[month].count += 1
    matched += 1
  }
  return { counts, matched }
}, [reports, seasonLocation, seasonSpecies])

  // Preserve every distinct dataset label, even when two labels refer to the same species.
  const identifiedSpecies = useMemo(() => {
    const byLabel = new Map<string, { key: string; name: string; latin: string; detail: string; note: string; url: string }>()
    for (const report of reports) {
      const raw = report.species.trim()
      if (!raw) continue
      const rawKey = raw.toLowerCase()
      const scientific = (report.latinName ?? '').trim()
      const scientificKey = scientific.toLowerCase()
      const profileKey = SPECIES_PROFILES[rawKey]
        ? rawKey
        : (SPECIES_ALIASES[rawKey] ?? (SPECIES_PROFILES[scientificKey] ? scientificKey : ''))
      const profile = SPECIES_PROFILES[profileKey]
      if (!byLabel.has(rawKey)) {
        const isCastorAlias = rawKey === 'castor bean tick' || rawKey === 'ixodes ricinus'
        byLabel.set(rawKey, {
          key: rawKey,
          name: raw,
          latin: profileKey || scientific,
          detail: profile?.detail ?? 'This label appears in the sightings data, but its identification details have not been verified.',
          note: isCastorAlias
            ? 'Castor bean tick and Ixodes ricinus are two labels for the same biological species.'
            : (profile?.note ?? 'Consult the official tick profiles for identification guidance.'),
          url: OFFICIAL_TICK_PROFILES
        })
      }
    }
    return [...byLabel.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [reports])

const filteredReports = useMemo(() => {
  return reports.filter(report => {
    const matchesSearch =
      `${report.location} ${report.species} ${report.latinName ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())

    const matchesLocation =
      !locationFilter || report.location === locationFilter

    const matchesSpecies =
      !speciesFilter || report.species === speciesFilter

    const matchesSource =
      !sourceFilter || report.source === sourceFilter

    const reportDate = report.date.slice(0, 10)

    const matchesStartDate =
      !startDateFilter || reportDate >= startDateFilter

    const matchesEndDate =
      !endDateFilter || reportDate <= endDateFilter

    return (
      matchesSearch &&
      matchesLocation &&
      matchesSpecies &&
      matchesSource &&
      matchesStartDate &&
      matchesEndDate
    )
  })
}, [
  reports,
  search,
  locationFilter,
  speciesFilter,
  sourceFilter,
  startDateFilter,
  endDateFilter
])


const totalPages = Math.max(1, Math.ceil(filteredReports.length / reportsPerPage));

const paginatedReports = filteredReports.slice(
  (currentPage - 1) * reportsPerPage,
  currentPage * reportsPerPage
);

useEffect(() => {
  setCurrentPage(1);
}, [search, locationFilter, speciesFilter, sourceFilter, startDateFilter, endDateFilter]);

useEffect(() => {
  setCurrentPage(page => Math.min(page, totalPages));
}, [totalPages]);

const mapFilteredReports = useMemo(() => {
  return reports.filter((report) => {
    const reportDate = report.date.slice(0, 10);

    const matchesSpecies =
      !appliedFilters.species ||
      report.species === appliedFilters.species;

    const matchesStartDate =
      !appliedFilters.fromDate ||
      reportDate >= appliedFilters.fromDate;

    const matchesEndDate =
      !appliedFilters.toDate ||
      reportDate <= appliedFilters.toDate;

    return (
      matchesSpecies &&
      matchesStartDate &&
      matchesEndDate
    );
  });
}, [reports, appliedFilters]);


function clearFilters() {
  setSearch('')
  setLocationFilter('')
  setSpeciesFilter('')
  setSourceFilter('')
  setStartDateFilter('')
  setEndDateFilter('')
}


  const speciesCount = new Set(
    reports.map(report => report.species.toLowerCase())
  ).size

  function navigate(next: Page) {
    setPage(next)
    setMenuOpen(false)
    setError('')
  }

  // Submit a new sighting to FastAPI
  async function submitReport(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()
  setSaving(true)
  setError('')

  try {
    const now = new Date()

    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')

    const reportDate =
      form.date === today
        ? now.toISOString()
        : `${form.date}T00:00:00.000Z`

    const response = await fetch(`${API}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: reportDate,
        location: form.location.trim(),
        species: form.species.trim(),
        latinName: form.latinName.trim()
      })
    })

    if (!response.ok) {
      throw new Error(
        `Unable to save report (HTTP ${response.status}).`
      )
    }

    setForm({
      date: today,
      location: '',
      species: '',
      latinName: ''
    })

    navigate('Tick Sightings')
    await loadData()

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Report submission failed.'
    )
  } finally {
    setSaving(false)
  }
}

  // Export loaded sightings to CSV
  function exportCSV() {
    const rows = [
      ['ID', 'Date', 'Location', 'Species', 'Latin Name'],
      ...filteredReports.map(report => [
        report.id,
        report.date,
        report.location,
        report.species,
        report.latinName ?? ''
      ])
    ]

    const csv = rows
      .map(row =>
        row.map(value =>
          `"${String(value).replaceAll('"', '""')}"`
        ).join(',')
      )
      .join('\r\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'tick-sightings.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="shell">

      {/* Sidebar navigation */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>

        <div className="brand">
          <div className="brand-icon">
            <Leaf size={28} />
          </div>

          <div>
            <div className="brand-company">Elanco</div>
            <strong>Tick Tracker</strong>
            <small>UK Tick Surveillance Platform</small>
          </div>
        </div>

        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-link ${
                page === name ? 'active' : ''
              }`}
              onClick={() => navigate(name)}
            >
              <Icon size={20} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="nature-art">
            <span>
              Protecting wildlife
              <br />
              through better data.
            </span>
          </div>

          <div className={`api-badge ${
            connected ? 'online' : 'offline'
          }`}>
            <span className="status-dot" />
            {connected ? 'API Connected' : 'API Disconnected'}
          </div>
        </div>

      </aside>

      {menuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main dashboard */}
      <main className="main">

        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </button>

          <div>
            <h1>{page}</h1>
            <p>
              {page === 'Dashboard'
                ? 'Overview of tick sightings across the United Kingdom'
                : 'UK Tick Surveillance Platform'}
            </p>
          </div>

        </header>

        <div className="content">

          {error && (
            <div className="error-banner">
              <AlertTriangle size={19} />
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Dashboard page */}
          {page === 'Dashboard' && (
            <>
              <div className="section-head">
                <div>
                  <h2>Surveillance Overview</h2>
                  <p>Live data from the sightings database</p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => void loadData()}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              <div className="stats-grid">
                <Stat
                  icon={Activity}
                  label="Total Sightings"
                  value={total.toLocaleString()}
                  tone="green"
                  detail="Recorded reports"
                />

                <Stat
                  icon={MapPin}
                  label="Affected Regions"
                  value={String(regions.length)}
                  tone="blue"
                  detail="Locations with reports"
                />

                <Stat
                  icon={Leaf}
                  label="Tick Species"
                  value={String(speciesCount)}
                  tone="amber"
                  detail="Within loaded reports"
                />

                <Stat
                  icon={ShieldCheck}
                  label="API Status"
                  value={connected ? 'Online' : 'Offline'}
                  tone="red"
                  detail={
                    connected
                      ? 'Backend responding'
                      : 'Check FastAPI server'
                  }
                />
              </div>

              <div className="dashboard-grid">

                

{/* Regional map */}
<section className="panel map-panel">
  <div className="panel-heading">
    <h3>Tick Sightings by Region</h3>
    <MapPin size={19} />
  </div>

  <div
    className="sighting-filters"
    style={{ marginBottom: '16px' }}
  >
    <label>
      Species
      <select
        value={mapSpeciesFilter}
        onChange={event => setMapSpeciesFilter(event.target.value)}
      >
        <option value="">All species</option>
        {availableSpecies.map(species => (
          <option key={species} value={species}>
            {species}
          </option>
        ))}
      </select>
    </label>

    <label>
      From Date
      <input
        type="date"
        value={mapStartDate}
        max={mapEndDate || undefined}
        onChange={event => setMapStartDate(event.target.value)}
      />
    </label>

    <label>
      To Date
      <input
        type="date"
        value={mapEndDate}
        min={mapStartDate || undefined}
        onChange={event => setMapEndDate(event.target.value)}
      />
    </label>

    <button
      type="button"
      className="secondary-button"
      onClick={() => {
  setMapSpeciesFilter('')
  setMapStartDate('')
  setMapEndDate('')
  setAppliedFilters({
    species: '',
    fromDate: '',
    toDate: '',
  })
}}
    >
      <X size={16} />
      Clear
    </button>
    <button
  type="button"
  className="apply-filters-btn"
  onClick={() => {
    setAppliedFilters({
      species: mapSpeciesFilter,
      fromDate: mapStartDate,
      toDate: mapEndDate,
    });
  }}
>
  Apply Filters
</button>
  </div>

  <p className="muted-note">
    Showing {mapFilteredReports.length} of {reports.length} sightings
  </p>

  <div className="map-placeholder">
    <TickMap
      reports={mapFilteredReports.map(report => ({
        ...report,
        source:
          report.source === 'elanco' || report.source === 'user'
            ? report.source
            : undefined
      }))}
    />
  </div>

  <div className="region-overlay">
    {sortedRegions.slice(0, 5).map(region => (
      <div key={region.region}>
        <span>{region.region}</span>
        <b>{region.count}</b>
      </div>
    ))}

    {sortedRegions.length === 0 && (
      <p>No regional sightings yet</p>
    )}
  </div>
</section>


                {/* Trends chart */}
                <section className="panel trend-panel">
                  <div className="panel-heading">
                    <h3>Sighting Trends</h3>

                    <select
                      value={period}
                      onChange={event =>
                        setPeriod(
                          event.target.value as 'month' | 'week'
                        )
                      }
                    >
                      <option value="month">Monthly</option>
                      <option value="week">Weekly</option>
                    </select>
                  </div>

                  <div className="chart-area">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <AreaChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 4"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                          />

                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11 }}
                          />

                          <Tooltip />

                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#09883f"
                            strokeWidth={3}
                            fill="#b9ebca"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty text="No trend data available" />
                    )}
                  </div>
                </section>

                {/* Top regions */}
                <section className="panel top-panel">
                  <div className="panel-heading">
                    <h3>Top Regions</h3>
                    <BarChart3 size={19} />
                  </div>

                  <div className="region-bars">
                    {sortedRegions.slice(0, 5).map((region, index) => (
                      <div
                        className="region-row"
                        key={region.region}
                      >
                        <span className="rank">{index + 1}</span>
                        <span className="region-name">
                          {region.region}
                        </span>

                        <div className="bar-track">
                          <div
                            style={{
                              width: `${
                                sortedRegions[0]?.count
                                  ? region.count /
                                    sortedRegions[0].count * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>

                        <b>{region.count}</b>
                      </div>
                    ))}

                    {!sortedRegions.length && (
                      <Empty text="No region data yet" />
                    )}
                  </div>
                </section>

                {/* Quick actions */}
                <section className="panel action-panel">
                  <div className="panel-heading">
                    <h3>Quick Actions</h3>
                    <Activity size={19} />
                  </div>

                  <div className="quick-actions">
                    <button
                      className="primary-button"
                      onClick={() => navigate('Report Sighting')}
                    >
                      <Plus size={19} />
                      Report a Tick Sighting
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => navigate('Tick Sightings')}
                    >
                      <MapPin size={18} />
                      Explore Reports
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => navigate('Insights & Trends')}
                    >
                      <BarChart3 size={18} />
                      View Insights
                    </button>
                  </div>
                </section>

                {/* Recent reports */}
                <section className="panel recent-panel">
                  <div className="panel-heading">
                    <h3>Recent Sightings</h3>

                    <button
                      className="text-button"
                      onClick={() => navigate('Tick Sightings')}
                    >
                      View all →
                    </button>
                  </div>

                  <ReportTable reports={reports.slice(0, 5)} />
                </section>

              </div>
            </>
          )}

          {/* All sightings page */}
          {page === 'Tick Sightings' && (
            <section className="panel full-panel">
              <div className="panel-heading">
                <h3>All Tick Sightings</h3>

                <button
                  className="primary-button"
                  onClick={() => navigate('Report Sighting')}
                >
                  <Plus size={16} />
                  New Report
                </button>
              </div>

              <div className="search-field">
                <Search size={18} />
                <input
                  value={search}
                  onChange={event =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search location or species..."
                />
              </div>

              
<div className="sighting-filters">
  <label>
    Location
    <select
      value={locationFilter}
      onChange={event => setLocationFilter(event.target.value)}
    >
      <option value="">All locations</option>
      {availableLocations.map(location => (
        <option key={location} value={location}>
          {location}
        </option>
      ))}
    </select>
  </label>

  <label>
    Species
    <select
      value={speciesFilter}
      onChange={event => setSpeciesFilter(event.target.value)}
    >
      <option value="">All species</option>
      {availableSpecies.map(species => (
        <option key={species} value={species}>
          {species}
        </option>
      ))}
    </select>
  </label>

  <label>
    Source
    <select
      value={sourceFilter}
      onChange={event => setSourceFilter(event.target.value)}
    >
      <option value="">All sources</option>
      <option value="elanco">Elanco</option>
      <option value="user">User Reports</option>
    </select>
  </label>

  <label>
    From Date
    <input
      type="date"
      value={startDateFilter}
      max={endDateFilter || undefined}
      onChange={event => setStartDateFilter(event.target.value)}
    />
  </label>

  <label>
    To Date
    <input
      type="date"
      value={endDateFilter}
      min={startDateFilter || undefined}
      onChange={event => setEndDateFilter(event.target.value)}
    />
  </label>

  <button
    type="button"
    className="secondary-button"
    onClick={clearFilters}
  >
    <X size={16} />
    Clear Filters
  </button>
</div>


              <ReportTable reports={paginatedReports} />

              <div className="pagination-controls" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '20px',
              }}>
                <span className="muted-note">
                  {filteredReports.length === 0
                    ? 'Showing 0 reports'
                    : `Showing ${(currentPage - 1) * reportsPerPage + 1}–${Math.min(currentPage * reportsPerPage, filteredReports.length)} of ${filteredReports.length} reports`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>

              <p className="muted-note">
                Total in database: {total}.
              </p>
            </section>
          )}

          {/* Report submission page */}
          {page === 'Report Sighting' && (
            <section className="panel form-panel">
              <div className="panel-heading">
                <h3>Submit a Tick Sighting</h3>
                <FileText size={19} />
              </div>

              <p className="muted-note">
                Add a new observation to the database.
              </p>

              <form onSubmit={submitReport}>
                <label>
                  Date
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={event =>
                      setForm({
                        ...form,
                        date: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Location
                  <input
                    required
                    maxLength={150}
                    placeholder="e.g. London"
                    value={form.location}
                    onChange={event =>
                      setForm({
                        ...form,
                        location: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Tick Species
                  <input
                    required
                    maxLength={150}
                    placeholder="e.g. Common tick"
                    value={form.species}
                    onChange={event =>
                      setForm({
                        ...form,
                        species: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Scientific Name
                  <input
                    required
                    maxLength={150}
                    placeholder="e.g. Ixodes ricinus"
                    value={form.latinName}
                    onChange={event =>
                      setForm({
                        ...form,
                        latinName: event.target.value
                      })
                    }
                  />
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </section>
          )}

          {/* Insights page */}
          {page === 'Insights & Trends' && (
            <div className="insights-stack">
              <section className="panel">
                <div className="panel-heading">
                  <h3>Regional Insights</h3>
                  <MapPin size={19} />
                </div>

                <div className="region-bars">
                  {sortedRegions.map((region, index) => (
                    <div
                      className="region-row"
                      key={region.region}
                    >
                      <span className="rank">{index + 1}</span>
                      <span className="region-name">
                        {region.region}
                      </span>

                      <div className="bar-track">
                        <div
                          style={{
                            width: `${
                              sortedRegions[0]?.count
                                ? region.count /
                                  sortedRegions[0].count * 100
                                : 0
                            }%`
                          }}
                        />
                      </div>

                      <b>{region.count}</b>
                    </div>
                  ))}

                  {!regions.length && (
                    <Empty text="No region data" />
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <h3>Trends</h3>

                  <select
                    value={period}
                    onChange={event =>
                      setPeriod(
                        event.target.value as 'month' | 'week'
                      )
                    }
                  >
                    <option value="month">Monthly</option>
                    <option value="week">Weekly</option>
                  </select>
                </div>

                <div className="chart-area large">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <AreaChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 4"
                          vertical={false}
                        />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#09883f"
                          fill="#b9ebca"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty text="No trend data" />
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Seasonal reports for a selected location */}
          {page === 'Insights & Trends' && (
            <section className="panel seasonal-panel" style={{ marginTop: 20 }}>
              <div className="panel-heading">
                <h3>Seasonal Sightings by Location</h3>
                <BarChart3 size={19} />
              </div>
              <p className="muted-note">Compare the number of recorded sightings in each calendar month, across all available years.</p>
              <div className="seasonal-filters">
                <label>Location
                  <select value={seasonLocation} onChange={event => setSeasonLocation(event.target.value)}>
                    <option value="">All locations</option>
                    {availableLocations.map(location => <option key={location} value={location}>{location}</option>)}
                  </select>
                </label>
                <label>Species
                  <select value={seasonSpecies} onChange={event => setSeasonSpecies(event.target.value)}>
                    <option value="">All species</option>
                    {availableSpecies.map(species => <option key={species} value={species}>{species}</option>)}
                  </select>
                </label>
              </div>
              <p className="muted-note">{seasonalData.matched.toLocaleString()} matching reports</p>
              <div className="chart-area large">
                {seasonalData.matched > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={seasonalData.counts}>
                      <CartesianGrid strokeDasharray="3 4" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value) => [value, 'Recorded sightings']} />
                      <Area type="monotone" dataKey="count" stroke="#07843c" strokeWidth={3} fill="#c6efd4" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Empty text="No matching sightings for this selection" />}
              </div>
              <p className="muted-note">These are reported sightings grouped by month across all recorded years, not a measure of actual tick abundance, seasonal risk, or a forecast. Reporting effort may vary.</p>
            </section>
          )}

          {/* Identification guide */}
          {page === 'Tick Identification' && (
            <section className="education-page">
              <div className="education-hero"><span>FIELD GUIDE</span><h2>Tick Identification Guide</h2><p>Learn the distinguishing features of common UK tick species. Visual identification can be difficult, especially for immature ticks.</p></div>
              <p className="muted-note">Showing all distinct species labels in the loaded sightings ({identifiedSpecies.length}). Some labels are synonyms for the same biological species.</p>
              <div className="education-grid">
                {identifiedSpecies.map(item => (
                  <article className="education-card" key={item.key}>
                    <div className="education-card-icon"><Leaf size={24} /></div>
                    <h3>{item.name}</h3>
                    {item.latin && <em>{item.latin}</em>}
                    <p>{item.detail}</p>
                    <small>{item.note}</small>
                    <a className="education-more" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`More about ${item.name} (opens UKHSA website)`}>More ↗</a>
                  </article>
                ))}
                {!identifiedSpecies.length && <p>No species found in the currently loaded sightings. Refresh the data to try again.</p>}
              </div>
              <div className="education-notice"><Info size={20} /><p>Do not rely on this guide alone to identify a tick or assess infection risk. Take a clear photograph and seek specialist identification when needed. A tick's appearance changes after feeding.</p></div>
            </section>
          )}

          {/* Prevention guidance */}
          {page === 'Bite Prevention' && (
            <section className="education-page">
              <div className="education-hero"><span>OUTDOOR SAFETY</span><h2>Preventing Tick Bites</h2><p>Simple precautions can reduce contact with ticks during outdoor activities.</p></div>
              <div className="education-grid">
                {[
                  ['01', 'Cover exposed skin', 'Wear long trousers and long sleeves where practical. Tucking trousers into socks can help reduce access to skin.'],
                  ['02', 'Stay on clear paths', 'Avoid brushing against long grass, dense vegetation and low shrubs where ticks may be waiting.'],
                  ['03', 'Use appropriate repellent', 'Use an insect repellent labelled for ticks, following the product instructions and age restrictions.'],
                  ['04', 'Check after being outdoors', 'Check clothing, skin, hairline, behind ears, armpits, waist and behind knees. Check children and pets too.'],
                  ['05', 'Remove ticks promptly', 'Use fine-tipped tweezers or a tick-removal tool close to the skin; pull steadily without squeezing the body. Clean the bite site afterwards.'],
                  ['06', 'Know when to seek advice', 'If you develop an expanding rash or flu-like symptoms after a possible tick bite, contact a healthcare professional and mention the exposure.']
                ].map(([number, heading, description]) => (
                  <article className="education-card" key={number}>
                    <div className="education-card-number">{number}</div><h3>{heading}</h3><p>{description}</p>
                  </article>
                ))}
              </div>
              <div className="education-notice"><ShieldCheck size={20} /><p>Never burn a tick or cover it with petroleum jelly or nail polish. This information is general prevention guidance, not medical advice. For UK guidance, see <a href="https://www.nhs.uk/conditions/lyme-disease/" target="_blank" rel="noreferrer">NHS Lyme disease information</a>.</p></div>
            </section>
          )}

          {/* CSV export */}
          {page === 'Data Export' && (
            <section className="panel full-panel">
              <div className="panel-heading">
                <h3>Export Sightings</h3>
                <Download size={19} />
              </div>

              <p>
                Download the currently loaded reports
                as a CSV file.
              </p>

              <button
                className="primary-button"
                onClick={exportCSV}
              >
                <Download size={18} />
                Download CSV ({filteredReports.length} records)
              </button>

              <p className="muted-note">
                The CSV includes the currently filtered sightings from the loaded dataset.
              </p>
            </section>
          )}

         
{/* About & Help page */}
{page === 'About & Help' && (
  <section className="about-page">

    <div className="about-hero">
      <span className="about-eyebrow">ABOUT THE PLATFORM</span>
      <h2>Understanding Tick Activity Across the UK</h2>
      <p>
        Elanco Tick Tracker is a tick sighting exploration and
        reporting platform designed to make recorded observations
        easier to visualise, understand and analyse.
      </p>
      <div className="about-tags">
        <span>UK Tick Surveillance</span>
        <span>Interactive Mapping</span>
        <span>Data Insights</span>
      </div>
    </div>

    <div className="about-section-heading">
      <span className="about-eyebrow">PLATFORM CAPABILITIES</span>
      <h3>What You Can Do</h3>
      <p>Explore the tools available throughout the dashboard.</p>
    </div>

    <div className="about-feature-grid">
      {[
        {
          icon: '◉',
          title: 'Interactive Map',
          description: 'Explore recorded tick sightings geographically using an interactive map.'
        },
        {
          icon: '▤',
          title: 'Tick Sightings',
          description: 'Browse sighting records and use available filters to narrow the results.'
        },
        {
          icon: '✚',
          title: 'Submit a Report',
          description: 'Contribute a new tick observation using the reporting form.'
        },
        {
          icon: '▥',
          title: 'Regional Insights',
          description: 'Explore regional patterns and trends in recorded sightings.'
        },
        {
          icon: '↓',
          title: 'CSV Export',
          description: 'Export available sighting data as a CSV file for further analysis.'
        },
        {
          icon: '⌕',
          title: 'Filtering Tools',
          description: 'Refine the information displayed using the available dashboard filters.'
        }
      ].map((feature) => (
        <article className="about-feature-card" key={feature.title}>
          <div className="about-feature-icon">{feature.icon}</div>
          <h4>{feature.title}</h4>
          <p>{feature.description}</p>
        </article>
      ))}
    </div>

    <div className="about-section-heading">
      <span className="about-eyebrow">GETTING STARTED</span>
      <h3>How to Use Tick Tracker</h3>
      <p>A simple guide to exploring and contributing observations.</p>
    </div>

    <div className="about-steps">
      {[
        ['01', 'Explore the Dashboard', 'Start with the overview and interactive map to understand the recorded sightings.'],
        ['02', 'Review the Records', 'Visit Tick Sightings to browse observations and narrow your results.'],
        ['03', 'Submit an Observation', 'Use the reporting form to enter the relevant details of a new sighting.'],
        ['04', 'Analyse and Export', 'Explore regional insights and download CSV data when needed.']
      ].map(([number, title, description]) => (
        <div className="about-step" key={number}>
          <span className="about-step-number">{number}</span>
          <div>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="about-section-heading">
      <span className="about-eyebrow">HELP CENTRE</span>
      <h3>Frequently Asked Questions</h3>
      <p>Quick answers to common questions about the platform.</p>
    </div>

    <div className="about-faq">
      {[
        {
          question: 'What is Elanco Tick Tracker?',
          answer: 'It is a UK-focused application for exploring, reporting and analysing recorded tick sightings.'
        },
        {
          question: 'How can I submit a tick sighting?',
          answer: 'Open the reporting section, complete the required observation details and submit the form.'
        },
        {
          question: 'Can I filter the sightings?',
          answer: 'Yes. The platform includes filtering tools to help you explore the available records.'
        },
        {
          question: 'Can I download the data?',
          answer: 'Yes. Use the CSV export feature to download available sighting records.'
        },
        {
          question: 'Does the map show every tick in the UK?',
          answer: 'No. The map represents sightings available in the application dataset. It should not be interpreted as a complete record of tick activity across the UK.'
        },
        {
          question: 'Is this platform a medical diagnosis tool?',
          answer: 'No. Tick Tracker is intended for data exploration and reporting. It does not provide medical diagnosis or individual risk assessment.'
        }
      ].map((item) => (
        <details className="about-faq-item" key={item.question}>
          <summary>
            <span>{item.question}</span>
            <span className="about-faq-plus">+</span>
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>

    <div className="about-notice">
      <div className="about-notice-icon">i</div>
      <div>
        <h4>Data & Important Information</h4>
        <p>
          Sighting records may be incomplete, unevenly distributed
          or contributed by users. The number of reports in an area
          does not necessarily indicate the true tick population or
          the level of health risk. This platform is for informational
          and exploratory purposes only.
        </p>
      </div>
    </div>

    <div className="about-footer">
      <div>
        <strong>Elanco Tick Tracker</strong>
        <p>Built with React, TypeScript, FastAPI and Leaflet.</p>
      </div>
      <span>Tick Data • Mapping • Insights</span>
    </div>

  </section>
)}


          {loading && (
            <div className="loading-note">
              <RefreshCw size={15} />
              Loading latest data...
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// Reusable statistic card
function Stat({
  icon: Icon,
  label,
  value,
  tone,
  detail
}: {
  icon: typeof Home
  label: string
  value: string
  tone: string
  detail: string
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={27} />
      </div>

      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-detail">{detail}</div>
      </div>
    </div>
  )
}

// Empty state component
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Info size={21} />
      <span>{text}</span>
    </div>
  )
}

// Reusable sightings table
function ReportTable({ reports }: { reports: Report[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Location</th>
            <th>Species</th>
            <th>Scientific Name</th>
          </tr>
        </thead>

        <tbody>
          {reports.map(report => (
            <tr key={report.id}>
              <td>{formatDate(report.date)}</td>
              <td>{report.location}</td>
              <td>{report.species}</td>
              <td>
                <em>{report.latinName || '—'}</em>
              </td>
            </tr>
          ))}

          {reports.length === 0 && (
            <tr>
              <td colSpan={4}>
                <Empty text="No sightings to display" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default App
