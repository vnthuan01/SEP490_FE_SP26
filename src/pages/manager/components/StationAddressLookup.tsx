import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useGoongAutocomplete, useGoongMap } from '@/hooks/useGoongMap';
import { useDebounce } from '@/hooks/useDebounce';
import { geocodeByPlaceIdV2, reverseGeocodeV2 } from '@/services/goongService';
import goongjs from '@goongmaps/goong-js';
import { Label } from '@/components/ui/label';

export function StationAddressLookup({
  address,
  latitude,
  longitude,
  onPickAddress,
  label = 'Địa chỉ trạm',
  required: isRequired = true,
}: {
  address: string;
  latitude: number;
  longitude: number;
  onPickAddress: (payload: { address: string; latitude: number; longitude: number }) => void;
  label?: string;
  required?: boolean;
}) {
  const [searchValue, setSearchValue] = useState(address || '');
  const [mapSearchValue, setMapSearchValue] = useState(address || '');
  const [openMapSheet, setOpenMapSheet] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showMapPredictions, setShowMapPredictions] = useState(false);
  const markerRef = useRef<any>(null);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const debouncedMapSearchValue = useDebounce(mapSearchValue, 500);

  const {
    map,
    mapRef,
    isLoading: isLoadingMap,
    error: mapError,
  } = useGoongMap({
    center: {
      lat: latitude || 10.7769,
      lng: longitude || 106.7009,
    },
    zoom: latitude && longitude ? 14 : 11,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: openMapSheet,
  });

  const displayAddress = openMapSheet || showPredictions ? searchValue : address || '';

  const autocompleteQuery = useGoongAutocomplete(
    {
      input: debouncedSearchValue,
      limit: 5,
      moreCompound: true,
      hasDeprecatedAdministrativeUnit: true,
    },
    debouncedSearchValue.trim().length >= 3,
  );

  const mapAutocompleteQuery = useGoongAutocomplete(
    {
      input: debouncedMapSearchValue,
      limit: 5,
      moreCompound: true,
      hasDeprecatedAdministrativeUnit: true,
    },
    openMapSheet && debouncedMapSearchValue.trim().length >= 3,
  );

  const applyResolvedAddress = useCallback(
    (selectedAddress: string, lat: number, lng: number, closeMap = false) => {
      onPickAddress({
        address: selectedAddress,
        latitude: lat,
        longitude: lng,
      });
      setSearchValue(selectedAddress);
      setMapSearchValue(selectedAddress);
      setShowPredictions(false);
      setShowMapPredictions(false);
      if (closeMap) setOpenMapSheet(false);
    },
    [onPickAddress],
  );

  const handleSelectPlace = async (placeId: string, displayAddress: string, fromMap = false) => {
    const result = await geocodeByPlaceIdV2(placeId, {
      hasDeprecatedAdministrativeUnit: true,
    });
    const first = result.results?.[0];
    if (!first) return;

    const selectedAddress = first.formatted_address || displayAddress;
    applyResolvedAddress(
      selectedAddress,
      first.geometry.location.lat,
      first.geometry.location.lng,
      false,
    );

    if (map) {
      map.setCenter([first.geometry.location.lng, first.geometry.location.lat]);
      map.setZoom(15);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new goongjs.Marker({ color: '#ef4444' })
        .setLngLat([first.geometry.location.lng, first.geometry.location.lat])
        .addTo(map);
    }

    if (fromMap) {
      setShowMapPredictions(false);
    } else {
      setShowPredictions(false);
    }
  };

  const predictions = useMemo(
    () => autocompleteQuery.data?.predictions || [],
    [autocompleteQuery.data],
  );
  const mapPredictions = useMemo(
    () => mapAutocompleteQuery.data?.predictions || [],
    [mapAutocompleteQuery.data],
  );

  useEffect(() => {
    if (!map) return;

    const handleMapClick = async (event: any) => {
      const lat = event.lngLat.lat;
      const lng = event.lngLat.lng;

      const result = await reverseGeocodeV2(lat, lng, {
        hasDeprecatedAdministrativeUnit: true,
        hasVnid: true,
      });

      if (markerRef.current) {
        markerRef.current.remove();
      }

      markerRef.current = new goongjs.Marker({ color: '#ef4444' }).setLngLat([lng, lat]).addTo(map);

      const addressResult = result.results?.[0];
      const selectedAddress = addressResult?.formatted_address || '';
      applyResolvedAddress(selectedAddress || `Lat ${lat}, Lng ${lng}`, lat, lng, false);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, applyResolvedAddress]);

  useEffect(() => {
    if (!map || !latitude || !longitude) return;

    map.setCenter([longitude, latitude]);
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new goongjs.Marker({ color: '#ef4444' })
      .setLngLat([longitude, latitude])
      .addTo(map);
  }, [map, latitude, longitude]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <Label>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        <Input
          className="w-full h-9"
          placeholder="Tìm kiếm địa chỉ tự động"
          value={displayAddress}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setShowPredictions(e.target.value.trim().length >= 3);
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="success" size="sm" onClick={() => setOpenMapSheet(true)}>
          <span className="material-symbols-outlined text-lg">map</span>
          Mở bản đồ chọn vị trí
        </Button>
      </div>

      {autocompleteQuery.isLoading ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Đang tìm địa chỉ gợi ý...
        </div>
      ) : showPredictions && predictions.length > 0 ? (
        <ScrollArea className="h-[200px] rounded-xl border border-border bg-card">
          <div className="p-2 space-y-2">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="font-medium text-foreground">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {prediction.structured_formatting?.secondary_text || prediction.description}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : null}

      <Sheet open={openMapSheet} onOpenChange={setOpenMapSheet}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle>Chọn địa chỉ trên bản đồ</SheetTitle>
            <SheetDescription>
              Tìm kiếm địa chỉ hoặc bấm trực tiếp lên bản đồ để lấy vị trí.
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-full min-h-0">
            <div className="space-y-4 min-h-0 flex flex-col">
              <div className="space-y-3">
                <Input
                  placeholder="Tìm địa chỉ trong bản đồ..."
                  value={mapSearchValue}
                  onChange={(e) => {
                    setMapSearchValue(e.target.value);
                    setShowMapPredictions(e.target.value.trim().length >= 3);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Gõ địa chỉ để tìm nhanh hoặc bấm trực tiếp lên bản đồ để chọn vị trí.
                </p>
              </div>

              {mapAutocompleteQuery.isLoading ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Đang tìm địa chỉ gợi ý...
                </div>
              ) : showMapPredictions && mapPredictions.length > 0 ? (
                <ScrollArea className="flex-1 rounded-xl border border-border bg-card">
                  <div className="p-2 space-y-2">
                    {mapPredictions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        type="button"
                        onClick={() =>
                          handleSelectPlace(prediction.place_id, prediction.description, true)
                        }
                        className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        <p className="font-medium text-foreground">
                          {prediction.structured_formatting?.main_text || prediction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {prediction.structured_formatting?.secondary_text ||
                            prediction.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Danh sách gợi ý sẽ xuất hiện ở đây khi bạn nhập từ 3 ký tự trở lên.
                </div>
              )}
            </div>

            <div className="relative min-h-[450px] lg:min-h-0 rounded-xl border border-border overflow-hidden bg-muted/20">
              <div ref={mapRef} className="h-full w-full" />

              {isLoadingMap && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground bg-background/70 backdrop-blur-[1px]">
                  <span className="material-symbols-outlined text-lg">location_on</span>
                  Đang tải bản đồ...
                </div>
              )}

              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive px-4 text-center bg-background/85">
                  Không thể tải bản đồ Goong. Kiểm tra API key hoặc kết nối mạng.
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="px-4 py-4 border-t border-border bg-background shrink-0">
            <Button variant="destructive" onClick={() => setOpenMapSheet(false)}>
              <span className="material-symbols-outlined text-lg">close</span>
              Đóng bản đồ
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
