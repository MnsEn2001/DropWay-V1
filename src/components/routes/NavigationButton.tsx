"use client";
export function NavigationButton({
  lat,
  lng,
  address,
}: {
  lat: number;
  lng: number;
  address: string;
}) {
  const openMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={openMaps}
      className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition"
    >
      นำทางไป: {address.substring(0, 30)}...
    </button>
  );
}
