import { notFound } from "next/navigation";
import { dishTypes, getHouse } from "@/lib/data";
import { TopBar } from "@/components/chrome";
import { ActionButton } from "@/components/ui";
import { HouseForm } from "../house-form";
import { deleteHouseAction, toggleHouseAction } from "../../actions";

export default async function EditHouse({ params }: { params: Promise<{ id: string }> }) {
  const house = await getHouse(Number((await params).id));
  if (!house) notFound();
  const dishes = await dishTypes(true);
  return (
    <>
      <TopBar title={house.name || "House"} sub="Changes apply from today on. Past days stay as they were." back="/admin/houses" />
      <main className="mx-auto max-w-xl px-4 space-y-3">
        <HouseForm
          dishes={dishes.filter((d) => d.active || house.items[d.id])}
          initial={{ id: house.id, name: house.name, address: house.address, items: house.items, notes: house.notes }}
        />
        <ActionButton
          action={toggleHouseAction.bind(null, house.id)}
          confirm={house.active ? "Pause this house? It's left out of every route until you activate it again." : undefined}
          className="btn-ghost w-full"
        >
          {house.active ? "Pause deliveries (keep the house)" : "Activate house"}
        </ActionButton>
        <ActionButton
          action={deleteHouseAction.bind(null, house.id)}
          confirm="Delete this house? It's removed from its routes. Past deliveries and pay stay in the history."
          className="btn-ghost w-full text-danger"
        >
          Delete house
        </ActionButton>
      </main>
    </>
  );
}
