import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CloudRain, Compass, MapPin, RefreshCw, Wind } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';

type Alert = {
  eventid: number;
  episodeid: number;
  name: string;
  country: string;
  alertlevel: string;
  iscurrent: string;
  fromdate: string;
  todate: string;
  datemodified: string;
  severitydata?: { severity?: number; severityunit?: string; severitytext?: string };
  url?: { report?: string; geometry?: string };
};
type Storm = { id: number; lat: number; lon: number; alert: Alert };
type Shape = { geometry: { type: string; coordinates: unknown } };
type WeatherPoint = { time: string; wind: number; rain: number; pressure: number; temperature: number; humidity: number; direction: number; clouds: number };

const project = (lon: number, lat: number) => [((lon + 180) / 360) * 900, ((90 - lat) / 180) * 450];

function coordinatePath(coords: unknown, close = false): string {
  if (!Array.isArray(coords)) return '';
  return coords.map((point, index) => {
    if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') return '';
    const [x, y] = project(point[0], point[1]);
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + (close ? ' Z' : '');
}

function shapePaths(shape: Shape): string[] {
  const { type, coordinates } = shape.geometry;
  if (!Array.isArray(coordinates)) return [];
  if (type === 'Polygon') return coordinates.map(ring => coordinatePath(ring, true));
  if (type === 'MultiPolygon') return coordinates.flatMap(polygon => Array.isArray(polygon) ? polygon.map(ring => coordinatePath(ring, true)) : []);
  return [];
}

function formatUTC(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : `${date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

const alertTone: Record<string, string> = {
  Red: 'bg-destructive/15 text-destructive border-destructive/30',
  Orange: 'bg-storm-orange/15 text-storm-orange border-storm-orange/30',
  Green: 'bg-storm-green/15 text-storm-green border-storm-green/30',
};

export default function TyphoonTracker() {
  const [storms, setStorms] = useState<Storm[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [world, setWorld] = useState<Shape[]>([]);
  const [track, setTrack] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [period, setPeriod] = useState<'active' | 'recent'>('active');
  const selected = storms.find(storm => storm.id === selectedId);
  const isActive = (storm: Storm) => storm.alert.iscurrent === 'true' && new Date(storm.alert.todate).getTime() >= Date.now();

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&limit=100');
      if (!response.ok) throw new Error('The worldwide cyclone feed is unavailable.');
      const data = await response.json();
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const list: Storm[] = (data.features || [])
        .filter((feature: { geometry?: { type?: string; coordinates?: number[] }; properties?: Alert }) =>
          feature.geometry?.type === 'Point' && feature.properties?.eventid &&
          Array.isArray(feature.geometry.coordinates) &&
          new Date(feature.properties.todate).getTime() >= cutoff)
        .map((feature: { geometry: { coordinates: number[] }; properties: Alert }) => ({
          id: feature.properties.eventid,
          lon: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
          alert: feature.properties,
        }))
        .filter((storm: Storm) => Number.isFinite(storm.lat) && Number.isFinite(storm.lon))
        .sort((a: Storm, b: Storm) => new Date(b.alert.todate).getTime() - new Date(a.alert.todate).getTime());
      setStorms(list);
      setSelectedId(current => list.some((storm: Storm) => storm.id === current) ? current : list[0]?.id ?? null);
      setUpdated(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The worldwide cyclone feed is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    fetch('/world-countries.geojson').then(response => response.json()).then(data => setWorld(data.features || [])).catch(() => {});
  }, [loadAlerts]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError('');
    setTrack([]);
    setWeather([]);
    const geometryURL = `https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=TC&eventid=${selected.id}&episodeid=${selected.alert.episodeid}`;
    const forecastURL = `https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&hourly=wind_speed_10m,precipitation_probability,surface_pressure&forecast_days=2&timezone=UTC`;
    Promise.allSettled([
      fetch(geometryURL, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); return response.json(); }),
      fetch(forecastURL, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); return response.json(); }),
    ]).then(([geometry, forecast]) => {
      if (controller.signal.aborted) return;
      if (geometry.status === 'fulfilled') {
        setTrack((geometry.value.features || []).filter((feature: Shape) => feature.geometry?.type === 'LineString')
          .map((feature: Shape) => coordinatePath(feature.geometry.coordinates)).filter(Boolean));
      }
      if (forecast.status === 'fulfilled') {
        const data = forecast.value;
        const current = data.current;
        const hours = data.hourly;
        setWeather((hours?.time || []).map((time: string, index: number) => ({
          time, wind: hours.wind_speed_10m[index], rain: hours.precipitation_probability[index],
          pressure: hours.surface_pressure[index], temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m, direction: current.wind_direction_10m, clouds: current.cloud_cover,
        })).filter((_: WeatherPoint, index: number) => index % 3 === 0));
      }
      if (forecast.status === 'rejected') setDetailsError('Location forecast is unavailable right now.');
      setDetailsLoading(false);
    });
    return () => controller.abort();
  }, [selectedId, storms]);

  const visible = storms.filter(storm => period === 'active' ? isActive(storm) : !isActive(storm));
  const activeCount = storms.filter(isActive).length;
  const currentWeather = weather[0];

  return (
    <section className="space-y-4" aria-label="Worldwide typhoon tracker">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Activity className="h-5 w-5 text-storm-orange" /> Worldwide typhoon tracker</h2>
          <p className="text-xs text-muted-foreground">Tropical cyclones, hurricanes & typhoons · GDACS alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loading} title="Refresh cyclone alerts" aria-label="Refresh cyclone alerts">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{activeCount} active alerts</span>
        <span>· {storms.length - activeCount} recent ended</span>
        {updated && <span>· Checked {formatUTC(updated.toISOString())}</span>}
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-storm-ocean" role="img" aria-label="World map with cyclone alert locations and selected storm path">
        <svg viewBox="0 0 900 450" className="block w-full" aria-hidden="true">
          <rect width="900" height="450" className="fill-storm-ocean" />
          {[90, 180, 270, 360].map(y => <path key={y} d={`M0 ${y}H900`} className="stroke-storm-grid" strokeWidth="1" />)}
          {[150, 300, 450, 600, 750].map(x => <path key={x} d={`M${x} 0V450`} className="stroke-storm-grid" strokeWidth="1" />)}
          {world.flatMap((shape, index) => shapePaths(shape).map((path, i) => <path key={`${index}-${i}`} d={path} className="fill-storm-land stroke-storm-coast" strokeWidth="0.6" fillRule="evenodd" />))}
          {track.map((path, index) => <path key={index} d={path} fill="none" className="stroke-storm-track" strokeWidth="2.5" strokeDasharray="5 3" />)}
          {storms.map(storm => {
            const [x, y] = project(storm.lon, storm.lat);
            const picked = storm.id === selectedId;
            return <g key={storm.id} transform={`translate(${x}, ${y})`}>
              {picked && <circle r="15" className="fill-storm-orange/20 stroke-storm-orange" strokeWidth="1.5" />}
              <circle r={picked ? 6 : 4} className={isActive(storm) ? 'fill-destructive stroke-background' : 'fill-storm-orange stroke-background'} strokeWidth="2" />
              <text y="-12" textAnchor="middle" className="fill-storm-map-label text-[10px] font-bold" stroke="none">{storm.alert.eventname || storm.alert.name.replace('Tropical Cyclone ', '')}</text>
            </g>;
          })}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">Dots show GDACS alert centroids, not the live storm eye. Dashed lines show the selected storm’s published path; they are not a future forecast.</p>

      <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Cyclone status">
        <Button role="tab" aria-selected={period === 'active'} variant="ghost" className={`rounded-none border-b-2 ${period === 'active' ? 'border-primary' : 'border-transparent'}`} onClick={() => setPeriod('active')}>Active ({activeCount})</Button>
        <Button role="tab" aria-selected={period === 'recent'} variant="ghost" className={`rounded-none border-b-2 ${period === 'recent' ? 'border-primary' : 'border-transparent'}`} onClick={() => setPeriod('recent')}>Recently ended ({storms.length - activeCount})</Button>
      </div>
      {visible.length === 0 && <p className="py-4 text-sm text-muted-foreground">{loading ? 'Loading cyclone alerts…' : period === 'active' ? 'No active cyclones in this feed right now. Check official local warnings for your area.' : 'No ended cyclones in the last 30 days.'}</p>}
      {visible.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2">
        {visible.map(storm => <Button key={storm.id} variant={storm.id === selectedId ? 'default' : 'outline'} onClick={() => setSelectedId(storm.id)} className="h-auto min-w-36 max-w-56 flex-shrink-0 flex-col items-start gap-1 whitespace-normal py-2 text-left">
          <span className="w-full truncate font-semibold">{storm.alert.name.replace('Tropical Cyclone ', '')}</span>
          <span className="w-full truncate text-xs opacity-75">{storm.alert.country || 'Open ocean'} · {isActive(storm) ? 'Active' : 'Ended'}</span>
        </Button>)}
      </div>}

      {selected && <div className="space-y-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h3 className="text-lg font-bold">{selected.alert.name}</h3><p className="text-sm text-muted-foreground">{selected.alert.country || 'Open ocean'}</p></div>
          <span className={`rounded-sm border px-2 py-1 text-xs font-semibold ${alertTone[selected.alert.alertlevel] || 'border-border text-muted-foreground'}`}>{selected.alert.alertlevel} GDACS alert · {isActive(selected) ? 'Active' : 'Ended'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Mapped position</p><p className="font-semibold">{Math.abs(selected.lat).toFixed(1)}°{selected.lat >= 0 ? 'N' : 'S'}, {Math.abs(selected.lon).toFixed(1)}°{selected.lon >= 0 ? 'E' : 'W'}</p></div>
          <div><p className="text-xs text-muted-foreground">Reported maximum wind</p><p className="font-semibold">{Number.isFinite(selected.alert.severitydata?.severity) ? `${Math.round(selected.alert.severitydata?.severity ?? 0)} ${selected.alert.severitydata?.severityunit || 'km/h'}` : 'Not reported'}</p></div>
          <div><p className="text-xs text-muted-foreground">Alert began</p><p className="font-semibold">{formatUTC(selected.alert.fromdate)}</p></div>
          <div><p className="text-xs text-muted-foreground">Last revised</p><p className="font-semibold">{formatUTC(selected.alert.datemodified)}</p></div>
        </div>
        <p className="text-xs text-muted-foreground">Reported maximum wind may be from an earlier stage of the storm, not its current intensity. GDACS alert color describes impact risk, not cyclone category.</p>
        {selected.alert.url?.report && <a href={selected.alert.url.report} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-2">View GDACS report <ArrowUpRight className="h-4 w-4" /></a>}

        <div className="border-t border-border pt-4">
          <h4 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" /> Weather at mapped position</h4>
          <p className="mb-3 text-xs text-muted-foreground">Open-Meteo model forecast at the alert’s mapped coordinates; not a cyclone advisory or an observed eye reading.</p>
          {detailsLoading && <p className="text-sm text-muted-foreground">Loading weather patterns…</p>}
          {detailsError && <p className="text-sm text-muted-foreground">{detailsError}</p>}
          {currentWeather && <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><Wind className="mb-1 h-4 w-4 text-storm-orange" /><span className="text-xs text-muted-foreground">Wind / direction</span><p className="font-semibold">{Math.round(currentWeather.wind)} km/h · {currentWeather.direction}°</p></div>
              <div><CloudRain className="mb-1 h-4 w-4 text-storm-orange" /><span className="text-xs text-muted-foreground">Rain chance</span><p className="font-semibold">{currentWeather.rain}%</p></div>
              <div><Compass className="mb-1 h-4 w-4 text-storm-orange" /><span className="text-xs text-muted-foreground">Surface pressure</span><p className="font-semibold">{Math.round(currentWeather.pressure)} hPa</p></div>
              <div><Activity className="mb-1 h-4 w-4 text-storm-orange" /><span className="text-xs text-muted-foreground">Temperature / humidity</span><p className="font-semibold">{Math.round(currentWeather.temperature)}°C · {currentWeather.humidity}%</p></div>
            </div>
            <p className="mb-1 text-xs font-semibold">48-hour model outlook · wind (km/h)</p>
            <div className="h-40 w-full" aria-label="Wind speed outlook for the next 48 hours">
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={weather} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="time" tickFormatter={time => new Date(time + 'Z').toLocaleString(undefined, { hour: 'numeric', timeZone: 'UTC' })} tick={{ fontSize: 10 }} interval={3} /><YAxis tick={{ fontSize: 10 }} /><Tooltip labelFormatter={time => formatUTC(time + 'Z')} formatter={(value: number) => [`${value} km/h`, 'Wind']} /><Area type="monotone" dataKey="wind" stroke="hsl(var(--storm-orange))" fill="hsl(var(--storm-orange) / 0.16)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
            </div>
          </>}
        </div>
      </div>}
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">Coverage and updates depend on GDACS and Open-Meteo. For decisions affecting safety, follow your national meteorological agency and local emergency alerts.</p>
    </section>
  );
}