import { dishTypes } from "@/lib/data";
import { TopBar } from "@/components/chrome";
import { HouseForm } from "../house-form";

export default async function NewHouse() {
  const dishes = await dishTypes();
  return (
    <>
      <TopBar title="New house" back="/admin/houses" />
      <main className="mx-auto max-w-xl px-4">
        <HouseForm dishes={dishes} initial={{ name: "", address: "", items: {}, notes: "", schedule: {} }} />
      </main>
    </>
  );
}
