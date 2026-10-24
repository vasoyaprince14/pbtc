import { requireOwner } from "@/lib/auth";
import UserForm from "../UserForm";

export default async function NewUserPage() {
  await requireOwner();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add User</h1>
      <UserForm />
    </div>
  );
}
