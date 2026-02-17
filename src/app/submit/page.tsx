import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SubmitForm } from "@/components/submit-form";

export const metadata = {
  title: "Submit - Vibe Shit",
};

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin/github");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold">Submit a project</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your vibe coding creation with the community.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
