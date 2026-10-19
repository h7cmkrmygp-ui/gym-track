import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, type LatLng } from 'react-native-maps';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Stepper } from '@/components/ui';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { addGym, deleteGym, getGym, updateGym } from '@/db/gyms';
import { describePoint, searchPlaces } from '@/geofence/places-search';
import { getCurrentCoords, syncGeofences } from '@/geofence/regions';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/logic/places';
import { ensureNotificationPermission } from '@/notifications';

type Point = { lat: number; lng: number };

/** Where the map opens when there is no gym and no position yet. */
const MONTREAL: Point = { lat: 45.5017, lng: -73.5673 };
const CLOSE_UP = { latitudeDelta: 0.006, longitudeDelta: 0.006 };
const toLatLng = (p: Point): LatLng => ({ latitude: p.lat, longitude: p.lng });
const fromLatLng = (c: LatLng): Point => ({ lat: c.latitude, lng: c.longitude });

export default function GymScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gymId = id === 'new' ? null : Number(id);
  const mapRef = useRef<MapView>(null);
  const lookup = useRef(0);

  const [start, setStart] = useState<Point | null>(null);
  const [pin, setPin] = useState<Point | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(100);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);

  const placePin = (p: Point, recenter: boolean) => {
    setPin(p);
    setAddress(null);
    if (recenter) mapRef.current?.animateToRegion({ ...toLatLng(p), ...CLOSE_UP }, 400);
    // Ignore answers to older lookups when the pin moves quickly.
    const n = ++lookup.current;
    describePoint(p.lat, p.lng).then((d) => {
      if (n === lookup.current) setAddress(d.address ?? 'Adresse inconnue');
    });
  };

  useEffect(() => {
    (async () => {
      if (gymId !== null) {
        const gym = await getGym(gymId);
        if (gym) {
          setName(gym.name);
          setRadius(gym.radiusM);
          setStart({ lat: gym.lat, lng: gym.lng });
          placePin({ lat: gym.lat, lng: gym.lng }, false);
          return;
        }
      }
      const here = await getCurrentCoords().catch(() => 'unavailable');
      if (typeof here === 'string') {
        setStart(MONTREAL);
      } else {
        setStart(here);
        placePin(here, false);
      }
    })();
  }, [gymId]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const found = await searchPlaces(q, pin ?? start ?? MONTREAL);
    setSearching(false);
    setResults(found);
  };

  const choose = (place: Place) => {
    setResults(null);
    setQuery('');
    setName(place.name);
    placePin({ lat: place.lat, lng: place.lng }, true);
  };

  const goToMe = async () => {
    const here = await getCurrentCoords();
    if (typeof here === 'string') Alert.alert('Localisation', here);
    else placePin(here, true);
  };

  const save = async () => {
    if (!pin) {
      Alert.alert('Place l’épingle sur ta salle', 'Cherche-la ou touche la carte à son emplacement.');
      return;
    }
    const finalName = name.trim() || 'Ma salle';
    if (gymId === null) await addGym(finalName, pin.lat, pin.lng, radius);
    else await updateGym(gymId, finalName, pin.lat, pin.lng, radius);
    await ensureNotificationPermission();
    await syncGeofences();
    router.back();
  };

  const remove = () =>
    Alert.alert(`Supprimer ${name || 'cette salle'} ?`, 'Tes jours de gym déjà notés restent.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteGym(gymId!);
          await syncGeofences();
          router.back();
        },
      },
    ]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: gymId === null ? 'Nouvelle salle' : name || 'Salle' }} />

      <View style={styles.searchArea}>
        <Row>
          <Input
            style={{ flex: 1 }}
            placeholder="Adresse ou nom de la salle"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCorrect={false}
          />
          <Button label="Chercher" icon="magnifyingglass" small onPress={search} disabled={searching} />
        </Row>
        {searching && <ActivityIndicator />}
        {results && (
          <Card style={styles.results}>
            {results.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Aucun résultat. Essaie l’adresse, ou place l’épingle à la main.
              </ThemedText>
            )}
            {results.map((p, i) => (
              <Pressable key={`${p.lat},${p.lng},${i}`} onPress={() => choose(p)} style={styles.result}>
                <ThemedText type="smallBold">{p.name}</ThemedText>
                {p.address && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {p.address}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      <View style={styles.mapWrap}>
        {start ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...toLatLng(start), ...CLOSE_UP }}
            showsUserLocation
            onPress={(e) => placePin(fromLatLng(e.nativeEvent.coordinate), false)}>
            {pin && (
              <>
                <Circle
                  center={toLatLng(pin)}
                  radius={radius}
                  strokeColor={theme.accent}
                  strokeWidth={2}
                  fillColor="rgba(227, 211, 181, 0.22)"
                />
                <Marker
                  coordinate={toLatLng(pin)}
                  draggable
                  onDragEnd={(e) => placePin(fromLatLng(e.nativeEvent.coordinate), false)}
                />
              </>
            )}
          </MapView>
        ) : (
          <ActivityIndicator style={StyleSheet.absoluteFill} />
        )}
        <Pressable
          onPress={goToMe}
          style={[styles.meButton, { backgroundColor: theme.backgroundElement }]}
          hitSlop={8}>
          <Row style={{ gap: 6 }}>
            <Icon name="location.fill" size={13} />
            <ThemedText type="smallBold">Ma position</ThemedText>
          </Row>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Touche la carte ou fais glisser l’épingle pour la mettre pile sur ta salle.
        </ThemedText>
        <Card>
          <ThemedText type="caps">Emplacement choisi</ThemedText>
          <Row>
            <Icon name="mappin.and.ellipse" size={18} />
            <ThemedText style={{ flex: 1 }}>{pin ? (address ?? 'Recherche de l’adresse…') : 'Aucun emplacement'}</ThemedText>
          </Row>
        </Card>
        <Input placeholder="Nom (ex. Énergie Cardio)" value={name} onChangeText={setName} />
        <Card>
          <Row style={styles.between}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Zone de détection</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Le cercle doit couvrir la salle et le stationnement.
              </ThemedText>
            </View>
            <Stepper value={radius} min={50} max={300} step={25} format={(v) => `${v} m`} onChange={setRadius} />
          </Row>
        </Card>
        <Button label="Enregistrer la salle" icon="checkmark" onPress={save} />
        {gymId !== null && <Button label="Supprimer cette salle" variant="danger" onPress={remove} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchArea: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.two },
  results: { gap: 0, paddingVertical: Spacing.one },
  result: { paddingVertical: Spacing.two },
  mapWrap: { height: 300 },
  meButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(227, 211, 181, 0.2)',
  },
  form: { padding: Spacing.three, gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.six },
  between: { justifyContent: 'space-between' },
});
