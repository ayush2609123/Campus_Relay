export type Place = { name: string; lat: number; lng: number; address?: string; hubId?: string };

export type Trip = {
  _id: string;
  driverId: string;
  vehicleId?: string;
  origin: Place;
  destination: Place;
  startTime: string;
  pricePerSeat: number;
  totalSeats: number;
  seatsLeft: number;
  status: "draft"|"published"|"ongoing"|"completed"|"cancelled";
  // NEW:
  kind?: "carpool" | "shuttle";
  routeName?: string;
  stops?: Place[];
};

export type Hub = { _id: string; name: string; lat: number; lng: number; address?: string; tags?: string[] };
