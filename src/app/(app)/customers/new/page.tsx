import PartyForm from "../PartyForm";

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Customer</h1>
      <PartyForm kind="customers" />
    </div>
  );
}
