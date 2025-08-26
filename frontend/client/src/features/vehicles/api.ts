import api from "@/lib/api";

export type Vehicle = {
  _id: string;
  make: string;
  model: string;
  plateNumber: string;
  seats: number;
};

export async function listMyVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get("/vehicles/my");
  return data?.data || [];
}

export async function addVehicle(input: Omit<Vehicle, "_id">): Promise<Vehicle> {
  const { data } = await api.post("/vehicles", input);
  return data?.data;
}

export async function editVehicle(id: string, input: Partial<Omit<Vehicle, "_id">>): Promise<Vehicle> {
  const { data } = await api.patch(`/vehicles/${id}`, input);
  return data?.data;
}

export async function removeVehicle(id: string): Promise<{ id: string }> {
  const { data } = await api.delete(`/vehicles/${id}`);
  return data?.data;
}
