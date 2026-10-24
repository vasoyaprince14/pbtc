import PartyForm from "../../customers/PartyForm";

export default function NewSupplierPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Supplier</h1>
      <PartyForm kind="suppliers" />
    </div>
  );
}
