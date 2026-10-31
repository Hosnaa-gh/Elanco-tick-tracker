
import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type TickReport = {
  id?: string;
  date: string;
  location: string;
  species: string;
  latinName?: string | null;
};

type TickMapProps = {
  reports: TickReport[];
};

// Coordinates for supported UK locations
const cityCoordinates: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  manchester: [53.4808, -2.2426],
  oxford: [51.752, -1.2577],
  birmingham: [52.4862, -1.8904],
  bristol: [51.4545, -2.5879],
  leeds: [53.8008, -1.5491],
  liverpool: [53.4084, -2.9916],
  sheffield: [53.3811, -1.4701],
  nottingham: [52.9548, -1.1581],
  cambridge: [52.1951, 0.1313],
  york: [53.959, -1.0815],
  newcastle: [54.9783, -1.6178],
  edinburgh: [55.9533, -3.1883],
  glasgow: [55.8642, -4.2518],
  cardiff: [51.4816, -3.1791],
  belfast: [54.5973, -5.9301],
  aberdeen: [57.1497, -2.0943],
  exeter: [50.7184, -3.5339],
  southampton: [50.9097, -1.4044],
  portsmouth: [50.8198, -1.088],
  reading: [51.4543, -0.9781],
  uxbridge: [51.5464, -0.4796],
};

const tickIcon = new Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fix Leaflet rendering after container resizing
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => {
      map.invalidateSize({ pan: false });
    };

    const observer = new ResizeObserver(resizeMap);
    observer.observe(map.getContainer());

    const timeout = window.setTimeout(resizeMap, 200);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [map]);

  return null;
}

// Automatically fit the map to reported locations
function MapBoundsHandler({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      map.setView([54.5, -3], 6);
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 9);
      return;
    }

    map.fitBounds(positions, {
      padding: [40, 40],
      maxZoom: 9,
    });
  }, [map, positions]);

  return null;
}

export default function TickMap({ reports }: TickMapProps) {
  const mappedReports = reports
    .map((report) => {
      const location = report.location?.trim().toLowerCase();
      const coordinates = cityCoordinates[location];

      if (!coordinates) return null;

      return {
        report,
        coordinates,
      };
    })
    .filter(
      (item): item is {
        report: TickReport;
        coordinates: [number, number];
      } => item !== null
    );

  const positions = mappedReports.map(
    (item) => item.coordinates
  );

  return (
    <div
      className="tick-map-wrapper"
      style={{
        width: '100%',
        height: '400px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
      }}
    >
      <MapContainer
        center={[54.5, -3] as LatLngExpression}
        zoom={6}
        scrollWheelZoom={false}
        style={{
          height: '100%',
          width: '100%',
        }}
      >
        <MapResizeHandler />

        <MapBoundsHandler positions={positions} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mappedReports.map(({ report, coordinates }, index) => (
          <Marker
            key={report.id ?? index}
            position={coordinates}
            icon={tickIcon}
          >
            <Popup>
              <div style={{ minWidth: '170px' }}>
                <strong>{report.location}</strong>

                <p>
                  <strong>Species:</strong> {report.species}
                </p>

                {report.latinName && (
                  <p>
                    <strong>Scientific name:</strong>{' '}
                    <em>{report.latinName}</em>
                  </p>
                )}

                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(report.date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
