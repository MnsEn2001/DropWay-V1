export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest Neighbor Algorithm (เร็วพอสำหรับ < 200 จุด)
export function optimizeRoute(
  startLat: number,
  startLon: number,
  houses: Array<{ lat: number; lng: number }>,
) {
  const route = [{ lat: startLat, lng: startLon }];
  const remaining = [...houses];

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearest = remaining[0];
    let minDist = haversine(last.lat, last.lng, nearest.lat, nearest.lng);

    for (let i = 1; i < remaining.length; i++) {
      const dist = haversine(
        last.lat,
        last.lng,
        remaining[i].lat,
        remaining[i].lng,
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = remaining[i];
      }
    }

    route.push(nearest);
    remaining.splice(remaining.indexOf(nearest), 1);
  }

  return route;
}
