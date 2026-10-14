import { distanceM, formatAddress, mergePlaces, placeFromNominatim, type Place } from '../places';

describe('distanceM', () => {
  test('measures short distances in meters', () => {
    // 0.001° of latitude is about 111 m.
    expect(distanceM({ lat: 45.5, lng: -73.6 }, { lat: 45.501, lng: -73.6 })).toBeCloseTo(111, 0);
  });
});

describe('formatAddress', () => {
  test('joins number, street and city', () => {
    expect(
      formatAddress({ name: '1234 Bd Le Corbusier', streetNumber: '1234', street: 'Bd Le Corbusier', city: 'Laval' }),
    ).toBe('1234 Bd Le Corbusier, Laval');
  });

  test('falls back to the place name when there is no street', () => {
    expect(formatAddress({ name: 'Centre Laval', streetNumber: null, street: null, city: 'Laval' })).toBe(
      'Centre Laval, Laval',
    );
  });

  test('returns null when nothing is known', () => {
    expect(formatAddress({ name: null, streetNumber: null, street: null, city: null })).toBeNull();
    expect(formatAddress(undefined)).toBeNull();
  });
});

describe('placeFromNominatim', () => {
  test('uses the point of interest name and a short address', () => {
    expect(
      placeFromNominatim({
        lat: '45.5712',
        lon: '-73.7531',
        name: 'Énergie Cardio',
        display_name: 'Énergie Cardio, 1234, Boulevard Le Corbusier, Laval, Québec, Canada',
        address: { house_number: '1234', road: 'Boulevard Le Corbusier', city: 'Laval' },
      }),
    ).toEqual({
      name: 'Énergie Cardio',
      address: '1234 Boulevard Le Corbusier, Laval',
      lat: 45.5712,
      lng: -73.7531,
    });
  });

  test('takes the first part of the display name when the result has no name', () => {
    const place = placeFromNominatim({
      lat: '45',
      lon: '-73',
      name: '',
      display_name: '1234, Boulevard Le Corbusier, Laval, Québec, Canada',
      address: { road: 'Boulevard Le Corbusier', town: 'Laval' },
    });
    expect(place.name).toBe('1234');
    expect(place.address).toBe('Boulevard Le Corbusier, Laval');
  });
});

describe('mergePlaces', () => {
  const a: Place = { name: 'A', address: null, lat: 45.5, lng: -73.6 };

  test('drops results within 75 m of one already kept', () => {
    const near: Place = { name: 'A bis', address: null, lat: 45.5003, lng: -73.6 };
    const far: Place = { name: 'B', address: null, lat: 45.51, lng: -73.6 };
    expect(mergePlaces([a], [near, far]).map((p) => p.name)).toEqual(['A', 'B']);
  });
});
