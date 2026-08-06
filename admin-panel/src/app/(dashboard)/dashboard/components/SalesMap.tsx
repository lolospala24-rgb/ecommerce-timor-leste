'use client';

import { useMemo, useState } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { SalesByRegion } from '@/types/dashboard.types';

interface SalesMapProps {
  data?: SalesByRegion[];
}

const defaultRegions: SalesByRegion[] = [
  { municipality: 'Dili', latitude: -8.5569, longitude: 125.5603, sales: 7600, orderCount: 42 },
  { municipality: 'Baucau', latitude: -8.4544, longitude: 126.4329, sales: 4200, orderCount: 28 },
  { municipality: 'Liquiçá', latitude: -8.4989, longitude: 125.3115, sales: 1900, orderCount: 12 },
  { municipality: 'Viqueque', latitude: -8.4689, longitude: 127.0537, sales: 1250, orderCount: 8 },
  { municipality: 'Oecusse', latitude: -9.3206, longitude: 124.3567, sales: 900, orderCount: 6 },
];

const getMarkerSize = (sales: number, maxSales: number) => {
  const normalized = Math.max(0.2, sales / maxSales);
  return Math.min(35, Math.max(8, normalized * 30));
};

const mapCenter = { lat: -8.5569, lng: 125.5603 };
const mapContainerStyle = { width: '100%', height: '100%' };

export function SalesMap({ data }: SalesMapProps) {
  const salesData = data && data.length > 0 ? data : defaultRegions;
  const maxSales = Math.max(...salesData.map((region) => region.sales), 1);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });

  const markers = useMemo(
    () => salesData.map((region) => ({
      ...region,
      position: { lat: region.latitude, lng: region.longitude },
    })),
    [salesData],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Region</CardTitle>
        <CardDescription>Timor-Leste sales performance by municipality</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="h-[28rem] rounded-3xl border border-slate-200 overflow-hidden bg-slate-100">
            {!apiKey ? (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-slate-600">
                Google Maps API key tidak ditemukan. Tambahkan `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` di lingkungan Anda.
              </div>
            ) : loadError ? (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-slate-600">
                Gagal memuat Google Maps. Periksa kunci API dan koneksi jaringan.
              </div>
            ) : !isLoaded ? (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-slate-600">
                Memuat peta...
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={7}
                options={{
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                }}
              >
                {markers.map((region) => (
                  <Marker
                    key={region.municipality}
                    position={region.position}
                    onClick={() => setActiveRegion(region.municipality)}
                    icon={{
                      path: 'M0,-32C-12.15,-32 -22,-22.15 -22,-10.5C-22,1.15 -12.15,11 -0,11C12.15,11 22,1.15 22,-10.5C22,-22.15 12.15,-32 0,-32Z',
                      fillColor: '#0f766e',
                      fillOpacity: 0.9,
                      strokeWeight: 0,
                      scale: getMarkerSize(region.sales, maxSales) / 10,
                    }}
                  />
                ))}

                {markers.map((region) =>
                  activeRegion === region.municipality ? (
                    <InfoWindow
                      position={region.position}
                      onCloseClick={() => setActiveRegion(null)}
                      key={`${region.municipality}-info`}
                    >
                      <div className="text-sm">
                        <p className="font-semibold">{region.municipality}</p>
                        <p>Revenue: ${region.sales.toLocaleString()}</p>
                        <p>Orders: {region.orderCount.toLocaleString()}</p>
                      </div>
                    </InfoWindow>
                  ) : null,
                )}
              </GoogleMap>
            )}
          </div>
          <div className="space-y-4">
            {salesData.map((region) => (
              <div key={region.municipality} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{region.municipality}</p>
                    <p className="text-sm text-slate-500">
                      Orders: {region.orderCount.toLocaleString()} · Revenue: ${region.sales.toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {Math.round((region.sales / maxSales) * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${Math.min((region.sales / maxSales) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
