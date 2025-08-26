import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMyVehicles, addVehicle, editVehicle, removeVehicle, Vehicle } from "./api";

export default function VehiclesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["vehicles","my"], queryFn: listMyVehicles, staleTime: 15_000 });

  const [form, setForm] = React.useState<Omit<Vehicle, "_id">>({ make:"", model:"", plateNumber:"", seats:4 });

  const addMut = useMutation({
    mutationFn: () => addVehicle({ ...form, seats: Number(form.seats) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles","my"] }); setForm({ make:"", model:"", plateNumber:"", seats:4 }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => removeVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles","my"] }),
  });

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Vehicles</h1>

      {/* Add form */}
      <form
        onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 grid md:grid-cols-5 gap-3"
      >
        <input className="rounded-xl border px-3 py-2 md:col-span-1" placeholder="Make" value={form.make} onChange={e=>setForm(f=>({...f, make:e.target.value}))}/>
        <input className="rounded-xl border px-3 py-2 md:col-span-1" placeholder="Model" value={form.model} onChange={e=>setForm(f=>({...f, model:e.target.value}))}/>
        <input className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="Plate number" value={form.plateNumber} onChange={e=>setForm(f=>({...f, plateNumber:e.target.value}))}/>
        <input type="number" min={1} max={8} className="rounded-xl border px-3 py-2 md:col-span-0.5" placeholder="Seats" value={form.seats} onChange={e=>setForm(f=>({...f, seats:Number(e.target.value)}))}/>
        <button disabled={addMut.isLoading} className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition">
          {addMut.isLoading ? "Saving…" : "Add"}
        </button>
      </form>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-2">{[...Array(3)].map((_,i)=><div key={i} className="h-16 rounded-2xl border animate-pulse" />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3">Couldn’t load vehicles.</div>
      ) : (
        <div className="space-y-2">
          {(data || []).map(v => (
            <div key={v._id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{v.make} {v.model}</div>
                <div className="text-sm text-slate-500">{v.plateNumber} • {v.seats} seats</div>
              </div>
              <button
                disabled={delMut.isLoading}
                onClick={() => { if (confirm("Delete vehicle?")) delMut.mutate(v._id); }}
                className="rounded-xl border px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                Delete
              </button>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <div className="rounded-2xl border border-dashed p-6 text-center text-slate-500">No vehicles yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
